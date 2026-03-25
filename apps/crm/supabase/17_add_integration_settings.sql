-- Adds per-profile integration settings for Gmail IMAP and Calendar ICS.
-- Safe to run repeatedly in Supabase SQL editor.

begin;

create table if not exists public.integration_settings (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  calendar_ics_url text,
  imap_host text,
  imap_port integer,
  imap_secure boolean not null default true,
  imap_user text,
  imap_password text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.integration_settings enable row level security;

drop policy if exists "demo_select_integration_settings" on public.integration_settings;
drop policy if exists "demo_insert_integration_settings" on public.integration_settings;
drop policy if exists "demo_update_integration_settings" on public.integration_settings;
drop policy if exists "demo_delete_integration_settings" on public.integration_settings;

create policy "demo_select_integration_settings"
  on public.integration_settings for select to anon, authenticated using (true);

create policy "demo_insert_integration_settings"
  on public.integration_settings for insert to anon, authenticated with check (true);

create policy "demo_update_integration_settings"
  on public.integration_settings for update to anon, authenticated using (true) with check (true);

create policy "demo_delete_integration_settings"
  on public.integration_settings for delete to anon, authenticated using (true);

create index if not exists idx_integration_settings_updated_at
  on public.integration_settings (updated_at desc);

commit;
