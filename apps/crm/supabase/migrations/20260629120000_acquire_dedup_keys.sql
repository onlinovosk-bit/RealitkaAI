-- Acquire dedup keys — idempotent inbound email lead creation (Wave 1).
-- RLS: service_role only (no anon/authenticated policies).

create table if not exists public.acquire_dedup_keys (
  agency_id  uuid        not null references public.agencies (id) on delete cascade,
  dedup_key  text        not null,
  created_at timestamptz not null default now(),
  primary key (agency_id, dedup_key)
);

create index if not exists idx_acquire_dedup_keys_created_at
  on public.acquire_dedup_keys (created_at);

alter table public.acquire_dedup_keys enable row level security;
-- No policies: anon/authenticated blocked; service_role bypasses RLS.

comment on table public.acquire_dedup_keys is
  'Dedup registry for Acquire email gateway — one row per agency_id + dedup_key.';
