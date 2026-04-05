'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { createRoom, joinRoom, subscribeLobby, getLobbyState } from '../../lib/online';
import type { LobbyState, GameSettings } from '../../types';
import type { User } from '@supabase/supabase-js';

interface Props {
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
}

export default function OnlineLobby({ onStart, onBack }: Props) {
  const [screen, setScreen] = useState<'auth' | 'choice' | 'host' | 'join'>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomCode, setRoomCode] = useState('');
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [innings, setInnings] = useState<3 | 5 | 7 | 9>(3);
  const [kidsMode, setKidsMode] = useState(false);

  const configured = isSupabaseConfigured();

  // Check auth state on mount
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setScreen('choice');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setScreen('choice');
      } else {
        setUser(null);
        setScreen('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Subscribe to lobby updates
  useEffect(() => {
    if (!roomId || !supabase) return;

    const channel = subscribeLobby(roomId, (updatedLobby) => {
      setLobby(updatedLobby);
    });

    return () => {
      if (channel && supabase) supabase.removeChannel(channel);
    };
  }, [roomId]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError('');
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      },
    });
    if (error) setError(error.message);
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setScreen('auth');
    setLobby(null);
    setRoomId(null);
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setError('');

    const result = await createRoom(user.id, {
      mode: 'online-multiplayer',
      innings,
      kidsMode,
    });

    if (!result) {
      setError('Failed to create room. Please try again.');
      return;
    }

    setRoomId(result.roomId);
    const lobbyState = await getLobbyState(result.roomId);
    if (lobbyState) setLobby(lobbyState);
  };

  const handleJoinRoom = async () => {
    if (!user) return;
    setError('');

    const result = await joinRoom(roomCode, user.id);
    if (!result) {
      setError('Room not found or game already started.');
      return;
    }

    setRoomId(result.roomId);
    setLobby(result.lobby);
    setScreen('host'); // Reuse host screen to show lobby
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Player';

  // Not configured
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
          <button onClick={onBack} className="text-cream-400 hover:text-white flex items-center gap-2 mx-auto">
            ← Back to Menu
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <p className="text-cream-300 text-lg">Loading...</p>
      </div>
    );
  }

  // Auth screen — sign in
  if (screen === 'auth' || !user) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <button onClick={onBack} className="text-cream-400 hover:text-white self-start mb-6">
          ← Back
        </button>
        <div className="max-w-sm w-full space-y-6 text-center">
          <div className="text-5xl mb-2">🌐</div>
          <h2 className="text-3xl font-bold text-gold-400">Online Multiplayer</h2>
          <p className="text-cream-300">Sign in to play online with friends</p>

          <button
            onClick={signInWithGoogle}
            className="w-full p-4 rounded-xl bg-white text-gray-800 font-bold text-lg shadow-lg flex items-center justify-center gap-3 hover:bg-gray-100 active:scale-95 transition-all"
          >
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  // Choice screen — host or join
  if (screen === 'choice') {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <button onClick={onBack} className="text-cream-400 hover:text-white self-start mb-6">
          ← Back
        </button>
        <div className="max-w-sm w-full space-y-4 text-center">
          <div className="text-5xl mb-2">🌐</div>
          <h2 className="text-3xl font-bold text-gold-400">Online Multiplayer</h2>

          {/* Signed in as */}
          <div className="bg-navy-800 rounded-lg p-3 border border-navy-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {user.user_metadata?.picture && (
                <img
                  src={user.user_metadata.picture}
                  alt=""
                  className="w-8 h-8 rounded-full"
                />
              )}
              <span className="text-cream-200 text-sm">{displayName}</span>
            </div>
            <button
              onClick={signOut}
              className="text-cream-500 text-xs hover:text-cream-300"
            >
              Sign out
            </button>
          </div>

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

  // Join screen
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
            onClick={handleJoinRoom}
            disabled={roomCode.length !== 6}
            className="w-full p-4 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Join
          </button>
        </div>
      </div>
    );
  }

  // Host screen (also used after joining to show lobby)
  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <button onClick={() => { setScreen('choice'); setLobby(null); setRoomId(null); }} className="text-cream-400 hover:text-white mb-6">
        ← Back
      </button>
      <div className="max-w-md mx-auto space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gold-400">
          {lobby ? 'Game Lobby' : 'Host a Game'}
        </h2>

        {lobby ? (
          <>
            {/* Room code display */}
            <div className="bg-navy-800 rounded-xl p-6 border border-gold-500/30">
              <p className="text-cream-400 text-sm">Room Code</p>
              <p className="text-4xl font-bold text-gold-400 tracking-widest mt-1">
                {lobby.roomCode}
              </p>
              <p className="text-cream-500 text-sm mt-2">Share this code with other players</p>
            </div>

            {/* Players list */}
            <div className="bg-navy-800 rounded-lg p-4 border border-navy-600">
              <p className="text-cream-300 font-semibold mb-2">
                Players ({lobby.players.length})
              </p>
              {lobby.players.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  {p.avatarUrl && (
                    <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full" />
                  )}
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

            {/* Start button (host only) */}
            {user && lobby.hostId === user.id && (
              <button
                onClick={() => onStart(lobby.settings)}
                disabled={lobby.players.length < 2}
                className="w-full p-5 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Start Game ({lobby.players.length}/6 players)
              </button>
            )}

            {user && lobby.hostId !== user.id && (
              <p className="text-cream-400">Waiting for host to start the game...</p>
            )}
          </>
        ) : (
          <div className="space-y-4">
            {/* Innings selector */}
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

            {/* Kids mode */}
            <div className="flex items-center justify-between bg-navy-800 rounded-lg p-4 border border-navy-600">
              <span className="text-white font-semibold">Kids Mode</span>
              <button
                onClick={() => setKidsMode(!kidsMode)}
                className={`w-14 h-8 rounded-full transition-colors relative ${kidsMode ? 'bg-gold-500' : 'bg-navy-600'}`}
              >
                <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${kidsMode ? 'translate-x-7' : 'translate-x-1'}`} />
              </button>
            </div>

            {/* Create room button */}
            <button
              onClick={handleCreateRoom}
              className="w-full p-5 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 active:scale-95 transition-all"
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
