-- ================================================================
-- Revolis.AI — Broker Trust Protocol (Blue Ocean)
-- Migration: broker_trust_protocol
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.broker_profiles (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  slug            TEXT        UNIQUE NOT NULL,
  display_name    TEXT,
  agency_name     TEXT,
  bio             TEXT,
  is_public       BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_badge  BOOLEAN     NOT NULL DEFAULT FALSE,
  plan_tier       TEXT        NOT NULL DEFAULT 'market_vision'
    CHECK (plan_tier IN ('market_vision','authority')),
  metrics         JSONB       NOT NULL DEFAULT '{
    "response_time_avg": 0,
    "deals_closed": 0,
    "bri_accuracy": 0
  }'::jsonb,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_profiles_public
  ON public.broker_profiles(is_public, slug);
CREATE INDEX IF NOT EXISTS idx_broker_profiles_user
  ON public.broker_profiles(user_id);

CREATE TABLE IF NOT EXISTS public.broker_events (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id      UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_type      TEXT        NOT NULL
    CHECK (event_type IN ('message_received','message_responded','deal_closed','bri_scored')),
  lead_id         TEXT,
  received_at     TIMESTAMPTZ,
  responded_at    TIMESTAMPTZ,
  bri_predicted   NUMERIC(6,3),
  bri_actual      NUMERIC(6,3),
  payload         JSONB       NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broker_events_user_type
  ON public.broker_events(user_id, event_type, created_at DESC);

CREATE OR REPLACE FUNCTION public.recompute_broker_metrics(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_response_time_avg NUMERIC := 0;
  v_deals_closed      INTEGER := 0;
  v_bri_accuracy      NUMERIC := 0;
BEGIN
  SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (responded_at - received_at)) / 60.0), 0)
    INTO v_response_time_avg
  FROM public.broker_events
  WHERE user_id = p_user_id
    AND event_type = 'message_responded'
    AND responded_at IS NOT NULL
    AND received_at IS NOT NULL
    AND responded_at >= received_at;

  SELECT COUNT(*) INTO v_deals_closed
  FROM public.broker_events
  WHERE user_id = p_user_id
    AND event_type = 'deal_closed';

  SELECT COALESCE(
    100 - AVG(ABS(COALESCE(bri_predicted, 0) - COALESCE(bri_actual, 0))) * 100,
    0
  ) INTO v_bri_accuracy
  FROM public.broker_events
  WHERE user_id = p_user_id
    AND event_type = 'bri_scored'
    AND bri_predicted IS NOT NULL
    AND bri_actual IS NOT NULL;

  v_bri_accuracy := GREATEST(0, LEAST(100, v_bri_accuracy));

  UPDATE public.broker_profiles
  SET metrics = jsonb_build_object(
      'response_time_avg', ROUND(v_response_time_avg, 1),
      'deals_closed', v_deals_closed,
      'bri_accuracy', ROUND(v_bri_accuracy, 1)
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.calculate_broker_metrics()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM public.recompute_broker_metrics(NEW.user_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_calculate_broker_metrics ON public.broker_events;
CREATE TRIGGER trg_calculate_broker_metrics
AFTER INSERT OR UPDATE ON public.broker_events
FOR EACH ROW
EXECUTE FUNCTION public.calculate_broker_metrics();

ALTER TABLE public.broker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.broker_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public read broker profile by slug" ON public.broker_profiles;
CREATE POLICY "public read broker profile by slug"
  ON public.broker_profiles FOR SELECT
  USING (is_public = TRUE);

DROP POLICY IF EXISTS "owners manage broker profile" ON public.broker_profiles;
CREATE POLICY "owners manage broker profile"
  ON public.broker_profiles FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "owners manage broker events" ON public.broker_events;
CREATE POLICY "owners manage broker events"
  ON public.broker_events FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "service role broker profiles full access" ON public.broker_profiles;
CREATE POLICY "service role broker profiles full access"
  ON public.broker_profiles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role broker events full access" ON public.broker_events;
CREATE POLICY "service role broker events full access"
  ON public.broker_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.broker_profiles IS
  'Public trust certificate profile for brokers (slug-based reputation page).';
COMMENT ON TABLE public.broker_events IS
  'Event stream used to compute trust metrics: response speed, closed deals, BRI accuracy.';
