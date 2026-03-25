-- Migration 15: Add model_version and reasons columns to lead_property_matches
-- Safe to run repeatedly (uses IF NOT EXISTS).
-- These columns were defined in migration 08 but may not have been applied.

alter table if exists public.lead_property_matches
  add column if not exists reasons text[] not null default '{}',
  add column if not exists model_version text not null default 'v1';

-- Verify
select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'lead_property_matches'
  and column_name in ('reasons', 'model_version')
order by column_name;
