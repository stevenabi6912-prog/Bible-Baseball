'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import type {
  GameState, GameSettings, HitType, Team, Player, TurnPhase, Question,
  GameMode, ComputerDifficulty,
} from '../types';
import {
  createInitialGameState, processAtBat, getAvailableHitTypes,
  getCurrentBatter, getBattingTeam, switchHalfInning,
} from '../lib/game-engine';
import { selectQuestion, checkAnswer } from '../lib/questions';
import {
  getPhariseeAnswer, getPhariseeHitChoice, getPhariseeThinkingDelay, getFlavorText,
} from '../lib/pharisee';
import { soundManager } from '../lib/sounds';
import { v4 as uuidv4 } from 'uuid';

// ============================================================
// Actions
// ============================================================

type GameAction =
  | { type: 'START_GAME'; settings: GameSettings }
  | { type: 'SELECT_HIT'; hitType: HitType }
  | { type: 'SET_QUESTION'; question: Question; usedIds: string[] }
  | { type: 'SUBMIT_ANSWER'; answer: string }
  | { type: 'PROCESS_RESULT'; correct: boolean }
  | { type: 'NEXT_TURN' }
  | { type: 'DEVICE_PASSED' }
  | { type: 'SET_TURN_PHASE'; phase: TurnPhase }
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'RESET' };

// ============================================================
// Context
// ============================================================

interface GameContextType {
  state: GameState | null;
  startGame: (settings: GameSettings) => void;
  selectHit: (hitType: HitType) => void;
  submitAnswer: (answer: string) => void;
  nextTurn: () => void;
  confirmDevicePass: () => void;
  resetGame: () => void;
  availableHitTypes: HitType[];
  currentBatter: Player | null;
  battingTeam: Team | null;
  phariseeText: string;
  isComputerTurn: boolean;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}

// ============================================================
// Reducer
// ============================================================

function gameReducer(state: GameState | null, action: GameAction): GameState | null {
  switch (action.type) {
    case 'START_GAME': {
      const { settings } = action;
      const awayTeam = buildTeam('away', settings);
      const homeTeam = buildTeam('home', settings);
      return createInitialGameState(settings, homeTeam, awayTeam);
    }
    case 'SET_STATE':
      return action.state;
    case 'SET_QUESTION':
      if (!state) return state;
      return {
        ...state,
        currentQuestion: action.question,
        usedQuestionIds: action.usedIds,
        turnPhase: 'answer-question',
      };
    case 'SET_TURN_PHASE':
      if (!state) return state;
      return { ...state, turnPhase: action.phase };
    case 'SELECT_HIT':
      if (!state) return state;
      return { ...state, currentHitType: action.hitType };
    case 'PROCESS_RESULT': {
      if (!state || !state.currentHitType) return state;
      const { newState } = processAtBat(state, state.currentHitType, action.correct);
      return { ...newState, turnPhase: 'result' };
    }
    case 'NEXT_TURN': {
      if (!state) return state;
      if (state.gameOver) {
        return { ...state, turnPhase: 'game-over' };
      }
      // Check if half-inning ended (outs reset means it was switched by processAtBat)
      const needsPass = state.mode === 'local-multiplayer';
      return {
        ...state,
        currentQuestion: null,
        currentHitType: null,
        turnPhase: 'select-hit',
        waitingForPass: needsPass,
      };
    }
    case 'DEVICE_PASSED':
      if (!state) return state;
      return { ...state, waitingForPass: false };
    case 'RESET':
      return null;
    default:
      return state;
  }
}

// ============================================================
// Helper: Build teams from settings
// ============================================================

function buildTeam(side: 'home' | 'away', settings: GameSettings): Team {
  if (settings.mode === 'vs-computer') {
    if (side === 'away') {
      // Human is away (bats first)
      const playerName = settings.players?.[0]?.name || 'Player';
      return {
        id: 'human-team',
        name: playerName,
        players: [{ id: 'human-1', name: playerName }],
        currentBatterIndex: 0,
      };
    }
    // Computer is home
    return {
      id: 'computer-team',
      name: 'The Pharisee',
      players: [{
        id: 'pharisee',
        name: 'The Pharisee',
        isComputer: true,
        computerDifficulty: settings.computerDifficulty || 'medium',
      }],
      currentBatterIndex: 0,
    };
  }

  if (settings.mode === 'local-multiplayer') {
    const players = settings.players || [];
    const half = Math.ceil(players.length / 2);
    const teamPlayers = side === 'away'
      ? players.slice(0, half)
      : players.slice(half);

    return {
      id: `${side}-team`,
      name: side === 'away' ? 'Visitors' : 'Home',
      players: teamPlayers.map((p, i) => ({
        id: `${side}-${i}`,
        name: p.name,
      })),
      currentBatterIndex: 0,
    };
  }

  // Online — placeholder, will be set from lobby
  return {
    id: `${side}-team`,
    name: side === 'away' ? 'Visitors' : 'Home',
    players: [{ id: uuidv4(), name: side === 'away' ? 'Away' : 'Home' }],
    currentBatterIndex: 0,
  };
}

// ============================================================
// Provider
// ============================================================

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(gameReducer, null);
  const phariseeTextRef = useRef('');
  const [phariseeText, setPhariseeText] = React.useState('');
  const computerTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    };
  }, []);

  const startGame = useCallback((settings: GameSettings) => {
    soundManager.init();
    soundManager.play('background');
    dispatch({ type: 'START_GAME', settings });
  }, []);

  const selectHit = useCallback((hitType: HitType) => {
    if (!state) return;
    dispatch({ type: 'SELECT_HIT', hitType });
    // Fetch a question for this difficulty
    const { question, updatedUsedIds } = selectQuestion(
      hitType,
      state.kidsMode,
      state.usedQuestionIds
    );
    dispatch({ type: 'SET_QUESTION', question, usedIds: updatedUsedIds });
  }, [state]);

  const submitAnswer = useCallback((answer: string) => {
    if (!state || !state.currentQuestion) return;
    const correct = checkAnswer(state.currentQuestion, answer);

    if (correct) {
      if (state.currentHitType === 'homerun') {
        soundManager.play('homerun');
      } else {
        soundManager.play('correct');
      }
    } else {
      soundManager.play('wrong');
    }

    dispatch({ type: 'PROCESS_RESULT', correct });
  }, [state]);

  const nextTurn = useCallback(() => {
    if (!state) return;
    if (state.gameOver) {
      soundManager.stop('background');
      const batting = getBattingTeam(state);
      if (batting.id === 'human-team' || state.homeScore > state.awayScore) {
        soundManager.play('gameOverWin');
      } else {
        soundManager.play('gameOverLose');
      }
    }
    dispatch({ type: 'NEXT_TURN' });
  }, [state]);

  const confirmDevicePass = useCallback(() => {
    dispatch({ type: 'DEVICE_PASSED' });
  }, []);

  const resetGame = useCallback(() => {
    soundManager.stopAll();
    dispatch({ type: 'RESET' });
  }, []);

  // Compute derived values
  const currentBatter = state ? getCurrentBatter(state) : null;
  const battingTeam = state ? getBattingTeam(state) : null;
  const availableHitTypes = state ? getAvailableHitTypes(state) : [];
  const isComputerTurn = currentBatter?.isComputer ?? false;

  // Handle computer turn automatically
  useEffect(() => {
    if (!state || !isComputerTurn || state.turnPhase !== 'select-hit') return;

    const difficulty = currentBatter?.computerDifficulty || 'medium';
    const hitChoice = getPhariseeHitChoice(availableHitTypes, difficulty);
    const delay = getPhariseeThinkingDelay();

    computerTimerRef.current = setTimeout(() => {
      // Select hit
      dispatch({ type: 'SELECT_HIT', hitType: hitChoice });

      const { question, updatedUsedIds } = selectQuestion(
        hitChoice,
        state.kidsMode,
        state.usedQuestionIds
      );
      dispatch({ type: 'SET_QUESTION', question, usedIds: updatedUsedIds });

      // Pharisee "thinks" then answers
      const answerDelay = getPhariseeThinkingDelay();
      computerTimerRef.current = setTimeout(() => {
        const { correct } = getPhariseeAnswer(question, difficulty);
        const flavorText = getFlavorText(correct, true);
        phariseeTextRef.current = flavorText;
        setPhariseeText(flavorText);

        if (correct) {
          if (hitChoice === 'homerun') {
            soundManager.play('homerun');
          } else {
            soundManager.play('correct');
          }
        } else {
          soundManager.play('wrong');
        }

        dispatch({ type: 'PROCESS_RESULT', correct });
      }, answerDelay);
    }, delay);

    return () => {
      if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    };
  }, [state?.turnPhase, isComputerTurn, state?.currentInning, state?.halfInning, state?.outs]);

  return (
    <GameContext.Provider
      value={{
        state,
        startGame,
        selectHit,
        submitAnswer,
        nextTurn,
        confirmDevicePass,
        resetGame,
        availableHitTypes,
        currentBatter,
        battingTeam,
        phariseeText,
        isComputerTurn,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
