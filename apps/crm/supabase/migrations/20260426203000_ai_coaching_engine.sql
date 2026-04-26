-- ================================================================
-- Revolis.AI — AI Coaching Engine (Retention L99)
-- Migration: ai_coaching_engine
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.lead_conversions (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_name       TEXT        NOT NULL,
  conversion_rate  NUMERIC(5,2) NOT NULL DEFAULT 0,
  sample_size      INTEGER     NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lead_conversions_broker_created
  ON public.lead_conversions(broker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.broker_performance_stats (
  id                       UUID             DEFAULT gen_random_uuid() PRIMARY KEY,
  broker_id                UUID             NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_number              INTEGER          NOT NULL,
  funnel_drop_off_stage    TEXT,
  follow_up_consistency    DOUBLE PRECISION NOT NULL DEFAULT 0,
  avg_deal_velocity_days   INTEGER          NOT NULL DEFAULT 0,
  created_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_perf_broker_created
  ON public.broker_performance_stats(broker_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  metadata     JSONB       NOT NULL DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  read_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_type_created
  ON public.notifications(user_id, type, created_at DESC);

CREATE OR REPLACE FUNCTION public.detect_broker_weakness(target_broker_id UUID)
RETURNS TEXT AS $$
DECLARE
  weak_stage TEXT;
BEGIN
  SELECT stage_name
    INTO weak_stage
  FROM public.lead_conversions
  WHERE broker_id = target_broker_id
  ORDER BY conversion_rate ASC, sample_size DESC
  LIMIT 1;

  RETURN COALESCE(weak_stage, 'after_first_viewing');
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

ALTER TABLE public.lead_conversions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_performance_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own lead conversions" ON public.lead_conversions;
CREATE POLICY "users manage own lead conversions"
  ON public.lead_conversions FOR ALL
  USING (broker_id = auth.uid())
  WITH CHECK (broker_id = auth.uid());

DROP POLICY IF EXISTS "users manage own broker stats" ON public.broker_performance_stats;
CREATE POLICY "users manage own broker stats"
  ON public.broker_performance_stats FOR ALL
  USING (broker_id = auth.uid())
  WITH CHECK (broker_id = auth.uid());

DROP POLICY IF EXISTS "users read own notifications" ON public.notifications;
CREATE POLICY "users read own notifications"
  ON public.notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "service role notifications full access" ON public.notifications;
CREATE POLICY "service role notifications full access"
  ON public.notifications FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.broker_performance_stats IS
  'Weekly behavioral performance metrics per broker, used by AI coaching insight generator.';
