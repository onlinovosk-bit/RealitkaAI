-- Enterprise Sales Intelligence: events → scoring → DNA → risk → moments → AI actions
-- lead_id references public.leads(id) as text (legacy schema).

create table if not exists public.lead_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  type text not null,
  value text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_lead_events_lead_created on public.lead_events (lead_id, created_at desc);
create index if not exists idx_lead_events_agency_created on public.lead_events (agency_id, created_at desc);

create table if not exists public.lead_scores (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  score int not null default 0,
  risk_score int not null default 0,
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create index if not exists idx_lead_scores_agency on public.lead_scores (agency_id);

create table if not exists public.client_dna (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  type text not null default '',
  price_sensitivity int not null default 50,
  decision_speed int not null default 50,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.deal_risk (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  risk_level int not null default 0,
  reason text not null default '',
  updated_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.deal_moments (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  is_hot boolean not null default false,
  trigger text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_deal_moments_lead_created on public.deal_moments (lead_id, created_at desc);

create table if not exists public.ai_actions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  action text not null,
  reason text not null default '',
  executed boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_actions_lead_created on public.ai_actions (lead_id, created_at desc);

-- RLS (tenant via agency_id)
alter table public.lead_events enable row level security;
alter table public.lead_scores enable row level security;
alter table public.client_dna enable row level security;
alter table public.deal_risk enable row level security;
alter table public.deal_moments enable row level security;
alter table public.ai_actions enable row level security;

drop policy if exists "lead_events_tenant" on public.lead_events;
create policy "lead_events_tenant"
  on public.lead_events for all to authenticated
  using (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  )
  with check (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  );

drop policy if exists "lead_scores_tenant" on public.lead_scores;
create policy "lead_scores_tenant"
  on public.lead_scores for all to authenticated
  using (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  )
  with check (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  );

drop policy if exists "client_dna_tenant" on public.client_dna;
create policy "client_dna_tenant"
  on public.client_dna for all to authenticated
  using (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  )
  with check (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  );

drop policy if exists "deal_risk_tenant" on public.deal_risk;
create policy "deal_risk_tenant"
  on public.deal_risk for all to authenticated
  using (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  )
  with check (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  );

drop policy if exists "deal_moments_tenant" on public.deal_moments;
create policy "deal_moments_tenant"
  on public.deal_moments for all to authenticated
  using (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  )
  with check (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  );

drop policy if exists "ai_actions_tenant" on public.ai_actions;
create policy "ai_actions_tenant"
  on public.ai_actions for all to authenticated
  using (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  )
  with check (
    agency_id is null
    or agency_id in (select p.agency_id from public.profiles p where p.auth_user_id = auth.uid() and p.agency_id is not null)
  );

-- Realtime: v Supabase Dashboard → Database → Publications → supabase_realtime → pridať tabuľku lead_events
-- (alebo: alter publication supabase_realtime add table public.lead_events;)
