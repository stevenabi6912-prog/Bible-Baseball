'use client';

import { useState } from 'react';
import type { GameMode, GameSettings, ComputerDifficulty } from '../../types';

interface Props {
  mode: GameMode;
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
}

export default function GameSetup({ mode, onStart, onBack }: Props) {
  const [innings, setInnings] = useState<3 | 5 | 7 | 9>(3);
  const [kidsMode, setKidsMode] = useState(false);
  const [difficulty, setDifficulty] = useState<ComputerDifficulty>('medium');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState<string[]>(['', '']);

  const addPlayer = () => {
    if (players.length < 6) {
      setPlayers([...players, '']);
    }
  };

  const removePlayer = (index: number) => {
    if (players.length > 2) {
      setPlayers(players.filter((_, i) => i !== index));
    }
  };

  const updatePlayer = (index: number, name: string) => {
    const updated = [...players];
    updated[index] = name;
    setPlayers(updated);
  };

  const canStart = () => {
    if (mode === 'vs-computer') return playerName.trim().length > 0;
    if (mode === 'local-multiplayer') return players.every((p) => p.trim().length > 0);
    return true;
  };

  const handleStart = () => {
    const settings: GameSettings = {
      mode,
      innings,
      kidsMode,
      computerDifficulty: mode === 'vs-computer' ? difficulty : undefined,
      players:
        mode === 'vs-computer'
          ? [{ name: playerName.trim() }]
          : mode === 'local-multiplayer'
          ? players.map((p) => ({ name: p.trim() }))
          : undefined,
    };
    onStart(settings);
  };

  return (
    <div className="min-h-screen bg-navy-950 p-6 flex flex-col">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-cream-400 hover:text-white mb-6 self-start flex items-center gap-2"
      >
        ← Back
      </button>

      <h2 className="text-3xl font-bold text-gold-400 text-center mb-8">
        {mode === 'vs-computer'
          ? 'vs. The Pharisee'
          : mode === 'local-multiplayer'
          ? 'Local Multiplayer'
          : 'Online Multiplayer'}
      </h2>

      <div className="max-w-md mx-auto w-full space-y-6">
        {/* Player name(s) */}
        {mode === 'vs-computer' && (
          <div>
            <label className="block text-cream-300 font-semibold mb-2">Your Name</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name"
              maxLength={20}
              className="w-full p-3 rounded-lg bg-navy-800 border border-navy-600 text-white placeholder-cream-500 focus:border-gold-500 focus:outline-none"
            />
          </div>
        )}

        {mode === 'local-multiplayer' && (
          <div>
            <label className="block text-cream-300 font-semibold mb-2">
              Players ({players.length}/6)
            </label>
            <div className="space-y-2">
              {players.map((name, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => updatePlayer(i, e.target.value)}
                    placeholder={`Player ${i + 1}`}
                    maxLength={20}
                    className="flex-1 p-3 rounded-lg bg-navy-800 border border-navy-600 text-white placeholder-cream-500 focus:border-gold-500 focus:outline-none"
                  />
                  {players.length > 2 && (
                    <button
                      onClick={() => removePlayer(i)}
                      className="text-red-400 hover:text-red-300 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            {players.length < 6 && (
              <button
                onClick={addPlayer}
                className="mt-2 text-gold-400 hover:text-gold-300 text-sm font-semibold"
              >
                + Add Player
              </button>
            )}
            <p className="text-cream-500 text-xs mt-1">
              First half will be visitors, second half will be home team
            </p>
          </div>
        )}

        {mode === 'online-multiplayer' && (
          <div className="bg-navy-800 rounded-lg p-4 border border-navy-600 text-center">
            <p className="text-cream-300">
              Online multiplayer requires Supabase configuration.
            </p>
            <p className="text-cream-500 text-sm mt-2">
              See the README for setup instructions.
            </p>
          </div>
        )}

        {/* Innings */}
        <div>
          <label className="block text-cream-300 font-semibold mb-2">Innings</label>
          <div className="flex gap-2">
            {([3, 5, 7, 9] as const).map((n) => (
              <button
                key={n}
                onClick={() => setInnings(n)}
                className={`flex-1 p-3 rounded-lg font-bold text-lg transition-colors ${
                  innings === n
                    ? 'bg-gold-500 text-navy-900'
                    : 'bg-navy-800 text-cream-300 hover:bg-navy-700 border border-navy-600'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Computer difficulty */}
        {mode === 'vs-computer' && (
          <div>
            <label className="block text-cream-300 font-semibold mb-2">Pharisee Difficulty</label>
            <div className="flex gap-2">
              {(['easy', 'medium', 'hard'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`flex-1 p-3 rounded-lg font-bold capitalize transition-colors ${
                    difficulty === d
                      ? 'bg-gold-500 text-navy-900'
                      : 'bg-navy-800 text-cream-300 hover:bg-navy-700 border border-navy-600'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kids mode */}
        <div className="flex items-center justify-between bg-navy-800 rounded-lg p-4 border border-navy-600">
          <div>
            <p className="text-white font-semibold">Kids Mode</p>
            <p className="text-cream-500 text-sm">Simpler questions, bigger text</p>
          </div>
          <button
            onClick={() => setKidsMode(!kidsMode)}
            className={`w-14 h-8 rounded-full transition-colors relative ${
              kidsMode ? 'bg-gold-500' : 'bg-navy-600'
            }`}
          >
            <div
              className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${
                kidsMode ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={!canStart() || mode === 'online-multiplayer'}
          className={`
            w-full p-5 rounded-xl font-bold text-xl mt-4
            transition-all active:scale-95 shadow-lg
            ${
              canStart() && mode !== 'online-multiplayer'
                ? 'bg-gold-500 text-navy-900 hover:bg-gold-400'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          Play Ball! ⚾
        </button>
      </div>
    </div>
  );
}
