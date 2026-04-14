-- Additive migration for assistant insight rename (no downtime).
-- Keeps backward compatibility with legacy `sofia_insight`.

alter table public.leads
  add column if not exists ai_insight text;

-- Backfill existing values into the new column.
update public.leads
set ai_insight = sofia_insight
where ai_insight is null
  and sofia_insight is not null;
