'use client';

import type { GameState } from '../../types';

interface Props {
  state: GameState;
  kidsMode?: boolean;
}

export default function Scoreboard({ state, kidsMode }: Props) {
  const textSize = kidsMode ? 'text-lg' : 'text-sm';
  const headerSize = kidsMode ? 'text-xl' : 'text-base';

  return (
    <div className="bg-navy-900 rounded-lg border border-gold-500/30 overflow-hidden shadow-lg mx-auto max-w-md">
      {/* Inning indicator */}
      <div className="bg-navy-800 px-4 py-2 flex justify-between items-center">
        <span className={`${headerSize} font-bold text-gold-400`}>
          {state.halfInning === 'top' ? '▲' : '▼'} Inning {state.currentInning}
        </span>
        <span className={`${textSize} text-cream-200`}>
          of {state.totalInnings}
        </span>
      </div>

      {/* Score table */}
      <table className="w-full">
        <thead>
          <tr className="text-cream-300 border-b border-navy-700">
            <th className={`${textSize} text-left px-4 py-1`}>Team</th>
            {state.scores.map((_, i) => (
              <th key={i} className={`${textSize} px-2 py-1 text-center w-8`}>
                {i + 1}
              </th>
            ))}
            <th className={`${textSize} px-3 py-1 text-center font-bold`}>R</th>
          </tr>
        </thead>
        <tbody>
          {/* Away team */}
          <tr className={`border-b border-navy-700 ${state.halfInning === 'top' ? 'bg-navy-800/50' : ''}`}>
            <td className={`${textSize} px-4 py-2 font-semibold text-white`}>
              {state.awayTeam.name}
            </td>
            {state.scores.map((s, i) => (
              <td key={i} className={`${textSize} px-2 py-2 text-center text-cream-200`}>
                {i < state.currentInning || (i === state.currentInning - 1 && state.halfInning === 'bottom')
                  ? s.away
                  : i === state.currentInning - 1
                  ? s.away
                  : '-'}
              </td>
            ))}
            <td className={`${textSize} px-3 py-2 text-center font-bold text-gold-400`}>
              {state.awayScore}
            </td>
          </tr>
          {/* Home team */}
          <tr className={state.halfInning === 'bottom' ? 'bg-navy-800/50' : ''}>
            <td className={`${textSize} px-4 py-2 font-semibold text-white`}>
              {state.homeTeam.name}
            </td>
            {state.scores.map((s, i) => (
              <td key={i} className={`${textSize} px-2 py-2 text-center text-cream-200`}>
                {i < state.currentInning - 1 || (i === state.currentInning - 1 && state.halfInning === 'bottom')
                  ? s.home
                  : '-'}
              </td>
            ))}
            <td className={`${textSize} px-3 py-2 text-center font-bold text-gold-400`}>
              {state.homeScore}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
