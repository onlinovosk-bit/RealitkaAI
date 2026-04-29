-- L99 Decision Intelligence Core (additive only)
-- Adds fields and tables for:
-- 1) Action Scoring Layer
-- 2) Closing Window Model
-- 3) Rescue Automation

alter table public.leads
  add column if not exists success_probability numeric(5,4),
  add column if not exists expected_revenue numeric(12,2),
  add column if not exists closing_window_days_min int,
  add column if not exists closing_window_days_max int,
  add column if not exists priority_bucket text default 'normal',
  add column if not exists risk_trend text default 'flat';

create table if not exists public.lead_action_scores (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  who text not null default '',
  what text not null default '',
  "when" text not null default '',
  success_prob numeric(5,4) not null default 0,
  expected_revenue numeric(12,2) not null default 0,
  reason text not null default '',
  model_version text not null default 'v1',
  created_at timestamptz not null default now()
);

create table if not exists public.lead_closing_windows (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  min_days int not null default 0,
  max_days int not null default 0,
  confidence numeric(5,4) not null default 0,
  reason text not null default '',
  model_version text not null default 'v1',
  created_at timestamptz not null default now(),
  unique (lead_id)
);

create table if not exists public.lead_rescue_runs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  trigger_type text not null default 'risk_signal',
  status text not null default 'pending',
  strategy text not null default '',
  channel text not null default '',
  message_preview text not null default '',
  scheduled_for timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.lead_micro_actions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text not null references public.leads(id) on delete cascade,
  action_type text not null default '',
  action_payload jsonb not null default '{}'::jsonb,
  scheduled_for timestamptz,
  status text not null default 'scheduled',
  created_at timestamptz not null default now()
);

create index if not exists idx_leads_priority_bri on public.leads (priority_bucket, bri_score desc);
create index if not exists idx_leads_updated_at on public.leads (updated_at desc);

create index if not exists idx_lead_action_scores_lead_created
  on public.lead_action_scores (lead_id, created_at desc);
create index if not exists idx_lead_closing_windows_lead
  on public.lead_closing_windows (lead_id);
create index if not exists idx_lead_rescue_runs_lead_status_created
  on public.lead_rescue_runs (lead_id, status, created_at desc);
create index if not exists idx_lead_micro_actions_lead_scheduled
  on public.lead_micro_actions (lead_id, scheduled_for desc);
