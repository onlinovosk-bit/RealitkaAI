-- CI/local baseline: core CRM tables historically applied outside supabase/migrations/.
-- Must run before 20260411_performance_fee.sql (FK to leads/properties/profiles).

create extension if not exists pgcrypto;

-- ── leads (legacy text PK) ─────────────────────────────────────
create table if not exists public.leads (
  id text primary key,
  name text not null,
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  budget text not null default '',
  property_type text not null default 'Byt',
  rooms text not null default '2 izby',
  financing text not null default 'Hypotéka',
  timeline text not null default 'Do 3 mesiacov',
  source text not null default 'Web formulár',
  status text not null default 'Nový',
  score integer not null default 50,
  bri_score smallint not null default 0,
  agent_id text,
  assigned_agent text not null default 'Nepriradený',
  last_contact text not null default 'Práve vytvorený',
  note text not null default '',
  sofia_insight text,
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "demo_select_leads" on public.leads;
drop policy if exists "demo_insert_leads" on public.leads;
drop policy if exists "demo_update_leads" on public.leads;
drop policy if exists "demo_delete_leads" on public.leads;

create policy "demo_select_leads"
  on public.leads for select to anon, authenticated using (true);
create policy "demo_insert_leads"
  on public.leads for insert to anon, authenticated with check (true);
create policy "demo_update_leads"
  on public.leads for update to anon, authenticated using (true) with check (true);
create policy "demo_delete_leads"
  on public.leads for delete to anon, authenticated using (true);

-- ── activities + properties ────────────────────────────────────
create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id text references public.leads(id) on delete cascade,
  type text not null default 'Poznamka',
  text text not null,
  entity_type text not null default 'lead',
  entity_id text,
  title text default '',
  actor_name text default '',
  source text default 'system',
  severity text default 'info',
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id text primary key,
  title text not null,
  location text not null default '',
  price integer not null default 0,
  type text not null default 'Byt',
  rooms text not null default '2 izby',
  features text[] not null default '{}',
  status text not null default 'Aktivna',
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;
alter table public.properties enable row level security;

drop policy if exists "demo_select_activities" on public.activities;
drop policy if exists "demo_insert_activities" on public.activities;
drop policy if exists "demo_select_properties" on public.properties;
drop policy if exists "demo_insert_properties" on public.properties;
drop policy if exists "demo_update_properties" on public.properties;
drop policy if exists "demo_delete_properties" on public.properties;

create policy "demo_select_activities"
  on public.activities for select to anon, authenticated using (true);
create policy "demo_insert_activities"
  on public.activities for insert to anon, authenticated with check (true);
create policy "demo_select_properties"
  on public.properties for select to anon, authenticated using (true);
create policy "demo_insert_properties"
  on public.properties for insert to anon, authenticated with check (true);
create policy "demo_update_properties"
  on public.properties for update to anon, authenticated using (true) with check (true);
create policy "demo_delete_properties"
  on public.properties for delete to anon, authenticated using (true);

-- ── agencies / teams / profiles (CRM + scraping columns) ───────
create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  country text not null default 'Slovensko',
  city text not null default '',
  plan text not null default 'Free',
  is_active boolean not null default true,
  tenant_id uuid,
  external_id text,
  portal text,
  address text,
  phone text,
  email text,
  website text,
  listings_count integer not null default 0,
  opportunity_score numeric(5,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists agencies_portal_external_id_key
  on public.agencies (portal, external_id)
  where portal is not null and external_id is not null;

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies(id) on delete cascade,
  team_id uuid references public.teams(id) on delete set null,
  auth_user_id uuid,
  full_name text not null,
  email text not null unique,
  role text not null default 'agent',
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_profiles_auth_user_id
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

alter table public.leads
  add column if not exists agency_id uuid references public.agencies(id) on delete set null,
  add column if not exists team_id uuid references public.teams(id) on delete set null,
  add column if not exists assigned_profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists updated_at timestamptz default now();

alter table public.properties
  add column if not exists agency_id uuid references public.agencies(id) on delete set null;

alter table public.activities
  add column if not exists profile_id uuid references public.profiles(id) on delete set null,
  add column if not exists meta jsonb;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  assigned_profile_id uuid references public.profiles(id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'open',
  priority text not null default 'medium',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  recommendation_type text not null default 'next_best_action',
  title text not null,
  description text not null default '',
  priority text not null default 'medium',
  status text not null default 'active',
  model_version text not null default 'v1',
  created_at timestamptz not null default now()
);

alter table public.agencies enable row level security;
alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.ai_recommendations enable row level security;

drop policy if exists "demo_select_agencies" on public.agencies;
drop policy if exists "demo_insert_agencies" on public.agencies;
drop policy if exists "demo_update_agencies" on public.agencies;
create policy "demo_select_agencies" on public.agencies for select to anon, authenticated using (true);
create policy "demo_insert_agencies" on public.agencies for insert to anon, authenticated with check (true);
create policy "demo_update_agencies" on public.agencies for update to anon, authenticated using (true) with check (true);

drop policy if exists "demo_select_teams" on public.teams;
drop policy if exists "demo_insert_teams" on public.teams;
create policy "demo_select_teams" on public.teams for select to anon, authenticated using (true);
create policy "demo_insert_teams" on public.teams for insert to anon, authenticated with check (true);

drop policy if exists "demo_select_profiles" on public.profiles;
drop policy if exists "demo_insert_profiles" on public.profiles;
drop policy if exists "demo_update_profiles" on public.profiles;
create policy "demo_select_profiles" on public.profiles for select to anon, authenticated using (true);
create policy "demo_insert_profiles" on public.profiles for insert to anon, authenticated with check (true);
create policy "demo_update_profiles" on public.profiles for update to anon, authenticated using (true) with check (true);

drop policy if exists "demo_select_tasks" on public.tasks;
drop policy if exists "demo_insert_tasks" on public.tasks;
drop policy if exists "demo_update_tasks" on public.tasks;
drop policy if exists "demo_delete_tasks" on public.tasks;
create policy "demo_select_tasks" on public.tasks for select to anon, authenticated using (true);
create policy "demo_insert_tasks" on public.tasks for insert to anon, authenticated with check (true);
create policy "demo_update_tasks" on public.tasks for update to anon, authenticated using (true) with check (true);
create policy "demo_delete_tasks" on public.tasks for delete to anon, authenticated using (true);

drop policy if exists "demo_select_ai_recommendations" on public.ai_recommendations;
drop policy if exists "demo_insert_ai_recommendations" on public.ai_recommendations;
drop policy if exists "demo_update_ai_recommendations" on public.ai_recommendations;
create policy "demo_select_ai_recommendations" on public.ai_recommendations for select to anon, authenticated using (true);
create policy "demo_insert_ai_recommendations" on public.ai_recommendations for insert to anon, authenticated with check (true);
create policy "demo_update_ai_recommendations" on public.ai_recommendations for update to anon, authenticated using (true) with check (true);

-- ── lead_property_matches ────────────────────────────────────────
create table if not exists public.lead_property_matches (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  property_title text not null default '',
  property_location text not null default '',
  property_price integer not null default 0,
  score integer not null default 0,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, property_id)
);

alter table public.lead_property_matches enable row level security;

drop policy if exists "demo_select_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_insert_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_update_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_delete_lead_property_matches" on public.lead_property_matches;

create policy "demo_select_lead_property_matches"
  on public.lead_property_matches for select to anon, authenticated using (true);
create policy "demo_insert_lead_property_matches"
  on public.lead_property_matches for insert to anon, authenticated with check (true);
create policy "demo_update_lead_property_matches"
  on public.lead_property_matches for update to anon, authenticated using (true) with check (true);
create policy "demo_delete_lead_property_matches"
  on public.lead_property_matches for delete to anon, authenticated using (true);
