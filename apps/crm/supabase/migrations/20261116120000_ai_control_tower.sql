-- AI Control Tower — shared usage, quota snapshots, alert dedup.
-- Idempotent. Do not apply to production from this PR.
-- Local/dev only, after a separate founder GO for any shared database:
--   cd apps/crm && npx supabase db query --local -f supabase/migrations/20261116120000_ai_control_tower.sql
-- Service role reads and writes. anon and authenticated stay closed.

create table if not exists public.ai_quota_pools (
  id text primary key,
  provider text not null,
  account_ref text not null default 'default',
  created_at timestamptz not null default now(),
  unique (provider, account_ref)
);

create table if not exists public.ai_usage_entries (
  id text primary key,
  dedup_key text not null,
  pool_id text not null,
  provider text not null,
  model text,
  project_id text not null check (project_id in ('revolis', 'onlinovo', 'other')),
  agent_id text,
  cost_eur numeric(12, 6) not null,
  tokens_in integer,
  tokens_out integer,
  source text not null,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_usage_entries_dedup_key_idx
  on public.ai_usage_entries (dedup_key);

create index if not exists ai_usage_entries_pool_occurred_idx
  on public.ai_usage_entries (pool_id, occurred_at desc);

create table if not exists public.ai_quota_snapshots (
  id uuid primary key default gen_random_uuid(),
  pool_id text not null,
  provider text not null,
  source text not null check (source in ('provider_api', 'manual_snapshot')),
  limit_eur numeric(12, 4),
  consumed_eur numeric(12, 4),
  reset_at timestamptz,
  updated_at timestamptz,
  model_count integer,
  note text,
  created_at timestamptz not null default now()
);

create index if not exists ai_quota_snapshots_provider_updated_idx
  on public.ai_quota_snapshots (provider, updated_at desc);

create table if not exists public.ai_pool_alert_firings (
  alert_key text primary key,
  pool_id text not null,
  period_key text not null,
  kind text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists ai_pool_alert_firings_once
  on public.ai_pool_alert_firings (pool_id, period_key, kind);

alter table public.ai_quota_pools enable row level security;
alter table public.ai_usage_entries enable row level security;
alter table public.ai_quota_snapshots enable row level security;
alter table public.ai_pool_alert_firings enable row level security;

drop policy if exists ai_quota_pools_deny on public.ai_quota_pools;
create policy ai_quota_pools_deny
  on public.ai_quota_pools
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists ai_usage_entries_deny on public.ai_usage_entries;
create policy ai_usage_entries_deny
  on public.ai_usage_entries
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists ai_quota_snapshots_deny on public.ai_quota_snapshots;
create policy ai_quota_snapshots_deny
  on public.ai_quota_snapshots
  for all
  to authenticated
  using (false)
  with check (false);

drop policy if exists ai_pool_alert_firings_deny on public.ai_pool_alert_firings;
create policy ai_pool_alert_firings_deny
  on public.ai_pool_alert_firings
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on public.ai_quota_pools from anon, authenticated;
revoke all on public.ai_usage_entries from anon, authenticated;
revoke all on public.ai_quota_snapshots from anon, authenticated;
revoke all on public.ai_pool_alert_firings from anon, authenticated;

comment on table public.ai_quota_pools is
  'AI Control Tower pool identity. One row per provider account. Not a second cost ledger.';
comment on table public.ai_usage_entries is
  'Normalized usage samples. dedup_key collapses ledger and audit copies of the same call.';
comment on table public.ai_quota_snapshots is
  'Manual or official-API quota snapshots. Null consumption stays null.';
comment on table public.ai_pool_alert_firings is
  'Idempotency for pool threshold alerts: one row per pool, period and kind.';
