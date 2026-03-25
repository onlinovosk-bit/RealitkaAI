-- Migration 16: Add missing columns to ai_recommendations
-- Safe to run repeatedly (uses IF NOT EXISTS).
-- These columns were defined in migration 08 but may not have been applied.

alter table if exists public.ai_recommendations
  add column if not exists property_id text references public.properties(id) on delete set null,
  add column if not exists model_version text not null default 'v1';

-- Verify
select
  column_name,
  data_type,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'ai_recommendations'
  and column_name in ('property_id', 'model_version')
order by column_name;
