-- ================================================================
-- Revolis.AI — Historical Price Trail
-- Migration: price_trail
-- Extends: listing_price_history (from arbitrage_engine migration)
-- ================================================================

-- ── Property price trail — works for BOTH portal listings
-- AND manually tracked properties (lead-linked)
CREATE TABLE IF NOT EXISTS public.property_price_trail (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id        UUID          NOT NULL
                                  REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- Source of truth — one of these must be set
  listing_id        UUID          REFERENCES public.portal_listings(id) ON DELETE CASCADE,
  property_id       UUID          REFERENCES public.properties(id)      ON DELETE CASCADE,
  lead_id           TEXT,

  -- The price point
  price             NUMERIC(12,2) NOT NULL,
  currency          TEXT          NOT NULL DEFAULT 'EUR',
  price_per_m2      NUMERIC(10,2),

  -- Context
  source            TEXT          NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','portal_import','admin_export',
                      'bazos_rss','xml_feed','user_input','estimated')),
  recorded_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  recorded_by       UUID          REFERENCES auth.users(id),

  -- Derived delta (vs previous point)
  prev_price        NUMERIC(12,2),
  delta_eur         NUMERIC(12,2),   -- price - prev_price  (negative = drop)
  delta_pct         NUMERIC(6,3),    -- delta / prev_price * 100
  is_drop           BOOLEAN         GENERATED ALWAYS AS (delta_eur < 0) STORED,

  -- Annotation (maklér môže pridať poznámku ku každej zmene)
  note              TEXT,
  internal_only     BOOLEAN       NOT NULL DEFAULT FALSE,

  CONSTRAINT price_trail_entity_check
    CHECK (listing_id IS NOT NULL OR property_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_ppt_profile_listing
  ON public.property_price_trail(profile_id, listing_id, recorded_at DESC)
  WHERE listing_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ppt_profile_property
  ON public.property_price_trail(profile_id, property_id, recorded_at DESC)
  WHERE property_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ppt_profile_lead
  ON public.property_price_trail(profile_id, lead_id, recorded_at DESC)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ppt_drops
  ON public.property_price_trail(profile_id, recorded_at DESC)
  WHERE is_drop = TRUE;

ALTER TABLE public.property_price_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own price trail"
  ON public.property_price_trail FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "service role price trail"
  ON public.property_price_trail FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Seller motivation score per property ─────────────────────
-- Computed and cached — updated on every new price point
CREATE TABLE IF NOT EXISTS public.seller_motivation (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id           UUID    NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id           UUID    REFERENCES public.portal_listings(id) ON DELETE CASCADE,
  property_id          UUID    REFERENCES public.properties(id)      ON DELETE CASCADE,

  -- Motivation score 0–100
  motivation_score     SMALLINT NOT NULL DEFAULT 0
    CHECK (motivation_score BETWEEN 0 AND 100),
  motivation_tier      TEXT    NOT NULL DEFAULT 'unknown'
    CHECK (motivation_tier IN ('urgent','high','medium','low','unknown')),

  -- Component signals
  drop_count           SMALLINT NOT NULL DEFAULT 0,
  total_drop_eur       NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_drop_pct       NUMERIC(6,3) NOT NULL DEFAULT 0,
  days_on_market       SMALLINT,
  days_since_last_drop SMALLINT,
  price_velocity       NUMERIC(8,4),   -- avg drop per day (EUR)
  listing_count        SMALLINT NOT NULL DEFAULT 1,
    -- >1 = relisted after taking off market (very motivated)

  -- Negotiation intelligence
  first_price          NUMERIC(12,2),
  current_price        NUMERIC(12,2),
  estimated_floor      NUMERIC(12,2),   -- our estimate: current - 1 more drop
  negotiation_range    NUMERIC(12,2),   -- first_price - estimated_floor
  best_offer_window    TEXT,            -- 'morning' | 'end_of_month' | 'any'

  -- Cache timestamps
  computed_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trail_start_at       TIMESTAMPTZ,
  trail_end_at         TIMESTAMPTZ,

  UNIQUE (profile_id, listing_id),
  UNIQUE (profile_id, property_id),
  CONSTRAINT sm_entity_check
    CHECK (listing_id IS NOT NULL OR property_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_sm_profile_score
  ON public.seller_motivation(profile_id, motivation_score DESC);

CREATE INDEX IF NOT EXISTS idx_sm_tier
  ON public.seller_motivation(profile_id, motivation_tier)
  WHERE motivation_tier IN ('urgent', 'high');

ALTER TABLE public.seller_motivation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own motivation scores"
  ON public.seller_motivation FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ── Price alert watches — maklér sleduje konkrétnu nehnuteľnosť
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id                UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id        UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id        UUID        REFERENCES public.portal_listings(id) ON DELETE CASCADE,
  property_id       UUID        REFERENCES public.properties(id)      ON DELETE CASCADE,
  lead_id           TEXT,

  watch_type        TEXT        NOT NULL DEFAULT 'any_drop'
    CHECK (watch_type IN ('any_drop','drop_threshold','target_price','relisted')),
  threshold_eur     NUMERIC(12,2),  -- pre drop_threshold
  target_price      NUMERIC(12,2),  -- pre target_price
  notify_email      BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_push       BOOLEAN     NOT NULL DEFAULT TRUE,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,

  last_triggered_at TIMESTAMPTZ,
  trigger_count     SMALLINT    NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT pa_entity_check
    CHECK (listing_id IS NOT NULL OR property_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_alerts_active
  ON public.price_alerts(profile_id, is_active)
  WHERE is_active = TRUE;

ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own alerts"
  ON public.price_alerts FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ── Core SQL function: compute motivation score ───────────────
CREATE OR REPLACE FUNCTION public.compute_motivation_score(
  p_profile_id  UUID,
  p_listing_id  UUID DEFAULT NULL,
  p_property_id UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_points          RECORD;
  v_drop_count      SMALLINT  := 0;
  v_total_drop_eur  NUMERIC   := 0;
  v_total_drop_pct  NUMERIC   := 0;
  v_first_price     NUMERIC   := 0;
  v_current_price   NUMERIC   := 0;
  v_days_on_market  SMALLINT  := 0;
  v_days_since_drop SMALLINT  := 0;
  v_velocity        NUMERIC   := 0;
  v_score           SMALLINT  := 0;
  v_tier            TEXT      := 'unknown';
  v_floor           NUMERIC   := 0;
  v_range           NUMERIC   := 0;
  v_trail_start     TIMESTAMPTZ;
  v_trail_end       TIMESTAMPTZ;
  v_last_drop_at    TIMESTAMPTZ;
  v_result          JSONB;
BEGIN
  -- Load price trail
  SELECT
    MIN(price)                                           AS min_price,
    MAX(price)                                           AS max_price,
    (array_agg(price ORDER BY recorded_at ASC))[1]       AS first_p,
    (array_agg(price ORDER BY recorded_at DESC))[1]      AS last_p,
    COUNT(*) FILTER (WHERE is_drop = TRUE)               AS drops,
    SUM(ABS(delta_eur)) FILTER (WHERE is_drop = TRUE)    AS total_drop,
    MIN(recorded_at)                                     AS trail_start,
    MAX(recorded_at)                                     AS trail_end,
    MAX(recorded_at) FILTER (WHERE is_drop = TRUE)       AS last_drop
  INTO v_points
  FROM public.property_price_trail
  WHERE profile_id = p_profile_id
    AND (
      (p_listing_id  IS NOT NULL AND listing_id  = p_listing_id)  OR
      (p_property_id IS NOT NULL AND property_id = p_property_id)
    );

  IF v_points.first_p IS NULL THEN
    RETURN jsonb_build_object('score', 0, 'tier', 'unknown', 'error', 'no_trail');
  END IF;

  v_first_price    := v_points.first_p;
  v_current_price  := v_points.last_p;
  v_drop_count     := COALESCE(v_points.drops, 0);
  v_total_drop_eur := COALESCE(v_points.total_drop, 0);
  v_trail_start    := v_points.trail_start;
  v_trail_end      := v_points.trail_end;
  v_last_drop_at   := v_points.last_drop;

  -- Days on market
  v_days_on_market := GREATEST(1,
    EXTRACT(DAY FROM (v_trail_end - v_trail_start))::SMALLINT
  );

  -- Days since last drop
  IF v_last_drop_at IS NOT NULL THEN
    v_days_since_drop := EXTRACT(DAY FROM (NOW() - v_last_drop_at))::SMALLINT;
  END IF;

  -- Total drop % (from first to current)
  IF v_first_price > 0 THEN
    v_total_drop_pct := ROUND(
      ((v_first_price - v_current_price) / v_first_price) * 100, 3
    );
  END IF;

  -- Price velocity (EUR per day, negative = dropping)
  IF v_days_on_market > 0 THEN
    v_velocity := ROUND(
      (v_current_price - v_first_price) / v_days_on_market, 4
    );
  END IF;

  -- ── SCORING ───────────────────────────────────────────────
  -- Drop count signal (0–30 pts)
  v_score := v_score + LEAST(30, v_drop_count * 10);

  -- Drop magnitude signal (0–25 pts)
  v_score := v_score + CASE
    WHEN v_total_drop_pct >= 20 THEN 25
    WHEN v_total_drop_pct >= 15 THEN 20
    WHEN v_total_drop_pct >= 10 THEN 15
    WHEN v_total_drop_pct >= 5  THEN 10
    WHEN v_total_drop_pct >= 2  THEN 5
    ELSE 0
  END;

  -- Days on market signal (0–20 pts)
  v_score := v_score + CASE
    WHEN v_days_on_market >= 180 THEN 20
    WHEN v_days_on_market >= 90  THEN 15
    WHEN v_days_on_market >= 60  THEN 10
    WHEN v_days_on_market >= 30  THEN 5
    ELSE 0
  END;

  -- Recency of last drop (0–15 pts): fresh drop = more motivated
  IF v_last_drop_at IS NOT NULL THEN
    v_score := v_score + CASE
      WHEN v_days_since_drop <= 7   THEN 15
      WHEN v_days_since_drop <= 14  THEN 12
      WHEN v_days_since_drop <= 30  THEN 8
      WHEN v_days_since_drop <= 60  THEN 4
      ELSE 1
    END;
  END IF;

  -- Velocity bonus (0–10 pts): price dropping faster = more motivated
  v_score := v_score + CASE
    WHEN v_velocity < -200 THEN 10
    WHEN v_velocity < -100 THEN 7
    WHEN v_velocity < -50  THEN 4
    WHEN v_velocity < -10  THEN 2
    ELSE 0
  END;

  v_score := LEAST(100, GREATEST(0, v_score));

  -- ── TIER ──────────────────────────────────────────────────
  v_tier := CASE
    WHEN v_score >= 75  THEN 'urgent'
    WHEN v_score >= 55  THEN 'high'
    WHEN v_score >= 35  THEN 'medium'
    WHEN v_score >= 15  THEN 'low'
    ELSE 'unknown'
  END;

  -- ── NEGOTIATION INTELLIGENCE ──────────────────────────────
  -- Estimate floor: if they dropped N times they'll drop again
  -- Floor estimate: current - (avg drop per event)
  IF v_drop_count > 0 THEN
    v_floor := ROUND(
      v_current_price - (v_total_drop_eur / v_drop_count), -3
    );
    v_floor := GREATEST(v_current_price * 0.80, v_floor); -- never below 20% of current
  ELSE
    v_floor := v_current_price * 0.95;
  END IF;

  v_range := ROUND(v_first_price - v_floor, -2);

  -- ── UPSERT seller_motivation cache ───────────────────────
  INSERT INTO public.seller_motivation(
    profile_id, listing_id, property_id,
    motivation_score, motivation_tier,
    drop_count, total_drop_eur, total_drop_pct,
    days_on_market, days_since_last_drop, price_velocity,
    first_price, current_price, estimated_floor, negotiation_range,
    computed_at, trail_start_at, trail_end_at
  )
  VALUES (
    p_profile_id, p_listing_id, p_property_id,
    v_score, v_tier,
    v_drop_count, v_total_drop_eur, v_total_drop_pct,
    v_days_on_market, v_days_since_drop, v_velocity,
    v_first_price, v_current_price, v_floor, v_range,
    NOW(), v_trail_start, v_trail_end
  )
  ON CONFLICT (profile_id, listing_id)
    WHERE listing_id IS NOT NULL
  DO UPDATE SET
    motivation_score    = EXCLUDED.motivation_score,
    motivation_tier     = EXCLUDED.motivation_tier,
    drop_count          = EXCLUDED.drop_count,
    total_drop_eur      = EXCLUDED.total_drop_eur,
    total_drop_pct      = EXCLUDED.total_drop_pct,
    days_on_market      = EXCLUDED.days_on_market,
    days_since_last_drop= EXCLUDED.days_since_last_drop,
    price_velocity      = EXCLUDED.price_velocity,
    first_price         = EXCLUDED.first_price,
    current_price       = EXCLUDED.current_price,
    estimated_floor     = EXCLUDED.estimated_floor,
    negotiation_range   = EXCLUDED.negotiation_range,
    computed_at         = NOW(),
    trail_end_at        = EXCLUDED.trail_end_at;

  v_result := jsonb_build_object(
    'score',               v_score,
    'tier',                v_tier,
    'drop_count',          v_drop_count,
    'total_drop_eur',      v_total_drop_eur,
    'total_drop_pct',      v_total_drop_pct,
    'days_on_market',      v_days_on_market,
    'days_since_last_drop',v_days_since_drop,
    'price_velocity',      v_velocity,
    'first_price',         v_first_price,
    'current_price',       v_current_price,
    'estimated_floor',     v_floor,
    'negotiation_range',   v_range,
    'trail_start_at',      v_trail_start
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Add new price point + auto-compute motivation ─────────────
CREATE OR REPLACE FUNCTION public.add_price_point(
  p_profile_id  UUID,
  p_price       NUMERIC,
  p_source      TEXT     DEFAULT 'manual',
  p_listing_id  UUID     DEFAULT NULL,
  p_property_id UUID     DEFAULT NULL,
  p_lead_id     TEXT     DEFAULT NULL,
  p_note        TEXT     DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_prev_price  NUMERIC;
  v_delta_eur   NUMERIC;
  v_delta_pct   NUMERIC;
  v_new_id      UUID;
  v_motivation  JSONB;
BEGIN
  -- Get previous price point
  SELECT price INTO v_prev_price
  FROM public.property_price_trail
  WHERE profile_id = p_profile_id
    AND (
      (p_listing_id  IS NOT NULL AND listing_id  = p_listing_id)  OR
      (p_property_id IS NOT NULL AND property_id = p_property_id)
    )
  ORDER BY recorded_at DESC
  LIMIT 1;

  -- Compute delta
  IF v_prev_price IS NOT NULL AND v_prev_price > 0 THEN
    v_delta_eur := p_price - v_prev_price;
    v_delta_pct := ROUND((v_delta_eur / v_prev_price) * 100, 3);
  END IF;

  -- Insert price point
  INSERT INTO public.property_price_trail(
    profile_id, listing_id, property_id, lead_id,
    price, source, prev_price, delta_eur, delta_pct, note
  )
  VALUES (
    p_profile_id, p_listing_id, p_property_id, p_lead_id,
    p_price, p_source, v_prev_price, v_delta_eur, v_delta_pct, p_note
  )
  RETURNING id INTO v_new_id;

  -- Recompute motivation score
  v_motivation := public.compute_motivation_score(
    p_profile_id, p_listing_id, p_property_id
  );

  RETURN jsonb_build_object(
    'point_id',   v_new_id,
    'price',      p_price,
    'prev_price', v_prev_price,
    'delta_eur',  v_delta_eur,
    'delta_pct',  v_delta_pct,
    'is_drop',    COALESCE(v_delta_eur < 0, FALSE),
    'motivation', v_motivation
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Negotiation brief view — ready for UI ─────────────────────
CREATE OR REPLACE VIEW public.negotiation_briefs AS
SELECT
  sm.profile_id,
  sm.listing_id,
  sm.property_id,
  sm.motivation_score,
  sm.motivation_tier,
  sm.drop_count,
  ROUND(sm.total_drop_eur, 0)             AS total_drop_eur,
  ROUND(sm.total_drop_pct, 1)             AS total_drop_pct,
  sm.days_on_market,
  sm.days_since_last_drop,
  ROUND(sm.first_price, 0)                AS first_price,
  ROUND(sm.current_price, 0)              AS current_price,
  ROUND(sm.estimated_floor, 0)            AS estimated_floor,
  ROUND(sm.negotiation_range, 0)          AS negotiation_range,
  sm.computed_at,
  -- Human-readable brief (generated in SQL for speed)
  CASE sm.motivation_tier
    WHEN 'urgent' THEN
      'Cena klesla ' || sm.drop_count || '× o ' ||
      ROUND(sm.total_drop_pct,1) || '% za ' || sm.days_on_market ||
      ' dní. Predajca je urgentne motivovaný. Odporúčaná ponuka: ' ||
      TO_CHAR(ROUND(sm.estimated_floor,-3), 'FM999G999') || ' €.'
    WHEN 'high' THEN
      'Cena klesla ' || sm.drop_count || '×, celkovo -' ||
      ROUND(sm.total_drop_pct,1) || '%. Vyjednávací priestor: ' ||
      TO_CHAR(ROUND(sm.negotiation_range,-2), 'FM999G999') || ' €.'
    WHEN 'medium' THEN
      sm.drop_count || ' pokles(-y) za ' || sm.days_on_market ||
      ' dní. Štandardný vyjednávací potenciál.'
    ELSE 'Nedostatočná história na hodnotenie.'
  END                                     AS motivation_brief,
  -- Listing details join
  pl.title                                AS listing_title,
  pl.city,
  pl.street,
  pl.area_m2,
  pl.rooms,
  pl.cover_photo_url,
  pl.external_url                         AS portal_url
FROM public.seller_motivation  sm
LEFT JOIN public.portal_listings pl
  ON pl.id = sm.listing_id;

-- ── Realtime: push trail updates to UI ───────────────────────
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.property_price_trail;
ALTER PUBLICATION supabase_realtime
  ADD TABLE public.seller_motivation;

COMMENT ON TABLE public.property_price_trail IS
  'Full price history for every tracked property. The compounding asset: older the Revolis installation, richer this table. Powers negotiation intelligence, seller motivation scoring, and market analytics.';
COMMENT ON TABLE public.seller_motivation IS
  'Computed seller motivation score per property. Updated on every new price point. The "negotiation weapon": urgency tier + estimated floor + negotiation range pre-computed and ready to display.';
COMMENT ON FUNCTION public.add_price_point IS
  'Single entry point for all new price data. Handles delta computation, trail insert, and motivation score recomputation atomically.';
