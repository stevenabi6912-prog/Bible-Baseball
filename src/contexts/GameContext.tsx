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
  | { type: 'PROCESS_RESULT'; correct: boolean }
  | { type: 'NEXT_TURN' }
  | { type: 'DEVICE_PASSED' }
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
// Reducer State
// ============================================================

interface ReducerState {
  game: GameState | null;
  lastResult: AtBatResult | null;
  /** Incremented on each NEXT_TURN to trigger effects reliably */
  turnCounter: number;
  /** Track who was batting before processAtBat to detect batter changes */
  previousBatterId: string | null;
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
        turnCounter: 0,
        previousBatterId: null,
      };
    }
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
      // Save current batter ID before processAtBat changes it
      const batterBefore = getCurrentBatter(state.game);
      const { newState, result } = processAtBat(state.game, state.game.currentHitType, action.correct);
      return {
        ...state,
        game: { ...newState, turnPhase: 'result' as TurnPhase },
        lastResult: result,
        previousBatterId: batterBefore.id,
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
      // Only show "pass device" screen when the batter actually changed
      // (different player than the one who just batted)
      const nextBatter = getCurrentBatter(state.game);
      const batterChanged = state.previousBatterId !== null
        && state.previousBatterId !== nextBatter.id;
      const needsPass = state.game.mode === 'local-multiplayer' && batterChanged;
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
        turnCounter: state.turnCounter + 1,
      };
    }
    case 'DEVICE_PASSED':
      if (!state.game) return state;
      return {
        ...state,
        game: { ...state.game, waitingForPass: false },
      };
    case 'RESET':
      return { game: null, lastResult: null, turnCounter: 0, previousBatterId: null };
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
      const p = settings.players?.[0];
      const playerName = p?.name || 'Player';
      return {
        id: 'human-team',
        name: playerName,
        players: [{ id: 'human-1', name: playerName, kidsMode: p?.kidsMode }],
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
      name: teamPlayers.map(p => p.name).join(' & '),
      players: teamPlayers.map((p, i) => ({
        id: `${side}-${i}`,
        name: p.name,
        kidsMode: p.kidsMode,
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
  const [reducerState, dispatch] = useReducer(gameReducer, {
    game: null,
    lastResult: null,
    turnCounter: 0,
    previousBatterId: null,
  });
  const state = reducerState.game;
  const lastResult = reducerState.lastResult;
  const turnCounter = reducerState.turnCounter;
  const [phariseeText, setPhariseeText] = useState('');
  const stateRef = useRef(state);
  stateRef.current = state;
  // Track whether a computer turn sequence is currently running
  const computerTurnActiveRef = useRef(false);
  // Store timer IDs for cleanup on unmount/reset only
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
    computerTurnActiveRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const startGame = useCallback((settings: GameSettings) => {
    soundManager.init();
    soundManager.play('background');
    dispatch({ type: 'START_GAME', settings });
  }, []);

  const selectHit = useCallback((hitType: HitType) => {
    const s = stateRef.current;
    if (!s) return;
    dispatch({ type: 'SELECT_HIT', hitType });
    // Use the current batter's individual kidsMode setting
    const batter = getCurrentBatter(s);
    const useKidsMode = batter.kidsMode ?? s.kidsMode;
    const { question, updatedUsedIds } = selectQuestion(hitType, useKidsMode, s.usedQuestionIds);
    dispatch({ type: 'SET_QUESTION', question, usedIds: updatedUsedIds });
  }, []);

  const submitAnswer = useCallback((answer: string) => {
    const s = stateRef.current;
    if (!s || !s.currentQuestion || !s.currentHitType) return;
    const correct = checkAnswer(s.currentQuestion, answer);

    if (correct) {
      soundManager.play(s.currentHitType === 'homerun' ? 'homerun' : 'correct');
    } else {
      soundManager.play('wrong');
    }

    dispatch({ type: 'PROCESS_RESULT', correct });
  }, []);

  const nextTurn = useCallback(() => {
    const s = stateRef.current;
    if (!s) return;
    if (s.gameOver) {
      soundManager.stop('background');
      soundManager.play(s.awayScore > s.homeScore ? 'gameOverWin' : 'gameOverLose');
    }
    dispatch({ type: 'NEXT_TURN' });
  }, []);

  const confirmDevicePass = useCallback(() => {
    dispatch({ type: 'DEVICE_PASSED' });
  }, []);

  const resetGame = useCallback(() => {
    soundManager.stopAll();
    clearAllTimers();
    dispatch({ type: 'RESET' });
  }, [clearAllTimers]);

  // Compute derived values
  const currentBatter = state ? getCurrentBatter(state) : null;
  const battingTeam = state ? getBattingTeam(state) : null;
  const availableHitTypes = state ? getAvailableHitTypes(state) : [];
  const isComputerTurn = currentBatter?.isComputer ?? false;

  // ================================================================
  // COMPUTER TURN — runs The Pharisee's at-bat automatically
  //
  // KEY INSIGHT: This effect must NOT have state?.turnPhase in its
  // deps. The dispatches inside the timers change turnPhase, which
  // would trigger cleanup and kill the second timer. Instead, we
  // depend ONLY on turnCounter (incremented by NEXT_TURN) and use
  // computerTurnActiveRef to prevent double-runs.
  // ================================================================
  useEffect(() => {
    // Don't start if a sequence is already running
    if (computerTurnActiveRef.current) return;

    const s = stateRef.current;
    if (!s || s.turnPhase !== 'select-hit') return;

    // Check if the CURRENT batter is a computer player
    const batter = getCurrentBatter(s);
    if (!batter.isComputer) return;

    const difficulty = batter.computerDifficulty || 'medium';
    const available = getAvailableHitTypes(s);
    if (available.length === 0) return;

    // Mark computer turn as active so re-renders don't restart it
    computerTurnActiveRef.current = true;

    const hitChoice = getPhariseeHitChoice(available, difficulty);

    // Step 1: "thinking" delay before selecting hit
    const t1 = setTimeout(() => {
      const s2 = stateRef.current;
      if (!s2) { computerTurnActiveRef.current = false; return; }

      dispatch({ type: 'SELECT_HIT', hitType: hitChoice });

      const { question, updatedUsedIds } = selectQuestion(hitChoice, s2.kidsMode, s2.usedQuestionIds);
      dispatch({ type: 'SET_QUESTION', question, usedIds: updatedUsedIds });

      // Step 2: "answering" delay
      const t2 = setTimeout(() => {
        const { correct } = getPhariseeAnswer(question, difficulty);
        setPhariseeText(getFlavorText(correct, true));

        if (correct) {
          soundManager.play(hitChoice === 'homerun' ? 'homerun' : 'correct');
        } else {
          soundManager.play('wrong');
        }

        dispatch({ type: 'PROCESS_RESULT', correct });
        computerTurnActiveRef.current = false;
      }, getPhariseeThinkingDelay());
      timersRef.current.push(t2);
    }, getPhariseeThinkingDelay());
    timersRef.current.push(t1);

    // NO cleanup here — we don't want re-renders to kill our timers.
    // Timers are only cleared on unmount/reset via clearAllTimers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnCounter]);

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
