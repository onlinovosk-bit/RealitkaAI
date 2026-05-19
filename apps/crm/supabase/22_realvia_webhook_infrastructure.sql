-- ================================================================
-- Revolis.AI — Realvia Webhook Infrastructure
-- Migration: 22_realvia_webhook_infrastructure
-- Purpose: Tables for secure, idempotent Realvia export ingestion
-- Safe to run repeatedly (IF NOT EXISTS everywhere).
--
-- PRODUCTION: commit equivalent objects through supabase/migrations/
-- and track in Git; use GET /api/admin/realvia/schema-status (admin)
-- or scripts/verify-realvia-infrastructure.sql for operator sign-off.
-- ================================================================

BEGIN;

-- ── 1. RAW WEBHOOK LOGS ────────────────────────────────────────
-- Every incoming Realvia request is stored raw BEFORE any processing.
-- This is the audit trail and replay source.

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

-- Only service_role can read/write webhook logs
DROP POLICY IF EXISTS "realvia_webhook_logs_service_role" ON public.realvia_webhook_logs;
CREATE POLICY "realvia_webhook_logs_service_role"
  ON public.realvia_webhook_logs FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ── 2. PROCESSING QUEUE ────────────────────────────────────────
-- Async job queue for webhook processing.
-- Decouples fast webhook response from slow processing.

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


-- ── 3. ADD source_id TO PROPERTIES (if missing) ───────────────
-- source_id is the stable Realvia identifier for idempotent upserts.
-- broker_source_id links to the Realvia broker.
-- payload_raw stores the full Realvia payload for debugging.

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

-- Unique constraint for idempotent upserts — only for Realvia-sourced properties
CREATE UNIQUE INDEX IF NOT EXISTS idx_properties_source_id_unique
  ON public.properties (source_id)
  WHERE source_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_properties_source_system
  ON public.properties (source_system)
  WHERE source_system != 'manual';

CREATE INDEX IF NOT EXISTS idx_properties_broker_source_id
  ON public.properties (broker_source_id)
  WHERE broker_source_id IS NOT NULL;


-- ── 4. PROPERTY PRICE HISTORY (Realvia-specific) ──────────────
-- Separate from property_price_trail (which is profile-linked).
-- This tracks raw price changes from Realvia export pushes.

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

-- Authenticated users can read price history for their agency
DROP POLICY IF EXISTS "realvia_price_history_agency_read" ON public.realvia_price_history;
CREATE POLICY "realvia_price_history_agency_read"
  ON public.realvia_price_history FOR SELECT TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );


-- ── 5. REALTIME: push webhook log updates to admin UI ─────────
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
