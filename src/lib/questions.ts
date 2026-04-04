// ============================================================
// Question Selection & Anti-Repetition System
// ============================================================

import questionsData from '../data/questions.json';
import type { Question, HitType } from '../types';

const allQuestions: Question[] = questionsData as Question[];

/**
 * Get questions filtered by difficulty and kids mode.
 * In kids mode:
 *  - Singles and Doubles pull from kids=true pool
 *  - Triples and Home Runs pull from easiest adult questions with simple phrasing
 */
export function getFilteredQuestions(
  difficulty: HitType,
  kidsMode: boolean
): Question[] {
  if (kidsMode) {
    if (difficulty === 'single' || difficulty === 'double') {
      // Pull from kids pool for these difficulties
      const kidsQuestions = allQuestions.filter(
        (q) => q.kids && q.difficulty === difficulty
      );
      if (kidsQuestions.length > 0) return kidsQuestions;
      // Fallback: any kids question
      return allQuestions.filter((q) => q.kids);
    }
    // For triples and home runs in kids mode, use easiest adult questions
    // (singles and doubles that aren't kids-flagged)
    return allQuestions.filter(
      (q) => !q.kids && (q.difficulty === 'single' || q.difficulty === 'double')
    );
  }

  // Standard mode: filter by exact difficulty
  return allQuestions.filter((q) => q.difficulty === difficulty && !q.kids);
}

/**
 * Select a random question that hasn't been used yet.
 * If all questions in the pool have been used, reset and reshuffle.
 */
export function selectQuestion(
  difficulty: HitType,
  kidsMode: boolean,
  usedIds: string[]
): { question: Question; updatedUsedIds: string[] } {
  const pool = getFilteredQuestions(difficulty, kidsMode);

  // Filter out already-used questions
  let available = pool.filter((q) => !usedIds.includes(q.id));

  // If pool exhausted, reset for this difficulty tier
  if (available.length === 0) {
    const poolIds = new Set(pool.map((q) => q.id));
    const newUsedIds = usedIds.filter((id) => !poolIds.has(id));
    available = pool;
    return {
      question: pickRandom(available),
      updatedUsedIds: [...newUsedIds, available[0].id],
    };
  }

  const chosen = pickRandom(available);
  return {
    question: chosen,
    updatedUsedIds: [...usedIds, chosen.id],
  };
}

/** Pick a random element from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Check if an answer is correct.
 * For multiple-choice: exact match with the correct option.
 * For fill-in-the-blank: case-insensitive, trimmed comparison.
 */
export function checkAnswer(question: Question, userAnswer: string): boolean {
  const correct = question.answer.trim().toLowerCase();
  const given = userAnswer.trim().toLowerCase();
  return correct === given;
}
