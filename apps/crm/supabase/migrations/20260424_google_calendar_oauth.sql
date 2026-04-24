-- Google OAuth token storage for Calendar/Gmail integrations.
begin;

create table if not exists public.profile_google_calendar (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  refresh_token text not null,
  access_token text,
  access_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_google_calendar_updated_at
  on public.profile_google_calendar (updated_at desc);

alter table public.profile_google_calendar enable row level security;

comment on table public.profile_google_calendar is
  'Google Calendar/Gmail OAuth tokens. Reads/writes are expected only via server service role.';

commit;
