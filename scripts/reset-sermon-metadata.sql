-- WARNING: This removes sermon metadata only.
-- Audio files in Cloudflare R2 are NOT affected.

drop table if exists public.sermons;

create table public.sermons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  preacher text,
  date timestamptz not null default now(),
  duration integer default 0,
  audio_key text not null unique,
  image_key text,
  category text not null check (category in ('sunday','tuesday','friday')),
  created_at timestamptz not null default now()
);

create index sermons_category_idx on public.sermons (category);
create index sermons_date_idx on public.sermons (date desc);
