-- Event Scheduler Phase 1 (M-03): tenant-scoped scheduled events for viewings/meetings.
begin;

create table if not exists public.scheduled_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  lead_id text references public.leads(id) on delete set null,
  property_id text references public.properties(id) on delete set null,
  event_type text not null default 'viewing',
  status text not null default 'scheduled',
  title text not null,
  description text not null default '',
  location text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Europe/Bratislava',
  google_calendar_event_id text,
  google_calendar_html_link text,
  reminder_minutes integer,
  meta jsonb not null default '{}'::jsonb,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint scheduled_events_ends_after_start check (ends_at > starts_at),
  constraint scheduled_events_type_check check (
    event_type = any (array['viewing','meeting','call','reminder','other']::text[])
  ),
  constraint scheduled_events_status_check check (
    status = any (array['scheduled','confirmed','cancelled','completed','no_show']::text[])
  )
);

comment on table public.scheduled_events is
  'M-03 Event Scheduler: obhliadky, stretnutia a pripomienky scoped per agency.';

create index if not exists idx_scheduled_events_agency_id
  on public.scheduled_events (agency_id);

create index if not exists idx_scheduled_events_agency_starts_at
  on public.scheduled_events (agency_id, starts_at);

create index if not exists idx_scheduled_events_lead_id
  on public.scheduled_events (lead_id)
  where lead_id is not null;

create index if not exists idx_scheduled_events_profile_id
  on public.scheduled_events (profile_id);

create index if not exists idx_scheduled_events_status
  on public.scheduled_events (status);

alter table public.scheduled_events enable row level security;

drop policy if exists "scheduled_events_agency" on public.scheduled_events;

create policy "scheduled_events_agency"
  on public.scheduled_events
  for all
  to authenticated
  using (
    agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id in (select public.profile_agencies_for_auth())
  );

commit;
