-- ================================================================
-- Revolis.AI — B2B Data API (Gateway + Products)
-- Migration: b2b_data_api
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.api_keys (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  workspace_id   UUID,
  profile_id     UUID,
  api_key        TEXT        UNIQUE NOT NULL,
  tier           TEXT        NOT NULL DEFAULT 'developer'
    CHECK (tier IN ('developer', 'enterprise')),
  request_limit  INTEGER     NOT NULL DEFAULT 10000,
  usage_count    INTEGER     NOT NULL DEFAULT 0,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_api_keys_lookup
  ON public.api_keys(api_key, is_active);

CREATE TABLE IF NOT EXISTS public.api_usage_logs (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  api_key_id     UUID        REFERENCES public.api_keys(id) ON DELETE CASCADE,
  endpoint       TEXT        NOT NULL,
  status_code    INTEGER,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_usage_logs_key_created
  ON public.api_usage_logs(api_key_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.increment_api_usage(key_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE public.api_keys
  SET usage_count = usage_count + 1,
      last_used_at = NOW()
  WHERE api_key = key_id
    AND is_active = TRUE
  RETURNING id INTO v_id;

  IF v_id IS NOT NULL THEN
    INSERT INTO public.api_usage_logs(api_key_id, endpoint, status_code)
    VALUES (v_id, 'gateway', 200);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE VIEW public.b2b_price_intelligence AS
SELECT
  city,
  district,
  property_type,
  ROUND(AVG(price_per_m2)::numeric, 2) AS avg_market_price,
  COUNT(*)::bigint AS sample_size,
  ROUND((percentile_cont(0.5) WITHIN GROUP (ORDER BY price_per_m2))::numeric, 2) AS median_price,
  NOW() AS last_updated
FROM public.portal_listings
WHERE price_per_m2 IS NOT NULL
  AND (
    is_active = TRUE
    OR disappeared_at IS NOT NULL
  )
GROUP BY city, district, property_type
HAVING COUNT(*) >= 5;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role api keys full access" ON public.api_keys;
CREATE POLICY "service role api keys full access"
  ON public.api_keys FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role api usage full access" ON public.api_usage_logs;
CREATE POLICY "service role api usage full access"
  ON public.api_usage_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.api_keys IS
  'B2B partner access keys with tier and request limits for Data API gateway.';
COMMENT ON VIEW public.b2b_price_intelligence IS
  'Anonymized aggregate market feed (k-anonymous samples only) for enterprise partners.';
