-- WARNING: This removes image metadata only.
-- Image files in Cloudflare R2 are NOT affected.

drop table if exists public.images;

create table public.images (
  id uuid primary key default gen_random_uuid(),
  image_key text not null unique,
  created_at timestamptz not null default now()
);

create index images_key_idx on public.images (image_key);
