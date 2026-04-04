'use client';

import type { GameState } from '../../types';

interface Props {
  state: GameState;
  onContinue: () => void;
  phariseeText?: string;
  kidsMode?: boolean;
}

export default function ResultDisplay({ state, onContinue, phariseeText, kidsMode }: Props) {
  const lastAtBat = getLastAtBatInfo(state);
  const textSize = kidsMode ? 'text-xl' : 'text-base';
  const headingSize = kidsMode ? 'text-3xl' : 'text-2xl';

  return (
    <div className="w-full max-w-md mx-auto text-center space-y-4 animate-fade-in">
      {/* Result header */}
      <div className={`${headingSize} font-bold ${lastAtBat.correct ? 'text-green-400' : 'text-red-400'}`}>
        {lastAtBat.correct ? (
          kidsMode ? 'Great Job! ⭐' : getHitText(state.currentHitType!)
        ) : (
          kidsMode ? 'Oh no! Out!' : "You're Out!"
        )}
      </div>

      {/* Answer reveal */}
      {state.currentQuestion && (
        <div className="bg-navy-800 rounded-lg p-4 border border-navy-600">
          <p className={`${textSize} text-cream-200 mb-1`}>
            {lastAtBat.correct ? 'Correct!' : 'The answer was:'}
          </p>
          <p className={`${kidsMode ? 'text-2xl' : 'text-lg'} font-bold text-gold-400`}>
            {state.currentQuestion.answer}
          </p>
          <p className="text-cream-400 text-sm mt-1">{state.currentQuestion.reference}</p>
        </div>
      )}

      {/* Runs scored */}
      {lastAtBat.correct && lastAtBat.runsScored > 0 && (
        <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3">
          <p className={`${textSize} text-green-300 font-bold`}>
            {lastAtBat.runsScored} run{lastAtBat.runsScored > 1 ? 's' : ''} scored!
          </p>
        </div>
      )}

      {/* Pharisee flavor text */}
      {phariseeText && (
        <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-3 italic">
          <p className="text-sm text-purple-300">The Pharisee says:</p>
          <p className={`${textSize} text-purple-200`}>&ldquo;{phariseeText}&rdquo;</p>
        </div>
      )}

      {/* Continue button */}
      <button
        onClick={onContinue}
        className={`
          w-full p-4 rounded-xl font-bold ${textSize}
          bg-gold-500 text-navy-900 hover:bg-gold-400
          active:scale-95 transition-all shadow-lg
        `}
      >
        {state.gameOver
          ? 'See Final Score'
          : kidsMode
          ? 'Next Batter!'
          : 'Continue'}
      </button>
    </div>
  );
}

function getLastAtBatInfo(state: GameState) {
  // Determine from state whether last at-bat was correct
  // If outs just increased, it was wrong. Otherwise it was correct.
  // We use currentHitType and bases to infer
  const correct = state.currentHitType !== null && state.outs === 0
    ? true  // This is simplified — the actual tracking happens in context
    : false;

  return {
    correct: state.currentQuestion !== null, // Placeholder - actual logic in context
    runsScored: 0,
  };
}

function getHitText(hitType: string): string {
  switch (hitType) {
    case 'single': return 'Single! ⚾';
    case 'double': return 'Double! 🏏';
    case 'triple': return 'Triple! 💪';
    case 'homerun': return 'HOME RUN! 🔥';
    default: return 'Hit!';
  }
}
