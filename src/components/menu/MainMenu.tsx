'use client';

import type { GameMode } from '../../types';

interface Props {
  onSelectMode: (mode: GameMode) => void;
}

export default function MainMenu({ onSelectMode }: Props) {
  return (
    <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
      {/* Logo / Title */}
      <div className="text-center mb-10">
        <div className="text-6xl mb-3">⚾</div>
        <h1 className="text-5xl font-extrabold text-gold-400 tracking-tight leading-tight">
          Bible
          <br />
          Baseball
        </h1>
        <p className="text-cream-300 mt-2 text-lg">Faith Baptist Church of Chelsea</p>
      </div>

      {/* Game mode buttons */}
      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => onSelectMode('vs-computer')}
          className="w-full p-5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-xl shadow-lg border-2 border-green-500 active:scale-95 transition-all"
        >
          <span className="text-2xl mr-2">🧔</span>
          vs. The Pharisee
        </button>

        <button
          onClick={() => onSelectMode('local-multiplayer')}
          className="w-full p-5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xl shadow-lg border-2 border-blue-500 active:scale-95 transition-all"
        >
          <span className="text-2xl mr-2">👥</span>
          Local Multiplayer
        </button>

        <button
          onClick={() => onSelectMode('online-multiplayer')}
          className="w-full p-5 rounded-xl bg-purple-700 hover:bg-purple-600 text-white font-bold text-xl shadow-lg border-2 border-purple-500 active:scale-95 transition-all"
        >
          <span className="text-2xl mr-2">🌐</span>
          Online Multiplayer
        </button>
      </div>

      {/* Footer */}
      <p className="text-cream-500 text-sm mt-10">KJV Bible Edition</p>
    </div>
  );
}
