// ============================================================
// Online Multiplayer — Supabase Realtime Integration
// ============================================================

import { supabase, isSupabaseConfigured } from './supabase';
import type { GameState, Player, GameSettings, LobbyState } from '../types';

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

  // Join as host player
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

  // Add participant
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
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'room_participants',
        filter: `room_id=eq.${roomId}`,
      },
      async () => {
        const lobby = await getLobbyState(roomId);
        if (lobby) onUpdate(lobby);
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      async () => {
        const lobby = await getLobbyState(roomId);
        if (lobby) onUpdate(lobby);
      }
    )
    .subscribe();

  return channel;
}

/** Update game state in the room (for real-time sync) */
export async function syncGameState(roomId: string, gameState: GameState) {
  if (!supabase) return;

  await supabase
    .from('rooms')
    .update({ game_state: gameState, status: 'playing' })
    .eq('id', roomId);
}

/** Subscribe to game state changes */
export function subscribeGameState(
  roomId: string,
  onUpdate: (state: GameState) => void
) {
  if (!supabase) return null;

  const channel = supabase
    .channel(`game:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'rooms',
        filter: `id=eq.${roomId}`,
      },
      (payload) => {
        const newState = (payload.new as { game_state: GameState }).game_state;
        if (newState) onUpdate(newState);
      }
    )
    .subscribe();

  return channel;
}

/** Mark room as finished */
export async function finishRoom(roomId: string) {
  if (!supabase) return;

  await supabase
    .from('rooms')
    .update({ status: 'finished' })
    .eq('id', roomId);
}

/** Update participant connection status */
export async function updateConnectionStatus(
  roomId: string,
  userId: string,
  connected: boolean
) {
  if (!supabase) return;

  await supabase
    .from('room_participants')
    .update({ connected, last_seen: new Date().toISOString() })
    .eq('room_id', roomId)
    .eq('user_id', userId);
}
