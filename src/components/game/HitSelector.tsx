'use client';

import type { HitType } from '../../types';

interface Props {
  availableHits: HitType[];
  onSelect: (hitType: HitType) => void;
  kidsMode?: boolean;
  disabled?: boolean;
}

const HIT_CONFIG: Record<HitType, { label: string; kidsLabel: string; emoji: string; color: string; disabledColor: string }> = {
  single: {
    label: 'Single',
    kidsLabel: 'Easy Hit!',
    emoji: '⚾',
    color: 'bg-green-600 hover:bg-green-500 border-green-400',
    disabledColor: 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-40',
  },
  double: {
    label: 'Double',
    kidsLabel: 'Good Hit!',
    emoji: '🏏',
    color: 'bg-blue-600 hover:bg-blue-500 border-blue-400',
    disabledColor: 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-40',
  },
  triple: {
    label: 'Triple',
    kidsLabel: 'Great Hit!',
    emoji: '💪',
    color: 'bg-purple-600 hover:bg-purple-500 border-purple-400',
    disabledColor: 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-40',
  },
  homerun: {
    label: 'Home Run',
    kidsLabel: 'SLAM!',
    emoji: '🔥',
    color: 'bg-red-600 hover:bg-red-500 border-red-400',
    disabledColor: 'bg-gray-600 border-gray-500 cursor-not-allowed opacity-40',
  },
};

const ALL_HITS: HitType[] = ['single', 'double', 'triple', 'homerun'];

export default function HitSelector({ availableHits, onSelect, kidsMode, disabled }: Props) {
  const textSize = kidsMode ? 'text-xl' : 'text-base';

  return (
    <div className="w-full max-w-md mx-auto">
      <h3 className={`text-center ${kidsMode ? 'text-2xl' : 'text-lg'} font-bold text-gold-400 mb-3`}>
        {kidsMode ? 'Pick Your Swing!' : 'Choose Your Hit'}
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {ALL_HITS.map((hit) => {
          const config = HIT_CONFIG[hit];
          const isAvailable = availableHits.includes(hit);
          const isDisabled = disabled || !isAvailable;

          return (
            <button
              key={hit}
              onClick={() => !isDisabled && onSelect(hit)}
              disabled={isDisabled}
              className={`
                relative p-4 rounded-xl border-2 font-bold transition-all duration-200
                ${textSize} text-white shadow-md
                ${isDisabled ? config.disabledColor : config.color}
                ${!isDisabled ? 'active:scale-95 transform' : ''}
              `}
              title={!isAvailable ? 'Try a different hit type first!' : undefined}
            >
              <span className="text-2xl block mb-1">{config.emoji}</span>
              {kidsMode ? config.kidsLabel : config.label}
              {!isAvailable && (
                <span className="absolute -top-1 -right-1 bg-yellow-500 text-navy-900 text-xs px-1.5 py-0.5 rounded-full font-bold">
                  !
                </span>
              )}
            </button>
          );
        })}
      </div>
      {availableHits.length < 4 && (
        <p className="text-center text-sm text-cream-400 mt-2 italic">
          {kidsMode
            ? 'Try the other swings first!'
            : 'Rotation rule: try each hit type before repeating'}
        </p>
      )}
    </div>
  );
}
