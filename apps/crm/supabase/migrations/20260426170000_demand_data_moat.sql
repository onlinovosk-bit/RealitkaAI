-- ================================================================
-- Revolis.AI — L99 Data Moat (Demand Signals + Gap Report)
-- Migration: demand_data_moat
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.demand_signals (
  id              UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      UUID,
  lat             DOUBLE PRECISION NOT NULL,
  lng             DOUBLE PRECISION NOT NULL,
  city            TEXT,
  property_type   TEXT,
  search_weight   DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  created_at      TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_demand_signals_created
  ON public.demand_signals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_signals_city
  ON public.demand_signals(city, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_demand_signals_geo
  ON public.demand_signals(lat, lng);

ALTER TABLE public.demand_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read own demand signals" ON public.demand_signals;
CREATE POLICY "owners read own demand signals"
  ON public.demand_signals FOR SELECT
  USING (
    profile_id IS NULL
    OR profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "service role demand signals full access" ON public.demand_signals;
CREATE POLICY "service role demand signals full access"
  ON public.demand_signals FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Supply / demand gap RPC used by developer insight report
CREATE OR REPLACE FUNCTION public.get_supply_demand_gap(city_name TEXT)
RETURNS TABLE (
  neighborhood_name TEXT,
  demand_index NUMERIC,
  supply_index NUMERIC
) AS $$
WITH demand AS (
  SELECT
    ROUND(lat::numeric, 2) AS bin_lat,
    ROUND(lng::numeric, 2) AS bin_lng,
    SUM(COALESCE(search_weight, 1.0))::numeric AS demand_index
  FROM public.demand_signals
  WHERE created_at >= NOW() - INTERVAL '12 months'
    AND (city_name IS NULL OR city IS NULL OR city ILIKE city_name || '%')
  GROUP BY ROUND(lat::numeric, 2), ROUND(lng::numeric, 2)
),
supply AS (
  SELECT
    ROUND(lat::numeric, 2) AS bin_lat,
    ROUND(lng::numeric, 2) AS bin_lng,
    COUNT(*)::numeric AS supply_index
  FROM public.portal_listings
  WHERE is_active = TRUE
    AND lat IS NOT NULL
    AND lng IS NOT NULL
    AND (city_name IS NULL OR city ILIKE city_name || '%')
  GROUP BY ROUND(lat::numeric, 2), ROUND(lng::numeric, 2)
)
SELECT
  CONCAT('Zone ', COALESCE(d.bin_lat, s.bin_lat), ',', COALESCE(d.bin_lng, s.bin_lng)) AS neighborhood_name,
  COALESCE(d.demand_index, 0) AS demand_index,
  COALESCE(s.supply_index, 0) AS supply_index
FROM demand d
FULL OUTER JOIN supply s
  ON d.bin_lat = s.bin_lat AND d.bin_lng = s.bin_lng
ORDER BY (COALESCE(d.demand_index, 0) - COALESCE(s.supply_index, 0)) DESC;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Retention policy: keep only last 12 months
DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pg_cron;
    IF NOT EXISTS (
      SELECT 1
      FROM cron.job
      WHERE jobname = 'cleanup-demand-signals-12m'
    ) THEN
      PERFORM cron.schedule(
        'cleanup-demand-signals-12m',
        '0 0 1 * *',
        $$DELETE FROM public.demand_signals WHERE created_at < NOW() - INTERVAL '12 months'$$
      );
    END IF;
  EXCEPTION WHEN others THEN
    -- pg_cron may be unavailable on some environments; table still works.
    NULL;
  END;
END $$;

COMMENT ON TABLE public.demand_signals IS
  'Anonymized geospatial search demand points used for market heatmaps and supply-demand gap analytics.';
