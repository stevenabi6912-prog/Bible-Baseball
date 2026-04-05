-- ============================================================
-- Bible Baseball — Presence & Invite System
-- Run this in the Supabase SQL Editor AFTER the initial schema
-- ============================================================

-- Online presence tracking
create table if not exists online_players (
  user_id uuid references profiles(id) on delete cascade primary key,
  display_name text not null default 'Player',
  avatar_url text,
  status text not null default 'available' check (status in ('available', 'in-game', 'away')),
  last_seen timestamptz not null default now()
);

alter table online_players enable row level security;

create policy "Online players are viewable by everyone"
  on online_players for select using (true);

create policy "Users can insert their own presence"
  on online_players for insert with check (auth.uid() = user_id);

create policy "Users can update their own presence"
  on online_players for update using (auth.uid() = user_id);

create policy "Users can delete their own presence"
  on online_players for delete using (auth.uid() = user_id);

-- Game invites
create table if not exists game_invites (
  id uuid primary key default uuid_generate_v4(),
  from_user_id uuid references profiles(id) not null,
  to_user_id uuid references profiles(id) not null,
  room_id uuid references rooms(id) on delete cascade,
  room_code text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'expired')),
  settings jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table game_invites enable row level security;

create policy "Users can see invites sent to them"
  on game_invites for select using (auth.uid() = to_user_id or auth.uid() = from_user_id);

create policy "Users can create invites"
  on game_invites for insert with check (auth.uid() = from_user_id);

create policy "Invited users can update invite status"
  on game_invites for update using (auth.uid() = to_user_id or auth.uid() = from_user_id);

-- Enable Realtime
alter publication supabase_realtime add table online_players;
alter publication supabase_realtime add table game_invites;

-- Indexes
create index if not exists idx_online_players_status on online_players(status);
create index if not exists idx_invites_to on game_invites(to_user_id, status);
create index if not exists idx_invites_from on game_invites(from_user_id, status);

-- Auto-cleanup: remove stale presence entries older than 5 minutes
-- (Call this periodically or use a Supabase Edge Function)
create or replace function cleanup_stale_presence()
returns void as $$
begin
  delete from online_players where last_seen < now() - interval '5 minutes';
  update game_invites set status = 'expired' where status = 'pending' and created_at < now() - interval '5 minutes';
end;
$$ language plpgsql security definer;
