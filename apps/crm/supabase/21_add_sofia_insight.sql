-- 21_add_sofia_insight.sql
-- Pridá sofia_insight stĺpec do leads tabuľky pre AI odporúčania

alter table public.leads
  add column if not exists sofia_insight text null;
