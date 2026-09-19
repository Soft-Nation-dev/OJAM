-- Live notifications for new messages and published app updates.

create table if not exists public.app_update_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Ojam update available',
  message text not null,
  version text,
  platform text not null default 'all'
    check (platform in ('all', 'android', 'ios', 'web')),
  update_type text not null default 'ota'
    check (update_type in ('ota', 'store')),
  active boolean not null default true,
  published_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists app_update_announcements_published_at_idx
  on public.app_update_announcements (published_at desc)
  where active = true;

alter table public.app_update_announcements enable row level security;

drop policy if exists "Anyone can read active update announcements"
  on public.app_update_announcements;
create policy "Anyone can read active update announcements"
  on public.app_update_announcements
  for select
  to anon, authenticated
  using (active = true and published_at <= now());

drop policy if exists "Admins can create update announcements"
  on public.app_update_announcements;
create policy "Admins can create update announcements"
  on public.app_update_announcements
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can update update announcements"
  on public.app_update_announcements;
create policy "Admins can update update announcements"
  on public.app_update_announcements
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

drop policy if exists "Admins can delete update announcements"
  on public.app_update_announcements;
create policy "Admins can delete update announcements"
  on public.app_update_announcements
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

grant select on public.app_update_announcements to anon, authenticated;
grant insert, update, delete on public.app_update_announcements to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'sermons'
  ) then
    alter publication supabase_realtime add table public.sermons;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'app_update_announcements'
  ) then
    alter publication supabase_realtime
      add table public.app_update_announcements;
  end if;
end
$$;
