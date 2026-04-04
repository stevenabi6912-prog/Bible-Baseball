// ============================================================
// Bible Baseball — Core Type Definitions
// ============================================================

/** Difficulty tiers that map to baseball hit types */
export type HitType = 'single' | 'double' | 'triple' | 'homerun';

/** Question format */
export type QuestionFormat = 'multiple-choice' | 'fill-in-the-blank';

/** A single Bible trivia question */
export interface Question {
  id: string;
  difficulty: HitType;
  format: QuestionFormat;
  question: string;
  options?: string[];        // For multiple-choice (4 options)
  answer: string;            // Correct answer text
  reference: string;         // KJV Bible reference (e.g., "Genesis 1:1")
  kids: boolean;             // true = part of the kids question pool
  category?: string;         // Optional grouping (OT, NT, Gospels, etc.)
}

/** Game mode selection */
export type GameMode = 'vs-computer' | 'local-multiplayer' | 'online-multiplayer';

/** Computer difficulty */
export type ComputerDifficulty = 'easy' | 'medium' | 'hard';

/** Half-inning identifier */
export type HalfInning = 'top' | 'bottom';

/** Base positions */
export type Base = 'first' | 'second' | 'third';

/** A player in the game */
export interface Player {
  id: string;
  name: string;
  avatarUrl?: string;
  isComputer?: boolean;
  computerDifficulty?: ComputerDifficulty;
}

/** A team of players */
export interface Team {
  id: string;
  name: string;
  players: Player[];
  /** Index into players array for current batter */
  currentBatterIndex: number;
}

/** Tracks which hit types have been used in the current half-inning per player */
export interface RotationTracker {
  [playerId: string]: HitType[];
}

/** Base runner state — which bases are occupied */
export interface BaseRunners {
  first: boolean;
  second: boolean;
  third: boolean;
}

/** Score for one team across all innings */
export interface InningScore {
  runs: number;
}

/** Full game state */
export interface GameState {
  /** Unique game ID */
  gameId: string;

  /** Current game mode */
  mode: GameMode;

  /** Kids mode enabled */
  kidsMode: boolean;

  /** Total innings selected (3, 5, 7, or 9) */
  totalInnings: number;

  /** Current inning (1-based) */
  currentInning: number;

  /** Top or bottom of the inning */
  halfInning: HalfInning;

  /** Number of outs in the current half-inning (0–3) */
  outs: number;

  /** Current base runner positions */
  bases: BaseRunners;

  /** The two teams */
  homeTeam: Team;
  awayTeam: Team;

  /** Inning-by-inning scores: scores[inning-1] = { home: runs, away: runs } */
  scores: { home: number; away: number }[];

  /** Total scores */
  homeScore: number;
  awayScore: number;

  /** Hit type rotation tracker per half-inning */
  rotation: RotationTracker;

  /** IDs of questions already shown this session */
  usedQuestionIds: string[];

  /** Is the game over? */
  gameOver: boolean;

  /** Winning team ID (null if tie or not over) */
  winnerId: string | null;

  /** Current phase of a turn */
  turnPhase: TurnPhase;

  /** The question currently being answered (if any) */
  currentQuestion: Question | null;

  /** The hit type chosen for the current at-bat */
  currentHitType: HitType | null;

  /** For local multiplayer: waiting for device pass */
  waitingForPass: boolean;
}

/** Phases within a single turn */
export type TurnPhase =
  | 'select-hit'       // Batter chooses hit type
  | 'answer-question'  // Batter sees and answers question
  | 'result'           // Show result (correct/wrong) with animation
  | 'between-turns'    // Transition between batters or half-innings
  | 'game-over';       // Game has ended

/** Result of answering a question */
export interface AtBatResult {
  correct: boolean;
  hitType: HitType;
  runsScored: number;
  outsRecorded: number;
  newBases: BaseRunners;
}

/** Game settings chosen before starting */
export interface GameSettings {
  mode: GameMode;
  innings: 3 | 5 | 7 | 9;
  kidsMode: boolean;
  computerDifficulty?: ComputerDifficulty;
  players?: { name: string }[];
}

/** Online lobby state */
export interface LobbyState {
  roomCode: string;
  hostId: string;
  players: Player[];
  spectators: Player[];
  settings: GameSettings;
  gameStarted: boolean;
}

/** Pharisee flavor text categories */
export type PhariseeReaction = 'correct-taunt' | 'correct-humble' | 'wrong-mock' | 'wrong-surprise';
