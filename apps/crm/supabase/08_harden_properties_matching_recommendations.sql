-- Hardening migration for Properties, Matching and Recommendations modules
-- Safe to run repeatedly.

-- 1) PROPERTIES: add optional business columns used by richer UI/workflows
alter table if exists public.properties
  add column if not exists description text not null default '',
  add column if not exists owner_name text not null default '',
  add column if not exists owner_phone text not null default '',
  add column if not exists updated_at timestamptz not null default now();

-- 2) MATCHING: add optional metadata columns used by model/debug flows
alter table if exists public.lead_property_matches
  add column if not exists reasons text[] not null default '{}',
  add column if not exists model_version text not null default 'v1';

-- Ensure score and status columns exist (compatibility safety)
alter table if exists public.lead_property_matches
  add column if not exists score integer not null default 0,
  add column if not exists status text not null default 'sent';

-- 3) RECOMMENDATIONS: optional property linkage for future ranking/explanations
alter table if exists public.ai_recommendations
  add column if not exists property_id text references public.properties(id) on delete set null;

-- Performance indexes
create index if not exists idx_properties_updated_at on public.properties(updated_at desc);
create index if not exists idx_matching_lead_created on public.lead_property_matches(lead_id, created_at desc);
create index if not exists idx_recommendations_lead_created on public.ai_recommendations(lead_id, created_at desc);
