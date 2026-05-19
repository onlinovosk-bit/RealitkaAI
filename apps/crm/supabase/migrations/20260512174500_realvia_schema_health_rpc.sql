-- Programmatic DDL checklist for Reality Smolko operators.
-- Exposed ONLY to PostgREST service_role callers (CRM server API with SERVICE_ROLE_KEY).
BEGIN;

CREATE OR REPLACE FUNCTION public.realvia_schema_health()
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT jsonb_build_object(
    'checked_at', (NOW() AT TIME ZONE 'utc')::TEXT,
    'expected_baseline',
    'Definitions in supabase/22_realvia_webhook_infrastructure.sql (commit same objects via migrations/ when applying to prod)',

    'realvia_webhook_logs_table',
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'realvia_webhook_logs'
      ),

    'realvia_processing_queue_table',
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'realvia_processing_queue'
      ),

    'realvia_price_history_table',
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'realvia_price_history'
      ),

    'realvia_metrics_table',
      EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'realvia_metrics'
      ),

    'agencies_columns_realvia_identifikator',
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agencies'
          AND column_name = 'realvia_identifikator'
      ),

    'agencies_columns_realvia_identifikator2',
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'agencies'
          AND column_name = 'realvia_identifikator2'
      ),

    'properties_column_source_id',
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'properties'
          AND column_name = 'source_id'
      ),

    'properties_column_source_system',
      EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'properties'
          AND column_name = 'source_system'
      ),

    'partial_unique_index_properties_source_id',
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'properties'
          AND indexname = 'idx_properties_source_id_unique'
      ),

    'index_properties_non_manual_source_system',
      EXISTS (
        SELECT 1 FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'properties'
          AND indexname = 'idx_properties_source_system'
      )
  );
$$;

COMMENT ON FUNCTION public.realvia_schema_health() IS
  'DDL health for Realvia: tables, agencies mapping columns, properties source columns, partial UNIQUE on properties(source_id).';

REVOKE ALL ON FUNCTION public.realvia_schema_health() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.realvia_schema_health() TO service_role;

COMMIT;
