-- Idempotencia denného AI triage: jeden pokus / UTC deň / lead (cron aj queue worker).
create table if not exists public.lead_triage_idempotency (
  lead_id text not null references public.leads (id) on delete cascade,
  day_utc date not null,
  state text not null
    constraint lead_triage_idem_state_ck
      check (state = any (array['processing'::text, 'completed'::text, 'failed'::text])),
  processing_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now (),
  constraint lead_triage_idempotency_pkey primary key (lead_id, day_utc)
);

comment on table public.lead_triage_idempotency is 'Zabraňuje duplicitnému triážovému AI behu na rovnaký lead v ten istý UTC kalendárny deň; failed + stale processing umožní retry.';

create index if not exists lead_triage_idem_day_state_idx
  on public.lead_triage_idempotency using btree (day_utc asc, state asc);
