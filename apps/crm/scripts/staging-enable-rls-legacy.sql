-- Hardening legacy public tables not used by current app paths.
-- Safe for staging/live: only enables RLS; no schema or data mutation.
alter table if exists public.revolis_leads enable row level security;
alter table if exists public.revolis_zaujemcovia enable row level security;
