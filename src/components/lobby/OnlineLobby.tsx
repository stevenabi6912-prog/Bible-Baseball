'use client';

import { useState, useEffect } from 'react';
import { isSupabaseConfigured } from '../../lib/supabase';
import { createRoom, joinRoom, subscribeLobby } from '../../lib/online';
import type { LobbyState, GameSettings } from '../../types';

interface Props {
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
}

export default function OnlineLobby({ onStart, onBack }: Props) {
  const [screen, setScreen] = useState<'choice' | 'host' | 'join'>('choice');
  const [roomCode, setRoomCode] = useState('');
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [error, setError] = useState('');
  const [innings, setInnings] = useState<3 | 5 | 7 | 9>(3);
  const [kidsMode, setKidsMode] = useState(false);

  const configured = isSupabaseConfigured();

  useEffect(() => {
    // Cleanup subscriptions on unmount
    return () => {};
  }, []);

  if (!configured) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🌐</div>
          <h2 className="text-2xl font-bold text-gold-400">Online Multiplayer</h2>
          <div className="bg-navy-800 rounded-lg p-6 border border-navy-600">
            <p className="text-cream-200 mb-3">
              Online multiplayer requires Supabase to be configured.
            </p>
            <p className="text-cream-400 text-sm">
              Set up your Supabase project and add your credentials to <code className="bg-navy-700 px-1 rounded">.env.local</code>.
              See the README for detailed instructions.
            </p>
          </div>
          <button
            onClick={onBack}
            className="text-cream-400 hover:text-white flex items-center gap-2 mx-auto"
          >
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'choice') {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <button onClick={onBack} className="text-cream-400 hover:text-white self-start mb-6">
          ← Back
        </button>
        <div className="max-w-sm w-full space-y-4 text-center">
          <div className="text-5xl mb-2">🌐</div>
          <h2 className="text-3xl font-bold text-gold-400">Online Multiplayer</h2>
          <button
            onClick={() => setScreen('host')}
            className="w-full p-5 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-xl shadow-lg border-2 border-green-500 active:scale-95 transition-all"
          >
            Host a Game
          </button>
          <button
            onClick={() => setScreen('join')}
            className="w-full p-5 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-xl shadow-lg border-2 border-blue-500 active:scale-95 transition-all"
          >
            Join a Game
          </button>
        </div>
      </div>
    );
  }

  if (screen === 'join') {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <button onClick={() => setScreen('choice')} className="text-cream-400 hover:text-white self-start mb-6">
          ← Back
        </button>
        <div className="max-w-sm w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold text-gold-400">Join a Game</h2>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter Room Code"
            maxLength={6}
            className="w-full p-4 rounded-lg bg-navy-800 border border-navy-600 text-white text-center text-2xl tracking-widest placeholder-cream-500 focus:border-gold-500 focus:outline-none uppercase"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            onClick={async () => {
              setError('');
              // Join logic would go here with actual user ID from auth
              setError('Sign in first to join online games.');
            }}
            disabled={roomCode.length !== 6}
            className="w-full p-4 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  // Host screen
  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <button onClick={() => setScreen('choice')} className="text-cream-400 hover:text-white mb-6">
        ← Back
      </button>
      <div className="max-w-md mx-auto space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gold-400">Host a Game</h2>

        {lobby ? (
          <>
            <div className="bg-navy-800 rounded-xl p-6 border border-gold-500/30">
              <p className="text-cream-400 text-sm">Room Code</p>
              <p className="text-4xl font-bold text-gold-400 tracking-widest mt-1">
                {lobby.roomCode}
              </p>
              <p className="text-cream-500 text-sm mt-2">Share this code with other players</p>
            </div>

            <div className="bg-navy-800 rounded-lg p-4 border border-navy-600">
              <p className="text-cream-300 font-semibold mb-2">
                Players ({lobby.players.length})
              </p>
              {lobby.players.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  <span className="text-white">{p.name}</span>
                  {p.id === lobby.hostId && (
                    <span className="text-xs bg-gold-500 text-navy-900 px-2 py-0.5 rounded">Host</span>
                  )}
                </div>
              ))}
              {lobby.spectators.length > 0 && (
                <>
                  <p className="text-cream-300 font-semibold mt-3 mb-1">
                    Spectators ({lobby.spectators.length})
                  </p>
                  {lobby.spectators.map((s) => (
                    <div key={s.id} className="text-cream-400 py-1">{s.name}</div>
                  ))}
                </>
              )}
            </div>

            <button
              onClick={() => onStart(lobby.settings)}
              disabled={lobby.players.length < 2}
              className="w-full p-5 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Start Game ({lobby.players.length}/6 players)
            </button>
          </>
        ) : (
          <div className="space-y-4">
            {/* Settings */}
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

            <div className="flex items-center justify-between bg-navy-800 rounded-lg p-4 border border-navy-600">
              <span className="text-white font-semibold">Kids Mode</span>
              <button
                onClick={() => setKidsMode(!kidsMode)}
                className={`w-14 h-8 rounded-full transition-colors relative ${kidsMode ? 'bg-gold-500' : 'bg-navy-600'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${kidsMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            <button
              onClick={async () => {
                // Would create room with actual user ID from auth
                setError('Sign in first to host online games.');
              }}
              className="w-full p-5 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 transition-all"
            >
              Create Room
            </button>
            {error && <p className="text-red-400 text-sm">{error}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
