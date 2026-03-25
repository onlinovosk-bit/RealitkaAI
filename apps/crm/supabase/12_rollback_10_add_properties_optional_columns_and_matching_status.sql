-- Rollback for 10_add_properties_optional_columns_and_matching_status.sql
-- Use only if you explicitly want to remove these optional columns again.

begin;

drop index if exists public.idx_lead_property_matches_status;
drop index if exists public.idx_properties_updated_at;

drop trigger if exists trg_properties_set_updated_at on public.properties;
drop function if exists public.set_properties_updated_at();

alter table if exists public.lead_property_matches
  drop column if exists status;

alter table if exists public.properties
  drop column if exists description,
  drop column if exists owner_name,
  drop column if exists owner_phone,
  drop column if exists updated_at;

commit;