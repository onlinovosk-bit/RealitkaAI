-- Metriky behu AI triáže (cron/worker): výkon, lock, API fallback — čítanie cez RLS podľa agency_id.
create table if not exists public.ai_triage_run_metrics (
  id uuid primary key default gen_random_uuid(),
  run_id text not null,
  source text not null default 'cron_lead_ai_triage',
  day_utc date not null,
  agency_id uuid references public.agencies (id) on delete cascade,
  started_at timestamptz not null,
  finished_at timestamptz not null,
  duration_ms integer not null,
  outcome text not null
    constraint ai_triage_run_metrics_outcome_ck
      check (outcome = any (array['success'::text, 'error'::text, 'no_claims'::text])),
  candidate_count integer not null default 0,
  candidates_in_run_for_agency integer not null default 0,
  claimed_for_agency integer not null default 0,
  updated_for_agency integer not null default 0,
  skipped_dupe_global integer not null default 0,
  lock_acquired_insert integer not null default 0,
  lock_acquired_after_failed integer not null default 0,
  lock_stale_recovery integer not null default 0,
  lock_skipped_completed integer not null default 0,
  lock_skipped_lock_held integer not null default 0,
  lock_skipped_race_or_missing integer not null default 0,
  ai_api_fallback_leads integer not null default 0,
  error_message text,
  created_at timestamptz not null default now(),
  constraint ai_triage_run_metrics_run_agency_key unique (run_id, agency_id)
);

comment on table public.ai_triage_run_metrics is 'Agregované snímky behu triáže; globálne lock skipped sú na každom riadku agentúry z rovnakého run_id (pre report 24h sumár podľa agency).';

create index if not exists ai_triage_run_metrics_agency_finished_idx
  on public.ai_triage_run_metrics using btree (agency_id asc, finished_at desc);

create index if not exists ai_triage_run_metrics_run_id_idx
  on public.ai_triage_run_metrics using btree (run_id asc);

alter table public.ai_triage_run_metrics enable row level security;

create policy "ai_triage_run_metrics_agency_select"
  on public.ai_triage_run_metrics for select
  using (agency_id in (select public.profile_agencies_for_auth()));

-- Zápisy len service role (cron) — bežní používatelia nemajú INSERT.
