'use client';

import type { BaseRunners } from '../../types';

interface Props {
  bases: BaseRunners;
  outs: number;
  kidsMode?: boolean;
}

export default function BaseballDiamond({ bases, outs, kidsMode }: Props) {
  const baseSize = kidsMode ? 28 : 22;
  const runnerSize = kidsMode ? 14 : 10;

  return (
    <div className="relative w-64 h-64 mx-auto my-4 select-none" role="img" aria-label="Baseball diamond">
      <svg viewBox="0 0 200 200" className="w-full h-full">
        {/* Grass background */}
        <rect x="0" y="0" width="200" height="200" fill="#2d5a27" rx="8" />

        {/* Infield dirt */}
        <polygon
          points="100,30 170,100 100,170 30,100"
          fill="#c4956a"
          stroke="#a07850"
          strokeWidth="2"
        />

        {/* Base paths */}
        <line x1="100" y1="30" x2="170" y2="100" stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1="170" y1="100" x2="100" y2="170" stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1="100" y1="170" x2="30" y2="100" stroke="white" strokeWidth="1.5" opacity="0.7" />
        <line x1="30" y1="100" x2="100" y2="30" stroke="white" strokeWidth="1.5" opacity="0.7" />

        {/* Pitcher's mound */}
        <circle cx="100" cy="100" r="6" fill="#a07850" stroke="#8a6540" strokeWidth="1" />
        <rect x="97" y="98" width="6" height="3" fill="white" rx="0.5" />

        {/* Home plate */}
        <polygon
          points="100,170 94,164 94,158 106,158 106,164"
          fill="white"
          stroke="#ccc"
          strokeWidth="0.5"
        />

        {/* Second base */}
        <rect
          x={100 - baseSize / 2}
          y={30 - baseSize / 2}
          width={baseSize}
          height={baseSize}
          fill={bases.second ? '#fbbf24' : 'white'}
          stroke={bases.second ? '#d97706' : '#ccc'}
          strokeWidth="1.5"
          transform="rotate(45 100 30)"
          className="transition-colors duration-500"
        />

        {/* First base */}
        <rect
          x={170 - baseSize / 2}
          y={100 - baseSize / 2}
          width={baseSize}
          height={baseSize}
          fill={bases.first ? '#fbbf24' : 'white'}
          stroke={bases.first ? '#d97706' : '#ccc'}
          strokeWidth="1.5"
          transform="rotate(45 170 100)"
          className="transition-colors duration-500"
        />

        {/* Third base */}
        <rect
          x={30 - baseSize / 2}
          y={100 - baseSize / 2}
          width={baseSize}
          height={baseSize}
          fill={bases.third ? '#fbbf24' : 'white'}
          stroke={bases.third ? '#d97706' : '#ccc'}
          strokeWidth="1.5"
          transform="rotate(45 30 100)"
          className="transition-colors duration-500"
        />

        {/* Runner dots */}
        {bases.first && (
          <circle cx="170" cy="100" r={runnerSize} fill="#3b82f6" stroke="white" strokeWidth="2" className="animate-pulse">
            <animate attributeName="r" values={`${runnerSize};${runnerSize + 2};${runnerSize}`} dur="1s" repeatCount="3" />
          </circle>
        )}
        {bases.second && (
          <circle cx="100" cy="30" r={runnerSize} fill="#3b82f6" stroke="white" strokeWidth="2" className="animate-pulse">
            <animate attributeName="r" values={`${runnerSize};${runnerSize + 2};${runnerSize}`} dur="1s" repeatCount="3" />
          </circle>
        )}
        {bases.third && (
          <circle cx="30" cy="100" r={runnerSize} fill="#3b82f6" stroke="white" strokeWidth="2" className="animate-pulse">
            <animate attributeName="r" values={`${runnerSize};${runnerSize + 2};${runnerSize}`} dur="1s" repeatCount="3" />
          </circle>
        )}
      </svg>

      {/* Out indicators */}
      <div className="flex justify-center items-center gap-2 mt-3 mb-2">
        <span className={kidsMode ? 'text-base' : 'text-sm'} style={{ color: '#f5f0e1' }}>Outs:</span>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`w-5 h-5 rounded-full border-2 transition-colors duration-300 ${
              i < outs
                ? 'bg-red-500 border-red-600'
                : 'bg-transparent border-gray-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
