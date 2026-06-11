-- Read-only RPC for RLS isolation test suite (service_role only)

CREATE OR REPLACE FUNCTION public.rls_audit_snapshot()
RETURNS TABLE (
  table_name text,
  rls_enabled boolean,
  has_agency_id boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.relname::text,
    c.relrowsecurity,
    EXISTS (
      SELECT 1
      FROM information_schema.columns col
      WHERE col.table_schema = 'public'
        AND col.table_name = c.relname
        AND col.column_name = 'agency_id'
    )
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND c.relname NOT LIKE 'pg_%'
  ORDER BY 1;
$$;

REVOKE ALL ON FUNCTION public.rls_audit_snapshot() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rls_audit_snapshot() TO service_role;
