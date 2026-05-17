-- Simple DB-backed queue for AI jobs (Orchestrator 1 MVP).
-- Workers use service role; no Redis/BullMQ.

create table if not exists public.ai_jobs (
  id uuid primary key default gen_random_uuid (),
  job_type text not null,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending'
    constraint ai_jobs_status_check
      check (status in ('pending', 'processing', 'completed', 'dead')),
  retry_count integer not null default 0,
  max_retries integer not null default 5,
  run_after timestamptz not null default now(),
  last_error text,
  created_at timestamptz not null default now (),
  updated_at timestamptz not null default now (),
  started_at timestamptz,
  completed_at timestamptz
);

comment on table public.ai_jobs is 'Cron-driven worker pulls pending rows; retries with exponential backoff until dead letter.';

create index if not exists ai_jobs_runner_poll
  on public.ai_jobs using btree (run_after asc, created_at asc)
  where status = 'pending';

create index if not exists ai_jobs_type_created
  on public.ai_jobs using btree (job_type, created_at desc);
