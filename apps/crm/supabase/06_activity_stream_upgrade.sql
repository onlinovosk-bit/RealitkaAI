-- =========================================================
-- 06_activity_stream_upgrade.sql
-- Rozšírenie activity streamu, aby vedel logovať každú zmenu v systéme
-- Spusti v Supabase SQL Editor
-- =========================================================

alter table public.activities
  alter column lead_id drop not null;

alter table public.activities
  add column if not exists entity_type text not null default 'lead';

alter table public.activities
  add column if not exists entity_id text;

alter table public.activities
  add column if not exists title text default '';

alter table public.activities
  add column if not exists actor_name text default '';

alter table public.activities
  add column if not exists source text default 'system';

alter table public.activities
  add column if not exists severity text default 'info';

create index if not exists idx_activities_entity_type on public.activities(entity_type);
create index if not exists idx_activities_entity_id on public.activities(entity_id);
create index if not exists idx_activities_source on public.activities(source);
create index if not exists idx_activities_severity on public.activities(severity);
create index if not exists idx_activities_created_at_desc on public.activities(created_at desc);
