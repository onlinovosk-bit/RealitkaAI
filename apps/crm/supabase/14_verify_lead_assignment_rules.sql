select
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'lead_assignment_rules'
order by ordinal_position;

select schemaname, tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename = 'lead_assignment_rules';

select schemaname, tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename = 'lead_assignment_rules'
order by policyname;