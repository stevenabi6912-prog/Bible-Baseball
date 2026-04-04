'use client';

import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect, useState } from 'react';
import type {
  GameState, GameSettings, HitType, Team, Player, TurnPhase, Question,
  GameMode, ComputerDifficulty, AtBatResult,
} from '../types';
import {
  createInitialGameState, processAtBat, getAvailableHitTypes,
  getCurrentBatter, getBattingTeam,
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
  | { type: 'PROCESS_RESULT'; correct: boolean; result: AtBatResult }
  | { type: 'NEXT_TURN' }
  | { type: 'DEVICE_PASSED' }
  | { type: 'SET_STATE'; state: GameState }
  | { type: 'RESET' };

// ============================================================
// Context
// ============================================================

interface GameContextType {
  state: GameState | null;
  lastResult: AtBatResult | null;
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

interface ReducerState {
  game: GameState | null;
  lastResult: AtBatResult | null;
}

function gameReducer(state: ReducerState, action: GameAction): ReducerState {
  switch (action.type) {
    case 'START_GAME': {
      const { settings } = action;
      const awayTeam = buildTeam('away', settings);
      const homeTeam = buildTeam('home', settings);
      return {
        game: createInitialGameState(settings, homeTeam, awayTeam),
        lastResult: null,
      };
    }
    case 'SET_STATE':
      return { ...state, game: action.state };
    case 'SET_QUESTION':
      if (!state.game) return state;
      return {
        ...state,
        game: {
          ...state.game,
          currentQuestion: action.question,
          usedQuestionIds: action.usedIds,
          turnPhase: 'answer-question' as TurnPhase,
        },
      };
    case 'SELECT_HIT':
      if (!state.game) return state;
      return {
        ...state,
        game: { ...state.game, currentHitType: action.hitType },
      };
    case 'PROCESS_RESULT': {
      if (!state.game || !state.game.currentHitType) return state;
      const { newState, result } = processAtBat(state.game, state.game.currentHitType, action.correct);
      return {
        game: { ...newState, turnPhase: 'result' as TurnPhase },
        lastResult: result,
      };
    }
    case 'NEXT_TURN': {
      if (!state.game) return state;
      if (state.game.gameOver) {
        return {
          ...state,
          game: { ...state.game, turnPhase: 'game-over' as TurnPhase },
        };
      }
      const needsPass = state.game.mode === 'local-multiplayer';
      return {
        ...state,
        game: {
          ...state.game,
          currentQuestion: null,
          currentHitType: null,
          turnPhase: 'select-hit' as TurnPhase,
          waitingForPass: needsPass,
        },
        lastResult: null,
      };
    }
    case 'DEVICE_PASSED':
      if (!state.game) return state;
      return {
        ...state,
        game: { ...state.game, waitingForPass: false },
      };
    case 'RESET':
      return { game: null, lastResult: null };
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
      const playerName = settings.players?.[0]?.name || 'Player';
      return {
        id: 'human-team',
        name: playerName,
        players: [{ id: 'human-1', name: playerName }],
        currentBatterIndex: 0,
      };
    }
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
  const [reducerState, dispatch] = useReducer(gameReducer, { game: null, lastResult: null });
  const state = reducerState.game;
  const lastResult = reducerState.lastResult;
  const [phariseeText, setPhariseeText] = useState('');
  const computerTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Use a ref to always have current state in the computer effect
  const stateRef = useRef(state);
  stateRef.current = state;

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
    const s = stateRef.current;
    if (!s) return;
    dispatch({ type: 'SELECT_HIT', hitType });
    const { question, updatedUsedIds } = selectQuestion(
      hitType,
      s.kidsMode,
      s.usedQuestionIds
    );
    dispatch({ type: 'SET_QUESTION', question, usedIds: updatedUsedIds });
  }, []);

  const submitAnswer = useCallback((answer: string) => {
    const s = stateRef.current;
    if (!s || !s.currentQuestion || !s.currentHitType) return;
    const correct = checkAnswer(s.currentQuestion, answer);

    if (correct) {
      if (s.currentHitType === 'homerun') {
        soundManager.play('homerun');
      } else {
        soundManager.play('correct');
      }
    } else {
      soundManager.play('wrong');
    }

    // Compute result for passing to reducer
    dispatch({ type: 'PROCESS_RESULT', correct, result: { correct, hitType: s.currentHitType, runsScored: 0, outsRecorded: 0, newBases: s.bases } });
  }, []);

  const nextTurn = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.gameOver) {
      soundManager.stop('background');
      if (s.awayScore > s.homeScore) {
        soundManager.play('gameOverWin');
      } else {
        soundManager.play('gameOverLose');
      }
    }
    dispatch({ type: 'NEXT_TURN' });
  }, []);

  const confirmDevicePass = useCallback(() => {
    dispatch({ type: 'DEVICE_PASSED' });
  }, []);

  const resetGame = useCallback(() => {
    soundManager.stopAll();
    if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
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
    if (availableHitTypes.length === 0) return;

    const difficulty = currentBatter?.computerDifficulty || 'medium';
    const hitChoice = getPhariseeHitChoice(availableHitTypes, difficulty);
    const delay = getPhariseeThinkingDelay();

    const timer1 = setTimeout(() => {
      const s = stateRef.current;
      if (!s || s.turnPhase !== 'select-hit') return;

      dispatch({ type: 'SELECT_HIT', hitType: hitChoice });

      const { question, updatedUsedIds } = selectQuestion(
        hitChoice,
        s.kidsMode,
        s.usedQuestionIds
      );
      dispatch({ type: 'SET_QUESTION', question, usedIds: updatedUsedIds });

      const answerDelay = getPhariseeThinkingDelay();
      const timer2 = setTimeout(() => {
        const { correct } = getPhariseeAnswer(question, difficulty);
        const flavorText = getFlavorText(correct, true);
        setPhariseeText(flavorText);

        if (correct) {
          soundManager.play(hitChoice === 'homerun' ? 'homerun' : 'correct');
        } else {
          soundManager.play('wrong');
        }

        dispatch({
          type: 'PROCESS_RESULT',
          correct,
          result: { correct, hitType: hitChoice, runsScored: 0, outsRecorded: 0, newBases: { first: false, second: false, third: false } },
        });
      }, answerDelay);
      computerTimerRef.current = timer2;
    }, delay);
    computerTimerRef.current = timer1;

    return () => {
      if (computerTimerRef.current) clearTimeout(computerTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.turnPhase, state?.halfInning, state?.currentInning, isComputerTurn]);

  return (
    <GameContext.Provider
      value={{
        state,
        lastResult,
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
