-- Realvia: map webhook credentials to agency + cron batch metrics
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

-- One row per cron batch (or heartbeat with zeros); used for rolling 24h SLIs
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
