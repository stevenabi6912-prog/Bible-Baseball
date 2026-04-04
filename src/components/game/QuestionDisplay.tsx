'use client';

import { useState } from 'react';
import type { Question } from '../../types';

interface Props {
  question: Question;
  onAnswer: (answer: string) => void;
  kidsMode?: boolean;
  disabled?: boolean;
}

export default function QuestionDisplay({ question, onAnswer, kidsMode, disabled }: Props) {
  const [fillAnswer, setFillAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<string | null>(null);

  const textSize = kidsMode ? 'text-xl' : 'text-base';
  const questionSize = kidsMode ? 'text-2xl' : 'text-lg';

  const handleMultipleChoice = (option: string) => {
    if (disabled || selectedOption) return;
    setSelectedOption(option);
    // Brief visual feedback before submitting
    setTimeout(() => onAnswer(option), 300);
  };

  const handleFillSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled || !fillAnswer.trim()) return;
    onAnswer(fillAnswer.trim());
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-navy-800 rounded-xl p-5 shadow-lg border border-gold-500/20">
      {/* Difficulty badge */}
      <div className="flex justify-between items-start mb-3">
        <span className={`px-3 py-1 rounded-full text-sm font-bold ${getDifficultyColor(question.difficulty)}`}>
          {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
        </span>
        <span className="text-cream-400 text-xs">{question.reference}</span>
      </div>

      {/* Question text */}
      <p className={`${questionSize} font-semibold text-white mb-5 leading-relaxed`}>
        {question.question}
      </p>

      {/* Multiple choice */}
      {question.format === 'multiple-choice' && question.options && (
        <div className="space-y-3">
          {question.options.map((option, i) => (
            <button
              key={i}
              onClick={() => handleMultipleChoice(option)}
              disabled={disabled || selectedOption !== null}
              className={`
                w-full text-left p-4 rounded-lg border-2 transition-all duration-200
                ${textSize} font-medium
                ${
                  selectedOption === option
                    ? 'bg-gold-500 border-gold-400 text-navy-900'
                    : selectedOption
                    ? 'bg-navy-700 border-navy-600 text-cream-300 opacity-60'
                    : 'bg-navy-700 border-navy-600 text-white hover:bg-navy-600 hover:border-gold-500/50 active:scale-[0.98]'
                }
              `}
            >
              <span className="inline-block w-8 h-8 rounded-full bg-navy-900/30 text-center leading-8 mr-3 text-sm">
                {String.fromCharCode(65 + i)}
              </span>
              {option}
            </button>
          ))}
        </div>
      )}

      {/* Fill in the blank */}
      {question.format === 'fill-in-the-blank' && (
        <form onSubmit={handleFillSubmit} className="space-y-3">
          <input
            type="text"
            value={fillAnswer}
            onChange={(e) => setFillAnswer(e.target.value)}
            placeholder={kidsMode ? 'Type your answer here...' : 'Enter your answer...'}
            disabled={disabled}
            autoFocus
            className={`
              w-full p-4 rounded-lg border-2 border-navy-600 bg-navy-700
              text-white ${textSize} placeholder-cream-500
              focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20
            `}
          />
          <button
            type="submit"
            disabled={disabled || !fillAnswer.trim()}
            className={`
              w-full p-4 rounded-lg font-bold ${textSize}
              bg-gold-500 text-navy-900 hover:bg-gold-400
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-colors
            `}
          >
            {kidsMode ? 'Submit Answer!' : 'Submit'}
          </button>
        </form>
      )}
    </div>
  );
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'single': return 'bg-green-600 text-white';
    case 'double': return 'bg-blue-600 text-white';
    case 'triple': return 'bg-purple-600 text-white';
    case 'homerun': return 'bg-red-600 text-white';
    default: return 'bg-gray-600 text-white';
  }
}
