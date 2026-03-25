-- =========================================================
-- 04_verify_current_schema.sql
-- Overenie, ci predchadzajuca migracia prebehla spravne
-- Spustit v Supabase SQL Editor
-- =========================================================

select
  table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'agencies',
    'teams',
    'profiles',
    'lead_sources',
    'lead_tags',
    'lead_tag_links',
    'leads',
    'activities',
    'tasks',
    'pipeline_stages',
    'pipeline_moves',
    'properties',
    'lead_property_matches',
    'conversations',
    'messages',
    'ai_recommendations'
  )
order by table_name;

-- KONTROLA DÔLEŽITÝCH STĹPCOV
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'leads' and column_name in (
      'id','agency_id','team_id','assigned_profile_id','name','status','score','created_at','updated_at'
    ))
    or
    (table_name = 'properties' and column_name in (
      'id','agency_id','title','location','price','type','rooms','status','created_at','updated_at'
    ))
    or
    (table_name = 'activities' and column_name in (
      'id','lead_id','profile_id','type','text','meta','created_at'
    ))
    or
    (table_name = 'lead_property_matches' and column_name in (
      'id','lead_id','property_id','match_score','reasons','created_at'
    ))
    or
    (table_name = 'pipeline_moves' and column_name in (
      'id','lead_id','from_stage','to_stage','created_at'
    ))
  )
order by table_name, column_name;

-- KONTROLA RLS
select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in (
    'agencies',
    'teams',
    'profiles',
    'lead_sources',
    'lead_tags',
    'lead_tag_links',
    'leads',
    'activities',
    'tasks',
    'pipeline_stages',
    'pipeline_moves',
    'properties',
    'lead_property_matches',
    'conversations',
    'messages',
    'ai_recommendations'
  )
order by tablename;

-- KONTROLA POLICIES
select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in (
    'agencies',
    'teams',
    'profiles',
    'lead_sources',
    'lead_tags',
    'lead_tag_links',
    'leads',
    'activities',
    'tasks',
    'pipeline_stages',
    'pipeline_moves',
    'properties',
    'lead_property_matches',
    'conversations',
    'messages',
    'ai_recommendations'
  )
order by tablename, policyname;

-- KONTROLA INDEXOV
select
  tablename,
  indexname
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'leads',
    'activities',
    'tasks',
    'pipeline_moves',
    'properties',
    'lead_property_matches',
    'messages'
  )
order by tablename, indexname;

-- RÝCHLY SMOKE TEST POČTOV
select 'agencies' as table_name, count(*) as rows_count from public.agencies
union all
select 'teams', count(*) from public.teams
union all
select 'profiles', count(*) from public.profiles
union all
select 'lead_sources', count(*) from public.lead_sources
union all
select 'leads', count(*) from public.leads
union all
select 'activities', count(*) from public.activities
union all
select 'properties', count(*) from public.properties
union all
select 'lead_property_matches', count(*) from public.lead_property_matches
union all
select 'pipeline_stages', count(*) from public.pipeline_stages
union all
select 'pipeline_moves', count(*) from public.pipeline_moves
union all
select 'ai_recommendations', count(*) from public.ai_recommendations
order by table_name;
