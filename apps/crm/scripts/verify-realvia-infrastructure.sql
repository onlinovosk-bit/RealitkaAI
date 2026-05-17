-- ================================================================
-- Manual verification (Supabase SQL Editor — Reality Smolko / Revolis)
-- Run after migrations. Expect each scalar query result to be true.
-- Pair with: GET /api/admin/realvia/schema-status (logged-in CRM admin).
-- ================================================================

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'realvia_webhook_logs'
) AS realvia_webhook_logs_table;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'realvia_processing_queue'
) AS realvia_processing_queue_table;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'realvia_price_history'
) AS realvia_price_history_table;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'realvia_metrics'
) AS realvia_metrics_table;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'source_id'
) AS properties_column_source_id;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'properties' AND column_name = 'source_system'
) AS properties_column_source_system;

-- Partial UNIQUE for idempotent ingest (baseline: 22_realvia_webhook_infrastructure.sql)
SELECT EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'properties'
    AND indexname = 'idx_properties_source_id_unique'
) AS partial_unique_index_properties_source_id;

SELECT EXISTS (
  SELECT 1 FROM pg_indexes
  WHERE schemaname = 'public'
    AND tablename = 'properties'
    AND indexname = 'idx_properties_source_system'
) AS index_properties_non_manual_source_system;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'agencies' AND column_name = 'realvia_identifikator'
) AS agencies_realvia_identifikator;

SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'agencies' AND column_name = 'realvia_identifikator2'
) AS agencies_realvia_identifikator2;
