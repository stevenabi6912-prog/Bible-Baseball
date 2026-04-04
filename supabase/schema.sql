-- ============================================================
-- Bible Baseball — Supabase Database Schema
-- Run this in the Supabase SQL Editor to set up online multiplayer
-- ============================================================

-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- Player profiles (extends Supabase Auth)
create table if not exists profiles (
  id uuid references auth.users on delete cascade primary key,
  display_name text not null default 'Player',
  avatar_url text,
  games_played integer not null default 0,
  games_won integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table profiles enable row level security;

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert own profile"
  on profiles for insert with check (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Player'),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', null)
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Game rooms / lobbies
create table if not exists rooms (
  id uuid primary key default uuid_generate_v4(),
  room_code text not null unique,
  host_id uuid references profiles(id) not null,
  settings jsonb not null default '{}',
  game_state jsonb,
  status text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table rooms enable row level security;

create policy "Rooms are viewable by participants"
  on rooms for select using (true);

create policy "Hosts can update their rooms"
  on rooms for update using (auth.uid() = host_id);

create policy "Authenticated users can create rooms"
  on rooms for insert with check (auth.uid() = host_id);

-- Room participants
create table if not exists room_participants (
  id uuid primary key default uuid_generate_v4(),
  room_id uuid references rooms(id) on delete cascade not null,
  user_id uuid references profiles(id) not null,
  role text not null default 'player' check (role in ('player', 'spectator')),
  team text check (team in ('home', 'away')),
  connected boolean not null default true,
  last_seen timestamptz not null default now(),
  joined_at timestamptz not null default now(),
  unique(room_id, user_id)
);

alter table room_participants enable row level security;

create policy "Participants are viewable by room members"
  on room_participants for select using (true);

create policy "Users can manage their own participation"
  on room_participants for insert with check (auth.uid() = user_id);

create policy "Users can update their own participation"
  on room_participants for update using (auth.uid() = user_id);

-- Enable Realtime for rooms and participants
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table room_participants;

-- Indexes
create index if not exists idx_rooms_code on rooms(room_code);
create index if not exists idx_rooms_status on rooms(status);
create index if not exists idx_participants_room on room_participants(room_id);
create index if not exists idx_participants_user on room_participants(user_id);

-- Function to generate room codes
create or replace function generate_room_code()
returns text as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
  i integer;
begin
  for i in 1..6 loop
    code := code || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return code;
end;
$$ language plpgsql;
