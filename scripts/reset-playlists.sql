-- WARNING: This removes playlist metadata only.
-- Sermon rows are NOT deleted.

drop table if exists public.playlist_items;
drop table if exists public.playlists;

create table public.playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_key text,
  created_at timestamptz not null default now()
);

create table public.playlist_items (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.playlists(id) on delete cascade,
  sermon_id uuid not null references public.sermons(id) on delete cascade,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  unique (playlist_id, sermon_id)
);

create index playlist_items_playlist_idx on public.playlist_items (playlist_id);
create index playlist_items_sermon_idx on public.playlist_items (sermon_id);
