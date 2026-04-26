-- ================================================================
-- Revolis.AI — BRI Live Score
-- Migration: bri_live_score
-- Depends on: event_pipeline migration
-- ================================================================

-- ── Extended lead_scores table (adds history + velocity) ──────
ALTER TABLE public.lead_scores
  ADD COLUMN IF NOT EXISTS velocity          SMALLINT    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trajectory        TEXT        DEFAULT 'stable'
    CHECK (trajectory IN ('rising','stable','falling','dormant')),
  ADD COLUMN IF NOT EXISTS peak_score        SMALLINT    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_7d_ago      SMALLINT    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_24h_ago     SMALLINT    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consecutive_days  SMALLINT    DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_trigger      TEXT,
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN     DEFAULT FALSE;

-- ── BRI score history — full audit trail ─────────────────────
CREATE TABLE IF NOT EXISTS public.bri_score_history (
  id             UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id     UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lead_id        UUID        NOT NULL REFERENCES public.leads(id)    ON DELETE CASCADE,
  score          SMALLINT    NOT NULL CHECK (score BETWEEN 0 AND 100),
  delta          SMALLINT    NOT NULL DEFAULT 0,
  trigger_event  TEXT        NOT NULL,
  trigger_entity TEXT,
  factors        JSONB       NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bri_history_lead
  ON public.bri_score_history(profile_id, lead_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bri_history_created
  ON public.bri_score_history(created_at DESC);

ALTER TABLE public.bri_score_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own bri history"
  ON public.bri_score_history FOR SELECT
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "service role bri history"
  ON public.bri_score_history FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── BRI signal weights config (per-workspace overrideable) ────
CREATE TABLE IF NOT EXISTS public.bri_config (
  profile_id           UUID    PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  w_recency            NUMERIC(4,3) NOT NULL DEFAULT 0.30,
  w_engagement         NUMERIC(4,3) NOT NULL DEFAULT 0.25,
  w_source_quality     NUMERIC(4,3) NOT NULL DEFAULT 0.20,
  w_property_match     NUMERIC(4,3) NOT NULL DEFAULT 0.15,
  w_base               NUMERIC(4,3) NOT NULL DEFAULT 0.10,
  hot_threshold        SMALLINT     NOT NULL DEFAULT 75,
  notify_on_hot        BOOLEAN      NOT NULL DEFAULT TRUE,
  notify_on_drop       BOOLEAN      NOT NULL DEFAULT TRUE,
  drop_threshold       SMALLINT     NOT NULL DEFAULT 15,
  updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bri_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own bri config"
  ON public.bri_config FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ── Core BRI computation — extended version ───────────────────
CREATE OR REPLACE FUNCTION public.compute_bri_score_v2(
  p_lead_id        UUID,
  p_profile_id     UUID,
  p_trigger_event  TEXT DEFAULT 'manual'
)
RETURNS JSONB AS $$
DECLARE
  v_cfg              public.bri_config%ROWTYPE;
  v_old_score        SMALLINT := 0;
  v_new_score        SMALLINT := 0;
  v_recency          SMALLINT := 0;
  v_engagement       SMALLINT := 0;
  v_source           SMALLINT := 0;
  v_match            SMALLINT := 0;
  v_velocity         SMALLINT := 0;
  v_decay            NUMERIC  := 1.0;
  v_trajectory       TEXT     := 'stable';
  v_last_event       TIMESTAMPTZ;
  v_hours_since      NUMERIC;
  v_events_7d        INTEGER;
  v_events_24h       INTEGER;
  v_events_1h        INTEGER;
  v_score_24h_ago    SMALLINT;
  v_score_7d_ago     SMALLINT;
  v_peak             SMALLINT;
  v_source_type      TEXT;
  v_property_matches INTEGER;
  v_price_drops      INTEGER;
  v_reply_count      INTEGER;
  v_call_count       INTEGER;
  v_result           JSONB;
BEGIN
  -- Load per-workspace config (fallback to defaults)
  SELECT * INTO v_cfg FROM public.bri_config WHERE profile_id = p_profile_id;
  IF NOT FOUND THEN
    INSERT INTO public.bri_config(profile_id) VALUES (p_profile_id)
    ON CONFLICT DO NOTHING;
    SELECT * INTO v_cfg FROM public.bri_config WHERE profile_id = p_profile_id;
  END IF;

  -- Get current cached score
  SELECT bri_score, score_24h_ago, score_7d_ago, peak_score
  INTO v_old_score, v_score_24h_ago, v_score_7d_ago, v_peak
  FROM public.lead_scores
  WHERE lead_id = p_lead_id AND profile_id = p_profile_id;

  v_old_score     := COALESCE(v_old_score, 0);
  v_score_24h_ago := COALESCE(v_score_24h_ago, 0);
  v_score_7d_ago  := COALESCE(v_score_7d_ago, 0);
  v_peak          := COALESCE(v_peak, 0);

  -- ── SIGNAL 1: Recency (weight: w_recency) ─────────────────
  SELECT MAX(created_at) INTO v_last_event
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id   = p_lead_id;

  IF v_last_event IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (NOW() - v_last_event)) / 3600.0;
    -- Steep decay: full score within 2h, zero after 72h
    v_recency := GREATEST(0, LEAST(100,
      CASE
        WHEN v_hours_since <= 1   THEN 100
        WHEN v_hours_since <= 6   THEN 95 - ((v_hours_since - 1)  * 3)::INTEGER
        WHEN v_hours_since <= 24  THEN 80 - ((v_hours_since - 6)  * 2)::INTEGER
        WHEN v_hours_since <= 72  THEN 44 - ((v_hours_since - 24) * 0.7)::INTEGER
        ELSE 0
      END
    ));
  END IF;

  -- ── SIGNAL 2: Engagement velocity (weight: w_engagement) ──
  SELECT
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days'),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours'),
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')
  INTO v_events_7d, v_events_24h, v_events_1h
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id   = p_lead_id;

  -- Velocity bonus: burst of activity in last hour = hot signal
  v_engagement := LEAST(100,
    (v_events_7d  * 5) +
    (v_events_24h * 8) +
    (v_events_1h  * 20)
  );

  -- Count replies and calls — high-value interactions
  SELECT
    COUNT(*) FILTER (WHERE event_type = 'message_replied'),
    COUNT(*) FILTER (WHERE event_type IN ('call_completed', 'call_initiated'))
  INTO v_reply_count, v_call_count
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id   = p_lead_id
    AND created_at  > NOW() - INTERVAL '14 days';

  v_engagement := LEAST(100, v_engagement + (v_reply_count * 15) + (v_call_count * 12));

  -- ── SIGNAL 3: Source quality (weight: w_source_quality) ───
  SELECT payload->>'source' INTO v_source_type
  FROM public.events
  WHERE profile_id   = p_profile_id
    AND entity_type  = 'lead'
    AND entity_id    = p_lead_id
    AND event_type   = 'lead_created'
  ORDER BY created_at LIMIT 1;

  v_source := CASE COALESCE(v_source_type, 'unknown')
    WHEN 'referral'          THEN 95
    WHEN 'direct_call'       THEN 90
    WHEN 'repeat_client'     THEN 88
    WHEN 'portal_priority'   THEN 80
    WHEN 'portal_inquiry'    THEN 70
    WHEN 'website_form'      THEN 60
    WHEN 'social_organic'    THEN 50
    WHEN 'social_ad'         THEN 45
    WHEN 'cold_outreach'     THEN 30
    ELSE 40
  END;

  -- ── SIGNAL 4: Property match & intent (weight: w_property_match) ──
  SELECT COUNT(*) INTO v_property_matches
  FROM public.events
  WHERE profile_id = p_profile_id
    AND entity_type = 'lead'
    AND entity_id   = p_lead_id
    AND event_type  IN ('property_viewed','saved_search','price_alert_clicked','property_matched')
    AND created_at  > NOW() - INTERVAL '30 days';

  -- Price drop signal: motivated seller = higher intent buyer
  SELECT COUNT(*) INTO v_price_drops
  FROM public.events
  WHERE profile_id = p_profile_id
    AND event_type = 'property_price_changed'
    AND (payload->>'direction') = 'down'
    AND created_at > NOW() - INTERVAL '30 days';

  v_match := LEAST(100,
    (v_property_matches * 18) +
    (v_price_drops * 10) +
    20  -- base property intent
  );

  -- ── TIME DECAY multiplier ──────────────────────────────────
  IF v_last_event IS NOT NULL THEN
    v_hours_since := EXTRACT(EPOCH FROM (NOW() - v_last_event)) / 3600.0;
    v_decay := GREATEST(0.05,
      CASE
        WHEN v_hours_since <= 24  THEN 1.0
        WHEN v_hours_since <= 72  THEN 1.0 - ((v_hours_since - 24) / 200.0)
        WHEN v_hours_since <= 168 THEN 0.76 - ((v_hours_since - 72) / 400.0)
        ELSE 0.40
      END
    );
  END IF;

  -- ── WEIGHTED FINAL SCORE ───────────────────────────────────
  v_new_score := GREATEST(0, LEAST(100, (
    (v_recency    * v_cfg.w_recency)        +
    (v_engagement * v_cfg.w_engagement)     +
    (v_source     * v_cfg.w_source_quality) +
    (v_match      * v_cfg.w_property_match) +
    (50           * v_cfg.w_base)
  )::INTEGER));

  -- Apply decay
  v_new_score := GREATEST(0, LEAST(100, (v_new_score * v_decay)::INTEGER));

  -- ── VELOCITY & TRAJECTORY ─────────────────────────────────
  v_velocity := v_new_score - v_score_24h_ago;

  v_trajectory := CASE
    WHEN v_new_score = 0               THEN 'dormant'
    WHEN v_velocity >=  10             THEN 'rising'
    WHEN v_velocity <= -10             THEN 'falling'
    ELSE 'stable'
  END;

  -- Update peak score
  v_peak := GREATEST(v_peak, v_new_score);

  -- ── UPSERT lead_scores cache ──────────────────────────────
  INSERT INTO public.lead_scores(
    profile_id, lead_id,
    bri_score, recency_score, engagement_score,
    source_score, match_score, time_decay,
    velocity, trajectory, peak_score,
    score_24h_ago, score_7d_ago,
    last_trigger, score_factors, computed_at
  )
  VALUES (
    p_profile_id, p_lead_id,
    v_new_score, v_recency, v_engagement,
    v_source, v_match, v_decay,
    v_velocity, v_trajectory, v_peak,
    v_old_score, v_score_7d_ago,
    p_trigger_event,
    jsonb_build_object(
      'recency',    v_recency,
      'engagement', v_engagement,
      'source',     v_source,
      'match',      v_match,
      'decay',      ROUND(v_decay::NUMERIC, 3),
      'velocity',   v_velocity,
      'events_24h', v_events_24h,
      'replies',    v_reply_count,
      'calls',      v_call_count
    ),
    NOW()
  )
  ON CONFLICT (profile_id, lead_id) DO UPDATE SET
    bri_score        = EXCLUDED.bri_score,
    recency_score    = EXCLUDED.recency_score,
    engagement_score = EXCLUDED.engagement_score,
    source_score     = EXCLUDED.source_score,
    match_score      = EXCLUDED.match_score,
    time_decay       = EXCLUDED.time_decay,
    velocity         = EXCLUDED.velocity,
    trajectory       = EXCLUDED.trajectory,
    peak_score       = EXCLUDED.peak_score,
    score_24h_ago    = EXCLUDED.score_24h_ago,
    last_trigger     = EXCLUDED.last_trigger,
    score_factors    = EXCLUDED.score_factors,
    computed_at      = NOW();

  -- ── INSERT history record ─────────────────────────────────
  INSERT INTO public.bri_score_history(
    profile_id, lead_id, score, delta,
    trigger_event, factors
  )
  VALUES (
    p_profile_id, p_lead_id, v_new_score,
    v_new_score - v_old_score,
    p_trigger_event,
    jsonb_build_object(
      'recency', v_recency, 'engagement', v_engagement,
      'source', v_source, 'match', v_match,
      'decay', ROUND(v_decay::NUMERIC,3), 'velocity', v_velocity
    )
  );

  -- Build result payload
  v_result := jsonb_build_object(
    'lead_id',     p_lead_id,
    'old_score',   v_old_score,
    'new_score',   v_new_score,
    'delta',       v_new_score - v_old_score,
    'trajectory',  v_trajectory,
    'velocity',    v_velocity,
    'peak_score',  v_peak,
    'is_hot',      v_new_score >= v_cfg.hot_threshold,
    'trigger',     p_trigger_event,
    'factors', jsonb_build_object(
      'recency',    v_recency,
      'engagement', v_engagement,
      'source',     v_source,
      'match',      v_match,
      'decay',      ROUND(v_decay::NUMERIC, 3)
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Realtime: enable for live subscriptions ───────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.lead_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bri_score_history;

-- ── 7d snapshot job: capture score_7d_ago daily ──────────────
-- Called by cron: SELECT public.rotate_bri_snapshots();
CREATE OR REPLACE FUNCTION public.rotate_bri_snapshots()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.lead_scores
  SET
    score_7d_ago  = score_24h_ago,
    score_24h_ago = bri_score
  WHERE computed_at < NOW() - INTERVAL '20 hours';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE public.bri_score_history IS
  'Full audit trail of every BRI computation. Powers the "score that breathes" chart and trajectory analysis.';
COMMENT ON FUNCTION public.compute_bri_score_v2 IS
  'Extended BRI computation with velocity, trajectory, peak score and per-workspace weight config. Returns JSONB result for immediate use.';
