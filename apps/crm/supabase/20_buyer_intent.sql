-- ─── buyer_intents ───────────────────────────────────────────────────────────
-- Source of truth for buyer preferences, segment and readiness score.
-- Referenced by matching engine and CRM agent view.

create table if not exists public.buyer_intents (
  id                    uuid primary key default uuid_generate_v4(),
  lead_id               text references public.leads(id) on delete cascade,

  -- structured preferences
  deal_type             text not null check (deal_type in ('buy','rent','sell')),
  property_type         text not null check (property_type in ('flat','house','land','commercial')),
  primary_city          text not null default '',
  budget_min            integer not null default 0,
  budget_max            integer not null default 0,
  time_horizon_months   text not null default '6-12'
                          check (time_horizon_months in ('0-3','3-6','6-12','12+')),

  -- optional flags
  new_build_only        boolean not null default false,
  needs_mortgage_help   boolean not null default false,

  -- AI / agent context
  raw_focus_text        text not null default '',

  -- derived (computed on write)
  client_segment        text not null default 'other',
  buyer_readiness_score integer not null default 0 check (buyer_readiness_score between 0 and 100),

  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── buyer_events ─────────────────────────────────────────────────────────────
-- Append-only behavior log. Foundation for ML readiness score updates.

create table if not exists public.buyer_events (
  id           uuid primary key default uuid_generate_v4(),
  intent_id    uuid references public.buyer_intents(id) on delete cascade,
  lead_id      text references public.leads(id) on delete set null,
  event_type   text not null,  -- property_view | property_save | contact_request | ...
  property_id  text references public.properties(id) on delete set null,
  meta         jsonb not null default '{}',
  created_at   timestamptz not null default now()
);

-- ─── Add segment + readiness to leads (CRM side) ─────────────────────────────
alter table public.leads
  add column if not exists client_segment        text,
  add column if not exists buyer_readiness_score integer;

-- ─── RLS ─────────────────────────────────────────────────────────────────────
alter table public.buyer_intents enable row level security;
alter table public.buyer_events   enable row level security;

drop policy if exists "buyer_intents_all" on public.buyer_intents;
create policy "buyer_intents_all"
  on public.buyer_intents for all
  to anon, authenticated
  using (true) with check (true);

drop policy if exists "buyer_events_all" on public.buyer_events;
create policy "buyer_events_all"
  on public.buyer_events for all
  to anon, authenticated
  using (true) with check (true);

-- ─── updated_at trigger ───────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists buyer_intents_updated_at on public.buyer_intents;
create trigger buyer_intents_updated_at
  before update on public.buyer_intents
  for each row execute procedure public.set_updated_at();
