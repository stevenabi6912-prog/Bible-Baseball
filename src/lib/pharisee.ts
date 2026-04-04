// ============================================================
// The Pharisee — AI Computer Opponent
// ============================================================

import type { ComputerDifficulty, HitType, Question, PhariseeReaction } from '../types';

/** Accuracy rates by difficulty setting */
const ACCURACY: Record<ComputerDifficulty, number> = {
  easy: 0.4,
  medium: 0.65,
  hard: 0.85,
};

/**
 * Determine if The Pharisee answers correctly based on difficulty.
 */
export function phariseeAnswers(difficulty: ComputerDifficulty): boolean {
  return Math.random() < ACCURACY[difficulty];
}

/**
 * Get The Pharisee's answer for a question.
 * If answering correctly, returns the correct answer.
 * If answering wrong, returns a random wrong option (for MC) or empty string (for fill-in).
 */
export function getPhariseeAnswer(
  question: Question,
  difficulty: ComputerDifficulty
): { answer: string; correct: boolean } {
  const correct = phariseeAnswers(difficulty);

  if (correct) {
    return { answer: question.answer, correct: true };
  }

  // Pick a wrong answer
  if (question.format === 'multiple-choice' && question.options) {
    const wrongOptions = question.options.filter((o) => o !== question.answer);
    const wrongAnswer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
    return { answer: wrongAnswer, correct: false };
  }

  return { answer: '...', correct: false };
}

/**
 * Get The Pharisee's preferred hit type selection.
 * Higher difficulty = more aggressive hit choices.
 */
export function getPhariseeHitChoice(
  available: HitType[],
  difficulty: ComputerDifficulty
): HitType {
  // Weight preferences by difficulty
  const weights: Record<ComputerDifficulty, Record<HitType, number>> = {
    easy: { single: 4, double: 3, triple: 2, homerun: 1 },
    medium: { single: 3, double: 3, triple: 2, homerun: 2 },
    hard: { single: 2, double: 3, triple: 3, homerun: 2 },
  };

  const w = weights[difficulty];
  const pool: HitType[] = [];

  for (const hit of available) {
    const count = w[hit] || 1;
    for (let i = 0; i < count; i++) {
      pool.push(hit);
    }
  }

  return pool[Math.floor(Math.random() * pool.length)];
}

/** Thinking delay range in ms */
export function getPhariseeThinkingDelay(): number {
  return 1000 + Math.random() * 1000; // 1–2 seconds
}

// ============================================================
// Flavor Text
// ============================================================

const FLAVOR_TEXT: Record<PhariseeReaction, string[]> = {
  'correct-taunt': [
    'Do you not know your scriptures?',
    'I have studied the scrolls since before you were born.',
    'The Word is my bread and butter.',
    'Perhaps you should attend more Sabbath lessons.',
    'Even a Pharisee knows this one!',
    'I could recite this in my sleep.',
    'The scriptures are my strength.',
  ],
  'correct-humble': [
    'Even I, the Pharisee, must admit that was well done.',
    'A worthy opponent! The Lord has blessed you with knowledge.',
    'I tip my phylactery to you.',
    'Well played, my friend. Well played indeed.',
    'You know the Word! I am... impressed.',
  ],
  'wrong-mock': [
    'Ha! Even the Sadducees knew that one!',
    'Did you skip your morning devotional?',
    'I expected more from you, truly.',
    'The answer was right there in the text!',
    'Perhaps you should start with Genesis, chapter one.',
    'Oh my... that was not your finest moment.',
  ],
  'wrong-surprise': [
    'Wait... I got that wrong? Impossible!',
    'The scrolls must have been mistranslated!',
    'I demand a recount of the scribes!',
    'Even the greatest scholars stumble occasionally.',
    'This is... most unexpected.',
    'I blame the dust in my study.',
  ],
};

/**
 * Get a random flavor text line based on the situation.
 * @param phariseeCorrect - whether The Pharisee got their answer right
 * @param playerCorrect - whether the human player got their answer right (for reaction)
 */
export function getFlavorText(phariseeCorrect: boolean, isPharisTurn: boolean): string {
  let category: PhariseeReaction;

  if (isPharisTurn) {
    // The Pharisee just answered
    category = phariseeCorrect ? 'correct-taunt' : 'wrong-surprise';
  } else {
    // Reacting to the player's answer
    category = phariseeCorrect ? 'wrong-mock' : 'correct-humble';
  }

  const texts = FLAVOR_TEXT[category];
  return texts[Math.floor(Math.random() * texts.length)];
}
