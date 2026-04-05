'use client';

import type { GameState, Team } from '../../types';

interface Props {
  state: GameState;
  onPlayAgain: () => void;
  onMainMenu: () => void;
  kidsMode?: boolean;
}

/** Get displayable team name — list all player names */
function getTeamDisplayName(team: Team): string {
  if (team.players.length === 1) {
    return team.players[0].name;
  }
  return team.players.map((p) => p.name).join(', ');
}

export default function GameOverScreen({ state, onPlayAgain, onMainMenu, kidsMode }: Props) {
  const homeWins = state.homeScore > state.awayScore;
  const isTie = state.homeScore === state.awayScore;
  const winningTeam = isTie ? null : homeWins ? state.homeTeam : state.awayTeam;
  const winnerDisplay = winningTeam ? getTeamDisplayName(winningTeam) : null;
  const headingSize = kidsMode ? 'text-4xl' : 'text-3xl';

  return (
    <div className="fixed inset-0 bg-navy-950/95 flex items-center justify-center z-50 p-4">
      <div className="text-center space-y-6 max-w-md w-full animate-fade-in">
        <div className="text-7xl mb-2">
          {isTie ? '🤝' : '🏆'}
        </div>

        <h1 className={`${headingSize} font-bold text-gold-400`}>
          {isTie ? "It's a Tie!" : 'Game Over!'}
        </h1>

        {!isTie && winnerDisplay && (
          <p className="text-2xl text-white font-semibold">
            {winnerDisplay} {winningTeam!.players.length > 1 ? 'win' : 'wins'}!
          </p>
        )}

        {/* Final score */}
        <div className="bg-navy-800 rounded-xl p-6 border border-gold-500/30">
          <h3 className="text-cream-300 text-sm mb-3">FINAL SCORE</h3>
          <div className="flex justify-between items-center text-2xl">
            <div className="text-center flex-1">
              <p className="text-cream-400 text-sm">{getTeamDisplayName(state.awayTeam)}</p>
              <p className="text-3xl font-bold text-white">{state.awayScore}</p>
            </div>
            <div className="text-cream-500 text-xl px-4">—</div>
            <div className="text-center flex-1">
              <p className="text-cream-400 text-sm">{getTeamDisplayName(state.homeTeam)}</p>
              <p className="text-3xl font-bold text-white">{state.homeScore}</p>
            </div>
          </div>
        </div>

        {/* Inning-by-inning breakdown */}
        <div className="bg-navy-800/50 rounded-lg p-3 text-sm">
          <div className="flex justify-center gap-1 text-cream-400">
            {state.scores.map((s, i) => (
              <div key={i} className="text-center px-2">
                <div className="text-xs text-cream-500">{i + 1}</div>
                <div>{s.away}</div>
                <div>{s.home}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <button
            onClick={onPlayAgain}
            className={`
              w-full p-4 rounded-xl font-bold text-lg
              bg-gold-500 text-navy-900 hover:bg-gold-400
              active:scale-95 transition-all shadow-lg
            `}
          >
            {kidsMode ? 'Play Again! ⚾' : 'Play Again'}
          </button>
          <button
            onClick={onMainMenu}
            className={`
              w-full p-3 rounded-xl font-bold text-base
              bg-navy-700 text-cream-200 hover:bg-navy-600
              border border-navy-500 transition-all
            `}
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
}
