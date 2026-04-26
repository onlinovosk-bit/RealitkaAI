-- ================================================================
-- Revolis.AI Event Sourcing Pipeline
-- Migration: event_pipeline (compat variant for existing schemas)
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Core events table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.events (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type    TEXT        NOT NULL CHECK (entity_type IN (
                               'lead','property','contact','message',
                               'call','import','export','session','system')),
  entity_id      TEXT,
  event_type     TEXT        NOT NULL,
  payload        JSONB       NOT NULL DEFAULT '{}',
  session_id     TEXT,
  user_agent     TEXT,
  ip_hash        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS profile_id UUID,
  ADD COLUMN IF NOT EXISTS entity_type TEXT,
  ADD COLUMN IF NOT EXISTS entity_id TEXT,
  ADD COLUMN IF NOT EXISTS event_type TEXT,
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS session_id TEXT,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_events_profile_id
  ON public.events(profile_id);
CREATE INDEX IF NOT EXISTS idx_events_entity
  ON public.events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_events_type_created
  ON public.events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON public.events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_payload
  ON public.events USING gin(payload jsonb_path_ops);

-- ── Lead score cache table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       UUID         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id          TEXT         NOT NULL,
  bri_score        SMALLINT     NOT NULL DEFAULT 0 CHECK (bri_score BETWEEN 0 AND 100),
  recency_score    SMALLINT     NOT NULL DEFAULT 0,
  engagement_score SMALLINT     NOT NULL DEFAULT 0,
  source_score     SMALLINT     NOT NULL DEFAULT 0,
  match_score      SMALLINT     NOT NULL DEFAULT 0,
  time_decay       NUMERIC(4,3) NOT NULL DEFAULT 1.0,
  score_factors    JSONB        NOT NULL DEFAULT '{}',
  computed_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, lead_id)
);

ALTER TABLE public.lead_scores
  ADD COLUMN IF NOT EXISTS profile_id UUID,
  ADD COLUMN IF NOT EXISTS lead_id TEXT,
  ADD COLUMN IF NOT EXISTS bri_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS recency_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS engagement_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS source_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS match_score SMALLINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS time_decay NUMERIC(4,3) DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS score_factors JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS computed_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_lead_scores_profile_bri
  ON public.lead_scores(profile_id, bri_score DESC);

-- ── Integrity alerts table ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.integrity_alerts (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  triggered_by   UUID        REFERENCES auth.users(id),
  alert_type     TEXT        NOT NULL CHECK (alert_type IN (
                               'bulk_export','unusual_access','off_hours',
                               'mass_view','data_download')),
  threshold_hit  INTEGER     NOT NULL,
  payload        JSONB       NOT NULL DEFAULT '{}',
  resolved_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.integrity_alerts
  ADD COLUMN IF NOT EXISTS profile_id UUID,
  ADD COLUMN IF NOT EXISTS triggered_by UUID,
  ADD COLUMN IF NOT EXISTS alert_type TEXT,
  ADD COLUMN IF NOT EXISTS threshold_hit INTEGER,
  ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- ── RLS and policies ───────────────────────────────────────────
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integrity_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users see own profile events" ON public.events;
CREATE POLICY "users see own profile events"
  ON public.events FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "users insert own profile events" ON public.events;
CREATE POLICY "users insert own profile events"
  ON public.events FOR INSERT
  WITH CHECK (
    profile_id IN (
      SELECT id FROM public.profiles
      WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "service role full access" ON public.events;
CREATE POLICY "service role full access"
  ON public.events
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "users see own scores" ON public.lead_scores;
CREATE POLICY "users see own scores"
  ON public.lead_scores FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner sees own workspace alerts" ON public.integrity_alerts;
CREATE POLICY "owner sees own workspace alerts"
  ON public.integrity_alerts FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ── Helper function: safe event insert ────────────────────────
CREATE OR REPLACE FUNCTION public.log_event(
  p_profile_id  UUID,
  p_entity_type TEXT,
  p_entity_id   TEXT,
  p_event_type  TEXT,
  p_payload     JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.events(profile_id, entity_type, entity_id, event_type, payload)
  VALUES (p_profile_id, p_entity_type, p_entity_id, p_event_type, p_payload)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── BRI score computation function ────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_bri_score(p_lead_id TEXT, p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_score        INTEGER := 0;
  v_recency      INTEGER := 0;
  v_engagement   INTEGER := 0;
  v_source       INTEGER := 0;
  v_match        INTEGER := 0;
  v_decay        NUMERIC := 1.0;
  v_last_event   TIMESTAMPTZ;
  v_event_count  INTEGER;
  v_hours_since  NUMERIC;
BEGIN
  SELECT MAX(created_at) INTO v_last_event
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id = p_lead_id;

  IF v_last_event IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (NOW() - v_last_event)) / 3600;
    v_recency := GREATEST(0, LEAST(100, 100 - (v_hours_since * 1.2)::INTEGER));
  END IF;

  SELECT COUNT(*) INTO v_event_count
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id = p_lead_id
    AND created_at > NOW() - INTERVAL '7 days';

  v_engagement := LEAST(100, v_event_count * 12);

  SELECT CASE
    WHEN payload->>'source' = 'referral'         THEN 90
    WHEN payload->>'source' = 'direct_call'      THEN 85
    WHEN payload->>'source' = 'portal_inquiry'   THEN 70
    WHEN payload->>'source' = 'website_form'     THEN 60
    WHEN payload->>'source' = 'social_media'     THEN 50
    ELSE 40
  END INTO v_source
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id = p_lead_id
    AND event_type = 'lead_created'
  LIMIT 1;

  v_source := COALESCE(v_source, 40);

  SELECT LEAST(100, COUNT(*) * 20) INTO v_match
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id = p_lead_id
    AND event_type IN ('property_viewed','saved_search','price_alert_clicked');

  IF v_last_event IS NOT NULL THEN
    v_decay := GREATEST(0.1, 1.0 - (EXTRACT(EPOCH FROM (NOW() - v_last_event)) / 86400 * 0.03));
  END IF;

  v_score := (
    (v_recency    * 0.30) +
    (v_engagement * 0.25) +
    (v_source     * 0.20) +
    (v_match      * 0.15) +
    (40           * 0.10)
  )::INTEGER;

  v_score := GREATEST(0, LEAST(100, (v_score * v_decay)::INTEGER));

  INSERT INTO public.lead_scores(
    profile_id, lead_id, bri_score,
    recency_score, engagement_score, source_score, match_score,
    time_decay, score_factors, computed_at
  )
  VALUES (
    p_profile_id, p_lead_id, v_score,
    v_recency, v_engagement, v_source, v_match,
    v_decay,
    jsonb_build_object(
      'recency', v_recency, 'engagement', v_engagement,
      'source', v_source, 'match', v_match, 'decay', v_decay
    ),
    NOW()
  )
  ON CONFLICT (profile_id, lead_id)
  DO UPDATE SET
    bri_score        = EXCLUDED.bri_score,
    recency_score    = EXCLUDED.recency_score,
    engagement_score = EXCLUDED.engagement_score,
    source_score     = EXCLUDED.source_score,
    match_score      = EXCLUDED.match_score,
    time_decay       = EXCLUDED.time_decay,
    score_factors    = EXCLUDED.score_factors,
    computed_at      = NOW();

  RETURN v_score;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.events IS 'Event sourcing foundation — every user action, system event, and AI signal is stored here. The source of truth for BRI scoring, Integrity Monitor, Ghost Resurrection and Morning Brief.';