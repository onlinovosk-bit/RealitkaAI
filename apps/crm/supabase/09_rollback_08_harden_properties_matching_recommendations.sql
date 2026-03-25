-- Rollback for 08_harden_properties_matching_recommendations.sql
-- Conservative rollback: removes optional columns/indexes introduced by migration 08.
-- NOTE: score/status are intentionally not dropped because they may be core columns in older schemas.

begin;

-- Drop indexes created by migration 08
 drop index if exists public.idx_properties_updated_at;
 drop index if exists public.idx_matching_lead_created;
 drop index if exists public.idx_recommendations_lead_created;

-- Revert optional properties columns
alter table if exists public.properties
  drop column if exists description,
  drop column if exists owner_name,
  drop column if exists owner_phone,
  drop column if exists updated_at;

-- Revert optional matching metadata columns
alter table if exists public.lead_property_matches
  drop column if exists reasons,
  drop column if exists model_version;

-- Revert optional recommendations linkage column
alter table if exists public.ai_recommendations
  drop column if exists property_id;

commit;
