// ============================================================
// Online Multiplayer — Supabase Realtime Integration
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { GameState, Player, GameSettings, LobbyState } from '../types';

// ============================================================
// Types
// ============================================================

export interface OnlinePlayer {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  status: 'available' | 'in-game' | 'away';
  last_seen: string;
}

export interface GameInvite {
  id: string;
  from_user_id: string;
  to_user_id: string;
  room_id: string | null;
  room_code: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  settings: GameSettings;
  created_at: string;
  // Joined from profiles
  from_profile?: { display_name: string; avatar_url: string | null };
}

// ============================================================
// Presence
// ============================================================

/** Set the current user as online/available */
export async function goOnline(userId: string, displayName: string, avatarUrl?: string | null) {
  if (!supabase) return;

  await supabase.from('online_players').upsert({
    user_id: userId,
    display_name: displayName,
    avatar_url: avatarUrl || null,
    status: 'available',
    last_seen: new Date().toISOString(),
  });
}

/** Update presence heartbeat */
export async function heartbeat(userId: string) {
  if (!supabase) return;

  await supabase
    .from('online_players')
    .update({ last_seen: new Date().toISOString() })
    .eq('user_id', userId);
}

/** Set user status (available, in-game, away) */
export async function setPresenceStatus(userId: string, status: 'available' | 'in-game' | 'away') {
  if (!supabase) return;

  await supabase
    .from('online_players')
    .update({ status, last_seen: new Date().toISOString() })
    .eq('user_id', userId);
}

/** Go offline — remove from online players */
export async function goOffline(userId: string) {
  if (!supabase) return;

  await supabase.from('online_players').delete().eq('user_id', userId);
}

/** Get all currently online players */
export async function getOnlinePlayers(): Promise<OnlinePlayer[]> {
  if (!supabase) return [];

  // Only show players seen in the last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('online_players')
    .select('*')
    .gte('last_seen', fiveMinAgo)
    .order('display_name');

  if (error) {
    console.error('Failed to get online players:', error);
    return [];
  }

  return data || [];
}

/** Subscribe to online players changes */
export function subscribeOnlinePlayers(onUpdate: (players: OnlinePlayer[]) => void) {
  if (!supabase) return null;

  const channel = supabase
    .channel('online-players')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'online_players' },
      async () => {
        const players = await getOnlinePlayers();
        onUpdate(players);
      }
    )
    .subscribe();

  return channel;
}

// ============================================================
// Invites
// ============================================================

/** Send a game invite to another player */
export async function sendInvite(
  fromUserId: string,
  toUserId: string,
  settings: GameSettings
): Promise<string | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_invites')
    .insert({
      from_user_id: fromUserId,
      to_user_id: toUserId,
      status: 'pending',
      settings,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to send invite:', error);
    return null;
  }

  return data.id;
}

/** Get pending invites for the current user */
export async function getPendingInvites(userId: string): Promise<GameInvite[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('game_invites')
    .select('*, from_profile:profiles!game_invites_from_user_id_fkey(display_name, avatar_url)')
    .eq('to_user_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get invites:', error);
    return [];
  }

  return (data || []).map((inv: Record<string, unknown>) => ({
    ...inv,
    from_profile: inv.from_profile as { display_name: string; avatar_url: string | null } | undefined,
  })) as GameInvite[];
}

/** Respond to an invite */
export async function respondToInvite(
  inviteId: string,
  response: 'accepted' | 'declined'
): Promise<GameInvite | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('game_invites')
    .update({ status: response })
    .eq('id', inviteId)
    .select('*')
    .single();

  if (error) {
    console.error('Failed to respond to invite:', error);
    return null;
  }

  return data as GameInvite;
}

/** Subscribe to new invites for the current user */
export function subscribeInvites(userId: string, onInvite: (invites: GameInvite[]) => void) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`invites:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'game_invites',
        filter: `to_user_id=eq.${userId}`,
      },
      async () => {
        const invites = await getPendingInvites(userId);
        onInvite(invites);
      }
    )
    .subscribe();

  return channel;
}

/** Subscribe to invite responses (for the sender to know when accepted) */
export function subscribeInviteResponses(inviteId: string, onResponse: (invite: GameInvite) => void) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`invite-response:${inviteId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'game_invites',
        filter: `id=eq.${inviteId}`,
      },
      (payload) => {
        onResponse(payload.new as GameInvite);
      }
    )
    .subscribe();

  return channel;
}

// ============================================================
// Room Management (existing functions)
// ============================================================

/** Generate a 6-character room code */
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Create a new game room */
export async function createRoom(
  hostId: string,
  settings: GameSettings
): Promise<{ roomCode: string; roomId: string } | null> {
  if (!supabase) return null;

  const roomCode = generateRoomCode();

  const { data, error } = await supabase
    .from('rooms')
    .insert({
      room_code: roomCode,
      host_id: hostId,
      settings: settings,
      status: 'waiting',
    })
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create room:', error);
    return null;
  }

  await supabase.from('room_participants').insert({
    room_id: data.id,
    user_id: hostId,
    role: 'player',
    team: 'home',
  });

  return { roomCode, roomId: data.id };
}

/** Join an existing room by code */
export async function joinRoom(
  roomCode: string,
  userId: string,
  asSpectator = false
): Promise<{ roomId: string; lobby: LobbyState } | null> {
  if (!supabase) return null;

  const { data: room, error } = await supabase
    .from('rooms')
    .select('*')
    .eq('room_code', roomCode.toUpperCase())
    .eq('status', 'waiting')
    .single();

  if (error || !room) {
    console.error('Room not found:', error);
    return null;
  }

  await supabase.from('room_participants').insert({
    room_id: room.id,
    user_id: userId,
    role: asSpectator ? 'spectator' : 'player',
    team: 'away',
  });

  const lobby = await getLobbyState(room.id);
  if (!lobby) return null;

  return { roomId: room.id, lobby };
}

/** Get current lobby state */
export async function getLobbyState(roomId: string): Promise<LobbyState | null> {
  if (!supabase) return null;

  const { data: room } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (!room) return null;

  const { data: participants } = await supabase
    .from('room_participants')
    .select('*, profiles(*)')
    .eq('room_id', roomId);

  if (!participants) return null;

  const players: Player[] = participants
    .filter((p: { role: string }) => p.role === 'player')
    .map((p: { user_id: string; profiles: { display_name: string; avatar_url: string | null } }) => ({
      id: p.user_id,
      name: p.profiles?.display_name || 'Player',
      avatarUrl: p.profiles?.avatar_url || undefined,
    }));

  const spectators: Player[] = participants
    .filter((p: { role: string }) => p.role === 'spectator')
    .map((p: { user_id: string; profiles: { display_name: string; avatar_url: string | null } }) => ({
      id: p.user_id,
      name: p.profiles?.display_name || 'Spectator',
      avatarUrl: p.profiles?.avatar_url || undefined,
    }));

  return {
    roomCode: room.room_code,
    hostId: room.host_id,
    players,
    spectators,
    settings: room.settings as GameSettings,
    gameStarted: room.status === 'playing',
  };
}

/** Subscribe to lobby changes */
export function subscribeLobby(
  roomId: string,
  onUpdate: (lobby: LobbyState) => void
) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`room:${roomId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'room_participants', filter: `room_id=eq.${roomId}` },
      async () => { const lobby = await getLobbyState(roomId); if (lobby) onUpdate(lobby); }
    )
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      async () => { const lobby = await getLobbyState(roomId); if (lobby) onUpdate(lobby); }
    )
    .subscribe();

  return channel;
}

/** Update game state in the room (for real-time sync) */
export async function syncGameState(roomId: string, gameState: GameState) {
  if (!supabase) return;
  await supabase.from('rooms').update({ game_state: gameState, status: 'playing' }).eq('id', roomId);
}

/** Subscribe to game state changes */
export function subscribeGameState(roomId: string, onUpdate: (state: GameState) => void) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`game:${roomId}`)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      (payload) => { const newState = (payload.new as { game_state: GameState }).game_state; if (newState) onUpdate(newState); }
    )
    .subscribe();

  return channel;
}

/** Mark room as finished */
export async function finishRoom(roomId: string) {
  if (!supabase) return;
  await supabase.from('rooms').update({ status: 'finished' }).eq('id', roomId);
}

/** Update participant connection status */
export async function updateConnectionStatus(roomId: string, userId: string, connected: boolean) {
  if (!supabase) return;
  await supabase.from('room_participants').update({ connected, last_seen: new Date().toISOString() }).eq('room_id', roomId).eq('user_id', userId);
}
