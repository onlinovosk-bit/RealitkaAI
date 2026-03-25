-- Verification script for 10_add_properties_optional_columns_and_matching_status.sql

select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'properties' and column_name in ('description', 'owner_name', 'owner_phone', 'updated_at'))
    or
    (table_name = 'lead_property_matches' and column_name in ('status'))
  )
order by table_name, ordinal_position;

select
  id,
  title,
  description,
  owner_name,
  owner_phone,
  updated_at
from public.properties
order by created_at desc
limit 5;

select
  id,
  lead_id,
  property_id,
  score,
  status,
  created_at
from public.lead_property_matches
order by created_at desc
limit 5;