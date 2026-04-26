-- ================================================================
-- Revolis.AI — War Room Sleep Detector Engine
-- Migration: competitor_sleep_detector
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.competitor_monitoring (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id            UUID,
  target_rk_name        TEXT        NOT NULL,
  location_focus        TEXT,
  base_inventory_count  INTEGER     NOT NULL DEFAULT 0,
  last_activity_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                TEXT        NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','sleeping','dead')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_monitoring_profile
  ON public.competitor_monitoring(profile_id, status);

CREATE TABLE IF NOT EXISTS public.competitor_activity_logs (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  competitor_id   UUID        REFERENCES public.competitor_monitoring(id) ON DELETE CASCADE,
  activity_type   TEXT        NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_competitor_activity_logs_recent
  ON public.competitor_activity_logs(competitor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.strategic_alerts (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id      UUID,
  title           TEXT        NOT NULL,
  description     TEXT        NOT NULL,
  severity        TEXT        NOT NULL DEFAULT 'high'
    CHECK (severity IN ('low','medium','high','critical')),
  type            TEXT        NOT NULL,
  location_focus  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_strategic_alerts_profile_created
  ON public.strategic_alerts(profile_id, created_at DESC);

ALTER TABLE public.competitor_monitoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.competitor_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners manage competitor monitoring" ON public.competitor_monitoring;
CREATE POLICY "owners manage competitor monitoring"
  ON public.competitor_monitoring FOR ALL
  USING (
    profile_id IS NULL OR profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    profile_id IS NULL OR profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owners manage competitor activity logs" ON public.competitor_activity_logs;
CREATE POLICY "owners manage competitor activity logs"
  ON public.competitor_activity_logs FOR ALL
  USING (
    competitor_id IN (
      SELECT id FROM public.competitor_monitoring
      WHERE profile_id IS NULL OR profile_id IN (
        SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "owners read strategic alerts" ON public.strategic_alerts;
CREATE POLICY "owners read strategic alerts"
  ON public.strategic_alerts FOR SELECT
  USING (
    profile_id IS NULL OR profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service role strategic full access" ON public.strategic_alerts;
CREATE POLICY "service role strategic full access"
  ON public.strategic_alerts FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.competitor_monitoring IS
  'Competitive watchlist per location with activity baseline and inferred lifecycle status.';
COMMENT ON TABLE public.competitor_activity_logs IS
  'Competitive event stream used by Sleep Detector (new listings, delistings, price changes).';
COMMENT ON TABLE public.strategic_alerts IS
  'High-value strategic intel alerts visible in Protocol Authority war room.';
