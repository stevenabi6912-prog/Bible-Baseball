'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import {
  createRoom, joinRoom, subscribeLobby, getLobbyState,
  goOnline, goOffline, heartbeat, getOnlinePlayers, subscribeOnlinePlayers,
  sendInvite, getPendingInvites, respondToInvite, subscribeInvites,
  subscribeInviteResponses,
  type OnlinePlayer, type GameInvite,
} from '../../lib/online';
import type { LobbyState, GameSettings } from '../../types';
import type { User } from '@supabase/supabase-js';

interface Props {
  onStart: (settings: GameSettings) => void;
  onBack: () => void;
}

export default function OnlineLobby({ onStart, onBack }: Props) {
  const [screen, setScreen] = useState<'auth' | 'lobby' | 'host-settings' | 'waiting' | 'join'>('auth');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Online players
  const [onlinePlayers, setOnlinePlayers] = useState<OnlinePlayer[]>([]);

  // Invites
  const [pendingInvites, setPendingInvites] = useState<GameInvite[]>([]);
  const [sentInviteId, setSentInviteId] = useState<string | null>(null);
  const [inviteTarget, setInviteTarget] = useState<string | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);

  // Room
  const [roomCode, setRoomCode] = useState('');
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);

  // Settings for hosting
  const [innings, setInnings] = useState<3 | 5 | 7 | 9>(3);
  const [kidsMode, setKidsMode] = useState(false);

  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const configured = isSupabaseConfigured();

  // Auth check on mount
  useEffect(() => {
    if (!supabase) { setLoading(false); return; }

    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser(data.user);
        setScreen('lobby');
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setScreen('lobby');
      } else {
        setUser(null);
        setScreen('auth');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Go online + heartbeat when in lobby
  useEffect(() => {
    if (!user || screen === 'auth') return;

    const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Player';
    const avatar = user.user_metadata?.picture || user.user_metadata?.avatar_url || null;

    goOnline(user.id, name, avatar);

    // Heartbeat every 30 seconds
    heartbeatRef.current = setInterval(() => heartbeat(user.id), 30000);

    // Load initial online players
    getOnlinePlayers().then(setOnlinePlayers);

    // Subscribe to online player changes
    const channel = subscribeOnlinePlayers(setOnlinePlayers);

    // Subscribe to incoming invites
    const inviteChannel = subscribeInvites(user.id, setPendingInvites);
    getPendingInvites(user.id).then(setPendingInvites);

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      goOffline(user.id);
      if (channel && supabase) supabase.removeChannel(channel);
      if (inviteChannel && supabase) supabase.removeChannel(inviteChannel);
    };
  }, [user, screen]);

  // Subscribe to lobby updates
  useEffect(() => {
    if (!roomId || !supabase) return;
    const channel = subscribeLobby(roomId, setLobby);
    return () => { if (channel && supabase) supabase.removeChannel(channel); };
  }, [roomId]);

  const signInWithGoogle = async () => {
    if (!supabase) return;
    setError('');
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
    if (err) setError(err.message);
  };

  const signOut = async () => {
    if (!supabase || !user) return;
    await goOffline(user.id);
    await supabase.auth.signOut();
    setUser(null);
    setScreen('auth');
  };

  const handleInvitePlayer = async (targetUserId: string) => {
    if (!user) return;
    setError('');
    setInviteTarget(targetUserId);
    setWaitingForResponse(true);

    // Create room first
    const settings: GameSettings = { mode: 'online-multiplayer', innings, kidsMode };
    const room = await createRoom(user.id, settings);
    if (!room) {
      setError('Failed to create room');
      setWaitingForResponse(false);
      return;
    }

    setRoomId(room.roomId);

    // Send invite with room info
    const inviteId = await sendInvite(user.id, targetUserId, settings);
    if (!inviteId) {
      setError('Failed to send invite');
      setWaitingForResponse(false);
      return;
    }

    setSentInviteId(inviteId);

    // Update the invite with room info
    if (supabase) {
      if (supabase) await supabase.from('game_invites').update({
        room_id: room.roomId,
        room_code: room.roomCode,
      }).eq('id', inviteId);
    }

    // Subscribe to invite response
    const channel = subscribeInviteResponses(inviteId, async (invite) => {
      if (invite.status === 'accepted') {
        setWaitingForResponse(false);
        const lobbyState = await getLobbyState(room.roomId);
        if (lobbyState) setLobby(lobbyState);
        setScreen('waiting');
      } else if (invite.status === 'declined') {
        setWaitingForResponse(false);
        setError('Invite was declined');
        setSentInviteId(null);
      }
      if (channel && supabase) supabase.removeChannel(channel);
    });
  };

  const handleAcceptInvite = async (invite: GameInvite) => {
    if (!user) return;

    await respondToInvite(invite.id, 'accepted');

    // Join the room
    if (invite.room_code) {
      const result = await joinRoom(invite.room_code, user.id);
      if (result) {
        setRoomId(result.roomId);
        setLobby(result.lobby);
        setScreen('waiting');
      }
    }
  };

  const handleDeclineInvite = async (invite: GameInvite) => {
    await respondToInvite(invite.id, 'declined');
  };

  const handleCreateRoom = async () => {
    if (!user) return;
    setError('');
    const settings: GameSettings = { mode: 'online-multiplayer', innings, kidsMode };
    const result = await createRoom(user.id, settings);
    if (!result) {
      setError('Failed to create room. Please try again.');
      return;
    }
    setRoomId(result.roomId);
    const lobbyState = await getLobbyState(result.roomId);
    if (lobbyState) setLobby(lobbyState);
    setScreen('waiting');
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
    setScreen('waiting');
  };

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email || 'Player';
  const otherPlayers = onlinePlayers.filter(p => p.user_id !== user?.id);

  // ── Not configured ──
  if (!configured) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="text-5xl">🌐</div>
          <h2 className="text-2xl font-bold text-gold-400">Online Multiplayer</h2>
          <div className="bg-navy-800 rounded-lg p-6 border border-navy-600">
            <p className="text-cream-200">Online multiplayer requires Supabase to be configured.</p>
          </div>
          <button onClick={onBack} className="text-cream-400 hover:text-white">← Back to Menu</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex items-center justify-center">
        <p className="text-cream-300 text-lg">Loading...</p>
      </div>
    );
  }

  // ── Auth screen ──
  if (screen === 'auth' || !user) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <button onClick={onBack} className="text-cream-400 hover:text-white self-start mb-6">← Back</button>
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

  // ── Main Lobby — shows online players, invites, host/join options ──
  if (screen === 'lobby') {
    return (
      <div className="min-h-screen bg-navy-950 p-6">
        <button onClick={onBack} className="text-cream-400 hover:text-white mb-4">← Back</button>

        <div className="max-w-md mx-auto space-y-5">
          <h2 className="text-2xl font-bold text-gold-400 text-center">Online Multiplayer</h2>

          {/* Signed in as */}
          <div className="bg-navy-800 rounded-lg p-3 border border-navy-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {user.user_metadata?.picture && (
                <img src={user.user_metadata.picture} alt="" className="w-8 h-8 rounded-full" />
              )}
              <span className="text-cream-200 text-sm">{displayName}</span>
              <span className="text-green-400 text-xs">● online</span>
            </div>
            <button onClick={signOut} className="text-cream-500 text-xs hover:text-cream-300">Sign out</button>
          </div>

          {/* Incoming invites */}
          {pendingInvites.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-gold-400 font-semibold text-sm">📩 Game Invites</h3>
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">
                      {invite.from_profile?.display_name || 'Someone'}
                    </span>
                    <span className="text-cream-400 text-sm">wants to play!</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvite(invite)}
                      className="px-3 py-1.5 bg-navy-600 text-cream-300 rounded-lg text-sm hover:bg-navy-500"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Online Players */}
          <div>
            <h3 className="text-cream-300 font-semibold text-sm mb-2">
              Players Online ({otherPlayers.length})
            </h3>
            {otherPlayers.length === 0 ? (
              <div className="bg-navy-800 rounded-lg p-4 border border-navy-600 text-center">
                <p className="text-cream-500 text-sm">No other players online right now</p>
                <p className="text-cream-600 text-xs mt-1">Share the link to invite friends!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {otherPlayers.map((player) => (
                  <div key={player.user_id} className="bg-navy-800 rounded-lg p-3 border border-navy-600 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {player.avatar_url && (
                        <img src={player.avatar_url} alt="" className="w-8 h-8 rounded-full" />
                      )}
                      <div>
                        <p className="text-white text-sm font-medium">{player.display_name}</p>
                        <p className={`text-xs ${player.status === 'available' ? 'text-green-400' : 'text-yellow-400'}`}>
                          {player.status === 'available' ? '● Available' : '● In Game'}
                        </p>
                      </div>
                    </div>
                    {player.status === 'available' && (
                      <button
                        onClick={() => handleInvitePlayer(player.user_id)}
                        disabled={waitingForResponse}
                        className="px-4 py-2 bg-gold-500 text-navy-900 rounded-lg text-sm font-bold hover:bg-gold-400 disabled:opacity-50 active:scale-95 transition-all"
                      >
                        {waitingForResponse && inviteTarget === player.user_id ? 'Inviting...' : 'Invite'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Waiting for invite response */}
          {waitingForResponse && (
            <div className="bg-navy-800 rounded-lg p-4 border border-gold-500/30 text-center animate-fade-in">
              <p className="text-cream-200">Waiting for response...</p>
              <div className="flex justify-center gap-1 mt-2">
                <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-navy-600" />
            <span className="text-cream-500 text-xs">OR</span>
            <div className="flex-1 h-px bg-navy-600" />
          </div>

          {/* Host / Join buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setScreen('host-settings')}
              className="p-4 rounded-xl bg-green-700 hover:bg-green-600 text-white font-bold text-base shadow-lg border-2 border-green-500 active:scale-95 transition-all"
            >
              Host Game
            </button>
            <button
              onClick={() => setScreen('join')}
              className="p-4 rounded-xl bg-blue-700 hover:bg-blue-600 text-white font-bold text-base shadow-lg border-2 border-blue-500 active:scale-95 transition-all"
            >
              Join Code
            </button>
          </div>

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Host settings ──
  if (screen === 'host-settings') {
    return (
      <div className="min-h-screen bg-navy-950 p-6">
        <button onClick={() => setScreen('lobby')} className="text-cream-400 hover:text-white mb-6">← Back</button>
        <div className="max-w-md mx-auto space-y-6 text-center">
          <h2 className="text-2xl font-bold text-gold-400">Host a Game</h2>
          <div>
            <label className="block text-cream-300 font-semibold mb-2">Innings</label>
            <div className="flex gap-2">
              {([3, 5, 7, 9] as const).map((n) => (
                <button key={n} onClick={() => setInnings(n)}
                  className={`flex-1 p-3 rounded-lg font-bold text-lg transition-colors ${
                    innings === n ? 'bg-gold-500 text-navy-900' : 'bg-navy-800 text-cream-300 hover:bg-navy-700 border border-navy-600'
                  }`}
                >{n}</button>
              ))}
            </div>
          </div>
          <div className="flex items-center justify-between bg-navy-800 rounded-lg p-4 border border-navy-600">
            <span className="text-white font-semibold">Kids Mode</span>
            <button onClick={() => setKidsMode(!kidsMode)}
              className={`w-14 h-8 rounded-full transition-colors relative ${kidsMode ? 'bg-gold-500' : 'bg-navy-600'}`}>
              <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-transform ${kidsMode ? 'translate-x-7' : 'translate-x-1'}`} />
            </button>
          </div>
          <button onClick={handleCreateRoom}
            className="w-full p-5 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 active:scale-95 transition-all">
            Create Room
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>
      </div>
    );
  }

  // ── Join by code ──
  if (screen === 'join') {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center p-6">
        <button onClick={() => setScreen('lobby')} className="text-cream-400 hover:text-white self-start mb-6">← Back</button>
        <div className="max-w-sm w-full space-y-4 text-center">
          <h2 className="text-2xl font-bold text-gold-400">Join a Game</h2>
          <input type="text" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter Room Code" maxLength={6}
            className="w-full p-4 rounded-lg bg-navy-800 border border-navy-600 text-white text-center text-2xl tracking-widest placeholder-cream-500 focus:border-gold-500 focus:outline-none uppercase"
          />
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button onClick={handleJoinRoom} disabled={roomCode.length !== 6}
            className="w-full p-4 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
            Join
          </button>
        </div>
      </div>
    );
  }

  // ── Waiting room / Lobby with players ──
  return (
    <div className="min-h-screen bg-navy-950 p-6">
      <button onClick={() => { setScreen('lobby'); setLobby(null); setRoomId(null); }}
        className="text-cream-400 hover:text-white mb-6">← Back</button>
      <div className="max-w-md mx-auto space-y-6 text-center">
        <h2 className="text-2xl font-bold text-gold-400">Game Lobby</h2>

        {lobby && (
          <>
            <div className="bg-navy-800 rounded-xl p-6 border border-gold-500/30">
              <p className="text-cream-400 text-sm">Room Code</p>
              <p className="text-4xl font-bold text-gold-400 tracking-widest mt-1">{lobby.roomCode}</p>
              <p className="text-cream-500 text-sm mt-2">Share this code with other players</p>
            </div>

            <div className="bg-navy-800 rounded-lg p-4 border border-navy-600">
              <p className="text-cream-300 font-semibold mb-2">Players ({lobby.players.length})</p>
              {lobby.players.map((p) => (
                <div key={p.id} className="flex items-center gap-2 py-1">
                  {p.avatarUrl && <img src={p.avatarUrl} alt="" className="w-6 h-6 rounded-full" />}
                  <span className="text-white">{p.name}</span>
                  {p.id === lobby.hostId && (
                    <span className="text-xs bg-gold-500 text-navy-900 px-2 py-0.5 rounded">Host</span>
                  )}
                </div>
              ))}
            </div>

            {user && lobby.hostId === user.id && (
              <button onClick={() => onStart(lobby.settings)} disabled={lobby.players.length < 2}
                className="w-full p-5 rounded-xl bg-gold-500 text-navy-900 font-bold text-xl hover:bg-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
                Start Game ({lobby.players.length}/6 players)
              </button>
            )}

            {user && lobby.hostId !== user.id && (
              <p className="text-cream-400">Waiting for host to start the game...</p>
            )}
          </>
        )}

        {!lobby && (
          <div className="text-center">
            <p className="text-cream-400">Setting up room...</p>
            <div className="flex justify-center gap-1 mt-2">
              <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gold-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
