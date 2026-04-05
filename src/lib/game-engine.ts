// ============================================================
// Bible Baseball — Pure Game Engine
// ============================================================
// All functions are pure: they accept state and return new state.
// No side effects. Use spread operators for immutable updates.
// ============================================================

import type {
  GameState,
  GameSettings,
  Team,
  Player,
  HitType,
  BaseRunners,
  AtBatResult,
} from '../types';

// ------------------------------------------------------------
// Internal helpers
// ------------------------------------------------------------

/** All four hit types in order of difficulty */
const ALL_HIT_TYPES: HitType[] = ['single', 'double', 'triple', 'homerun'];

/** Generate a simple unique ID (no external deps) */
function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

/** Return an empty bases object */
function emptyBases(): BaseRunners {
  return { first: false, second: false, third: false };
}

// ------------------------------------------------------------
// 1. createInitialGameState
// ------------------------------------------------------------

/**
 * Initialize a brand-new game.
 * The away team always bats first (top of inning 1).
 */
export function createInitialGameState(
  settings: GameSettings,
  homeTeam: Team,
  awayTeam: Team,
): GameState {
  // Build an inning-score array pre-populated with zeros
  const scores = Array.from({ length: settings.innings }, () => ({
    home: 0,
    away: 0,
  }));

  return {
    gameId: generateId(),
    mode: settings.mode,
    kidsMode: settings.kidsMode,
    totalInnings: settings.innings,
    currentInning: 1,
    halfInning: 'top',           // Away team bats first
    outs: 0,
    bases: emptyBases(),
    homeTeam: { ...homeTeam, currentBatterIndex: 0 },
    awayTeam: { ...awayTeam, currentBatterIndex: 0 },
    scores,
    homeScore: 0,
    awayScore: 0,
    rotation: {},
    usedQuestionIds: [],
    gameOver: false,
    winnerId: null,
    turnPhase: 'select-hit',
    currentQuestion: null,
    currentHitType: null,
    waitingForPass: false,
  };
}

// ------------------------------------------------------------
// 2. getAvailableHitTypes
// ------------------------------------------------------------

/**
 * Returns the hit types the current batter may choose this at-bat.
 *
 * Rotation rule:
 *   - A player cannot repeat a hit type until they have attempted all
 *     four types within the current half-inning.
 *   - Once all four have been attempted, the rotation resets and every
 *     type becomes available again (a new cycle begins).
 *
 * The rotation tracker is keyed by player ID and resets when a new
 * half-inning starts (handled in switchHalfInning).
 */
export function getAvailableHitTypes(state: GameState): HitType[] {
  const batter = getCurrentBatter(state);
  const attempted: HitType[] = state.rotation[batter.id] ?? [];

  // If all four have been attempted in this half-inning, the cycle
  // resets and every type is available again.
  if (attempted.length >= ALL_HIT_TYPES.length) {
    return [...ALL_HIT_TYPES];
  }

  // Otherwise filter out types already tried this cycle.
  return ALL_HIT_TYPES.filter((type) => !attempted.includes(type));
}

// ------------------------------------------------------------
// 3. processAtBat
// ------------------------------------------------------------

/**
 * Process the result of a batter answering a question.
 *
 * - correct === true  → the hit occurs; advance runners accordingly.
 * - correct === false → automatic out; runners stay put.
 *
 * After recording the out or run(s):
 *   - Check for 3 outs → switch half-inning (or end game).
 *   - Advance to next batter.
 *   - Update rotation tracker for this batter.
 *
 * Returns the new immutable state and an AtBatResult summary.
 */
export function processAtBat(
  state: GameState,
  hitType: HitType,
  correct: boolean,
): { newState: GameState; result: AtBatResult } {
  let workingState: GameState = { ...state };

  let runsScored = 0;
  let outsRecorded = 0;
  let newBases: BaseRunners = { ...workingState.bases };

  // ── Update rotation tracker for this batter ──────────────
  const batter = getCurrentBatter(workingState);
  const previousAttempts: HitType[] = workingState.rotation[batter.id] ?? [];

  // If all four have already been tried (cycle complete), start a fresh cycle.
  const updatedAttempts =
    previousAttempts.length >= ALL_HIT_TYPES.length
      ? [hitType]
      : [...previousAttempts, hitType];

  workingState = {
    ...workingState,
    rotation: {
      ...workingState.rotation,
      [batter.id]: updatedAttempts,
    },
  };

  if (correct) {
    // ── Hit: advance runners ──────────────────────────────
    const advancement = advanceRunners(workingState.bases, hitType);
    newBases = advancement.newBases;
    runsScored = advancement.runsScored;

    // Credit runs to the batting team in the inning score array.
    workingState = creditRuns(workingState, runsScored);
    workingState = { ...workingState, bases: newBases };
  } else {
    // ── Out: runners don't move ───────────────────────────
    outsRecorded = 1;
    newBases = { ...workingState.bases }; // unchanged
    workingState = { ...workingState, outs: workingState.outs + 1 };
  }

  // Build result before any further state mutation.
  const result: AtBatResult = {
    correct,
    hitType,
    runsScored,
    outsRecorded,
    newBases,
  };

  // ── Advance to next batter ────────────────────────────────
  workingState = advanceBatter(workingState);

  // ── 3 outs → switch half-inning (or end game) ────────────
  if (workingState.outs >= 3) {
    if (isGameOver(workingState)) {
      workingState = finalizeGame(workingState);
    } else {
      workingState = switchHalfInning(workingState);
    }
  } else if (isGameOver(workingState)) {
    // Walk-off scenario: home team took the lead mid-inning, or
    // game ended for another reason before 3 outs.
    workingState = finalizeGame(workingState);
  }

  return { newState: workingState, result };
}

// ------------------------------------------------------------
// 4. getCurrentBatter
// ------------------------------------------------------------

/**
 * Returns the Player currently at bat (based on the batting team's
 * currentBatterIndex).
 */
export function getCurrentBatter(state: GameState): Player {
  const team = getBattingTeam(state);
  const index = team.currentBatterIndex % team.players.length;
  return team.players[index];
}

// ------------------------------------------------------------
// 5. getBattingTeam
// ------------------------------------------------------------

/**
 * Returns the team currently at bat.
 * Away team bats in the top half; home team bats in the bottom half.
 */
export function getBattingTeam(state: GameState): Team {
  return state.halfInning === 'top' ? state.awayTeam : state.homeTeam;
}

// ------------------------------------------------------------
// 6. getFieldingTeam
// ------------------------------------------------------------

/**
 * Returns the team currently in the field (opposite of batting team).
 */
export function getFieldingTeam(state: GameState): Team {
  return state.halfInning === 'top' ? state.homeTeam : state.awayTeam;
}

// ------------------------------------------------------------
// 7. isGameOver
// ------------------------------------------------------------

/**
 * Determines whether the game should end given the current state.
 *
 * Standard rules:
 *   - After the bottom of the final inning if scores differ.
 *   - After the top of the final inning if the home team already leads
 *     (home team wins without needing to bat — walk-off mercy).
 *   - If still tied after the bottom of the final inning, extra innings
 *     continue until the tie is broken at the end of a complete inning.
 *
 * Note: this function is called *before* a half-inning switch, so
 * currentInning / halfInning reflect the state that just completed.
 */
export function isGameOver(state: GameState): boolean {
  const { currentInning, totalInnings, halfInning, outs, homeScore, awayScore } = state;

  // The inning just being played has reached 3 outs.
  const halfInningComplete = outs >= 3;

  // ── After top of final inning: check if home team leads ──
  // If home leads going into the bottom, they don't need to bat.
  if (halfInning === 'top' && currentInning >= totalInnings && halfInningComplete) {
    if (homeScore > awayScore) {
      return true; // Home team wins without batting bottom half
    }
  }

  // ── After bottom of final inning (or extra innings) ──────
  if (halfInning === 'bottom' && currentInning >= totalInnings && halfInningComplete) {
    if (homeScore !== awayScore) {
      return true; // Game decided; tied → extra inning
    }
    // Tied: continue to extra innings (not over yet)
    return false;
  }

  return false;
}

// ------------------------------------------------------------
// 8. switchHalfInning
// ------------------------------------------------------------

/**
 * Transition from top→bottom or bottom→top (advancing inning).
 * Clears bases, resets outs to 0, and clears the rotation tracker.
 */
export function switchHalfInning(state: GameState): GameState {
  const isEndOfInning = state.halfInning === 'bottom';

  const nextHalf = state.halfInning === 'top' ? 'bottom' : 'top';
  const nextInning = isEndOfInning ? state.currentInning + 1 : state.currentInning;

  // Expand scores array if entering an extra inning.
  let scores = state.scores;
  if (isEndOfInning && nextInning > state.totalInnings) {
    scores = [...scores, { home: 0, away: 0 }];
  }

  return {
    ...state,
    halfInning: nextHalf,
    currentInning: nextInning,
    outs: 0,
    bases: emptyBases(),
    scores,
    rotation: {}, // Reset rotation for every new half-inning
    turnPhase: 'between-turns',
    // Don't clear currentQuestion/currentHitType here — the result
    // screen needs them to show the answer. NEXT_TURN clears them.
  };
}

// ------------------------------------------------------------
// 9. advanceRunners
// ------------------------------------------------------------

/**
 * Pure function: given the current base state and a hit type,
 * calculate where runners end up and how many score.
 *
 * Advancement rules:
 *   Single    — batter to 1st; all runners advance 1 base.
 *   Double    — batter to 2nd; all runners advance 2 bases.
 *   Triple    — batter to 3rd; all runners advance 3 bases.
 *   Home Run  — batter and all runners score; bases cleared.
 */
export function advanceRunners(
  bases: BaseRunners,
  hitType: HitType,
): { newBases: BaseRunners; runsScored: number } {
  if (hitType === 'homerun') {
    // Everyone scores; count all runners + batter (1).
    const runners = [bases.first, bases.second, bases.third].filter(Boolean).length;
    return {
      newBases: emptyBases(),
      runsScored: runners + 1, // +1 for the batter
    };
  }

  const advances: Record<HitType, number> = {
    single: 1,
    double: 2,
    triple: 3,
    homerun: 4, // handled above; included for completeness
  };

  const basesToAdvance = advances[hitType];

  // Represent each runner as a base number (1, 2, 3) and advance them.
  // The batter starts at base 0 and advances `basesToAdvance` bases.
  const runnerPositions: number[] = [];
  if (bases.first) runnerPositions.push(1);
  if (bases.second) runnerPositions.push(2);
  if (bases.third) runnerPositions.push(3);

  // Add the batter at position 0.
  runnerPositions.push(0);

  let runsScored = 0;
  const occupiedBases = new Set<number>();

  for (const pos of runnerPositions) {
    const newPos = pos + basesToAdvance;
    if (newPos >= 4) {
      // Crossed home plate.
      runsScored += 1;
    } else {
      occupiedBases.add(newPos);
    }
  }

  return {
    newBases: {
      first: occupiedBases.has(1),
      second: occupiedBases.has(2),
      third: occupiedBases.has(3),
    },
    runsScored,
  };
}

// ------------------------------------------------------------
// Private helpers
// ------------------------------------------------------------

/**
 * Credit `runsScored` to the current batting team in both the
 * inning-by-inning scores array and the total score fields.
 */
function creditRuns(state: GameState, runsScored: number): GameState {
  if (runsScored === 0) return state;

  // Inning index is 0-based; ensure it exists (handles extra innings).
  const inningIndex = state.currentInning - 1;
  const scores = state.scores.map((s, i) => {
    if (i !== inningIndex) return s;
    if (state.halfInning === 'top') {
      return { ...s, away: s.away + runsScored };
    }
    return { ...s, home: s.home + runsScored };
  });

  const homeScore =
    state.halfInning === 'bottom'
      ? state.homeScore + runsScored
      : state.homeScore;

  const awayScore =
    state.halfInning === 'top'
      ? state.awayScore + runsScored
      : state.awayScore;

  return { ...state, scores, homeScore, awayScore };
}

/**
 * Advance the batting team's batter index by one (wraps around).
 */
function advanceBatter(state: GameState): GameState {
  if (state.halfInning === 'top') {
    const awayTeam = {
      ...state.awayTeam,
      currentBatterIndex:
        (state.awayTeam.currentBatterIndex + 1) % state.awayTeam.players.length,
    };
    return { ...state, awayTeam };
  }
  const homeTeam = {
    ...state.homeTeam,
    currentBatterIndex:
      (state.homeTeam.currentBatterIndex + 1) % state.homeTeam.players.length,
  };
  return { ...state, homeTeam };
}

/**
 * Mark the game as finished and determine the winner.
 */
function finalizeGame(state: GameState): GameState {
  let winnerId: string | null = null;

  if (state.homeScore > state.awayScore) {
    winnerId = state.homeTeam.id;
  } else if (state.awayScore > state.homeScore) {
    winnerId = state.awayTeam.id;
  }
  // If still tied (shouldn't happen after game-over check, but be safe)
  // winnerId stays null.

  return {
    ...state,
    gameOver: true,
    winnerId,
    turnPhase: 'game-over',
    // Don't clear currentQuestion/currentHitType — result screen needs them.
  };
}
