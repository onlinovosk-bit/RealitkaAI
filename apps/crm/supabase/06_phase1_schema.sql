create extension if not exists pgcrypto;

create table if not exists public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  country text not null default 'Slovensko',
  city text not null default '',
  plan text not null default 'Free',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
  full_name text not null,
  email text not null unique,
  role text not null default 'agent',
  phone text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
