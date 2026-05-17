-- =============================================================================
-- Reality Smolko — Supabase SQL: časť 2 (schéma) + časť 3 (agencies UPDATE)
-- Spúšťaj v SQL Editore v TOMTO poradí:
--   2A → Run | 2B → Run | 2C → Run | 3 → Run (úprava hodnôt v 3 ak treba)
-- Ak už niektorý blok raz úspešne prešiel, druhý beh je väčšinou bez účinku (IF NOT EXISTS).
-- =============================================================================

-- =============================================================================
-- 2A — Baseline Realvia (tabuľky, properties stĺpce, indexy, RLS)
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.realvia_webhook_logs (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id      UUID          NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  received_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  source_ip       TEXT          NOT NULL DEFAULT '',
  headers_json    JSONB         NOT NULL DEFAULT '{}',
  payload_json    JSONB         NOT NULL DEFAULT '{}',
  payload_type    TEXT          NOT NULL DEFAULT 'advert'
    CHECK (payload_type IN ('advert', 'delete', 'unknown')),
  processed       BOOLEAN       NOT NULL DEFAULT FALSE,
  processing_error TEXT,
  agency_id       UUID          REFERENCES public.agencies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rwl_received_at
  ON public.realvia_webhook_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_rwl_processed
  ON public.realvia_webhook_logs (processed)
  WHERE processed = FALSE;

CREATE INDEX IF NOT EXISTS idx_rwl_agency
  ON public.realvia_webhook_logs (agency_id)
  WHERE agency_id IS NOT NULL;

ALTER TABLE public.realvia_webhook_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realvia_webhook_logs_service_role" ON public.realvia_webhook_logs;
CREATE POLICY "realvia_webhook_logs_service_role"
  ON public.realvia_webhook_logs FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


CREATE TABLE IF NOT EXISTS public.realvia_processing_queue (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_log_id  UUID          NOT NULL REFERENCES public.realvia_webhook_logs(id) ON DELETE CASCADE,
  status          TEXT          NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  retry_count     SMALLINT      NOT NULL DEFAULT 0,
  max_retries     SMALLINT      NOT NULL DEFAULT 3,
  next_retry_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  processed_at    TIMESTAMPTZ,
  error_message   TEXT,
  UNIQUE (webhook_log_id)
);

CREATE INDEX IF NOT EXISTS idx_rpq_pending
  ON public.realvia_processing_queue (status, next_retry_at)
  WHERE status IN ('pending', 'failed');

CREATE INDEX IF NOT EXISTS idx_rpq_created
  ON public.realvia_processing_queue (created_at DESC);

ALTER TABLE public.realvia_processing_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realvia_processing_queue_service_role" ON public.realvia_processing_queue;
CREATE POLICY "realvia_processing_queue_service_role"
  ON public.realvia_processing_queue FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


ALTER TABLE IF EXISTS public.properties
  ADD COLUMN IF NOT EXISTS source_id          TEXT,
  ADD COLUMN IF NOT EXISTS source_system      TEXT          NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS broker_source_id   TEXT,
  ADD COLUMN IF NOT EXISTS broker_name        TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS broker_email       TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS broker_phone       TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payload_raw        JSONB,
  ADD COLUMN IF NOT EXISTS currency           TEXT          NOT NULL DEFAULT 'EUR',
  ADD COLUMN IF NOT EXISTS usable_area        NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS land_area          NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS building_area      NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS latitude           NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS longitude          NUMERIC(10,7),
  ADD COLUMN IF NOT EXISTS transaction_type   TEXT          NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS floor              SMALLINT,
  ADD COLUMN IF NOT EXISTS rooms_count        SMALLINT,
  ADD COLUMN IF NOT EXISTS images             JSONB         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS realvia_updated_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_source_id_unique
  ON public.properties (source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_source_system
  ON public.properties (source_system)
  WHERE source_system != 'manual';

CREATE INDEX IF NOT EXISTS idx_properties_broker_source_id
  ON public.properties (broker_source_id)
  WHERE broker_source_id IS NOT NULL;


CREATE TABLE IF NOT EXISTS public.realvia_price_history (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id     TEXT          NOT NULL,
  source_id       TEXT          NOT NULL,
  old_price       NUMERIC(12,2),
  new_price       NUMERIC(12,2) NOT NULL,
  old_currency    TEXT,
  new_currency    TEXT          NOT NULL DEFAULT 'EUR',
  changed_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  agency_id       UUID          REFERENCES public.agencies(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_rph_property
  ON public.realvia_price_history (property_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_rph_source
  ON public.realvia_price_history (source_id, changed_at DESC);

ALTER TABLE public.realvia_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realvia_price_history_service_role" ON public.realvia_price_history;
CREATE POLICY "realvia_price_history_service_role"
  ON public.realvia_price_history FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "realvia_price_history_agency_read" ON public.realvia_price_history;
CREATE POLICY "realvia_price_history_agency_read"
  ON public.realvia_price_history FOR SELECT TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );


DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'realvia_webhook_logs'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.realvia_webhook_logs;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = 'realvia_processing_queue'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.realvia_processing_queue;
    END IF;
  END IF;
END $$;


COMMENT ON TABLE public.realvia_webhook_logs IS
  'Raw audit log of every incoming Realvia webhook request. Never deleted. Source of truth for replay and debugging.';
COMMENT ON TABLE public.realvia_processing_queue IS
  'Async processing queue for Realvia webhook payloads. Decouples fast webhook response from heavy processing.';
COMMENT ON TABLE public.realvia_price_history IS
  'Price change history from Realvia export pushes. Feeds AI insights, market trends, and seller motivation scoring.';

COMMIT;


-- =============================================================================
-- 2B — Agencies stĺpce + realvia_metrics
-- =============================================================================

BEGIN;

ALTER TABLE IF EXISTS public.agencies
  ADD COLUMN IF NOT EXISTS realvia_identifikator TEXT,
  ADD COLUMN IF NOT EXISTS realvia_identifikator2 TEXT;

COMMENT ON COLUMN public.agencies.realvia_identifikator IS
  'Realvia HTTP header identifikator; paired with identifikator2 for agency routing';
COMMENT ON COLUMN public.agencies.realvia_identifikator2 IS
  'Realvia HTTP header identifikator2';

CREATE UNIQUE INDEX IF NOT EXISTS idx_agencies_realvia_identifikator_pair_unique
  ON public.agencies (realvia_identifikator, realvia_identifikator2)
  WHERE realvia_identifikator IS NOT NULL
    AND realvia_identifikator2 IS NOT NULL
    AND btrim(realvia_identifikator) <> ''
    AND btrim(realvia_identifikator2) <> '';

CREATE TABLE IF NOT EXISTS public.realvia_metrics (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  recorded_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  source          TEXT          NOT NULL DEFAULT 'realvia-queue-batch',
  jobs_processed  INT           NOT NULL DEFAULT 0,
  jobs_succeeded  INT           NOT NULL DEFAULT 0,
  jobs_failed     INT           NOT NULL DEFAULT 0,
  duration_ms     INT,
  meta            JSONB         NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_realvia_metrics_recorded_at
  ON public.realvia_metrics (recorded_at DESC);

ALTER TABLE IF EXISTS public.realvia_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realvia_metrics_service_role_all"
  ON public.realvia_metrics;

CREATE POLICY "realvia_metrics_service_role_all"
  ON public.realvia_metrics FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.realvia_metrics IS
  'Append-only-ish batch counters from Realvia queue processor (structured aggregation for 24h dashboards)';

COMMIT;


-- =============================================================================
-- 2C — Funkcia realvia_schema_health() (pre tlačidlo „Skontroluj schému“ v CRM)
-- =============================================================================

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


-- =============================================================================
-- 3 — Naplnenie agencies pre Reality Smolko (ZHODA s Vercel REALVIA_IDENTIFIER*)
-- UPRAV identifikátory, ak Realvia posiela iné hodnoty než v príklade.
-- =============================================================================

UPDATE public.agencies
SET
  realvia_identifikator = 'revolis-live-webhook',
  realvia_identifikator2 = 'rv_7F29xA91mK44pQ'
WHERE id = '11111111-1111-1111-1111-111111111111'
RETURNING id, name, slug, realvia_identifikator, realvia_identifikator2;
