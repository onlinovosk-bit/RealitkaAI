-- AI Sales Brain snapshot (JSON) — nezávislé od numerického score (CRM vs combined podľa env).
alter table public.leads
  add column if not exists ai_engine jsonb;

comment on column public.leads.ai_engine is 'AI Sales Brain v2 snapshot: combinedScore, legacyScore, confidence, timeToCloseDays, updatedAt';
