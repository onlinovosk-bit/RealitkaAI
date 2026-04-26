-- ================================================================
-- Revolis.AI — Cross-Portal Arbitrage Engine
-- Migration: arbitrage_engine
-- ================================================================

-- ── Raw portal listings cache ─────────────────────────────────
-- Every scraped/imported listing lands here first
CREATE TABLE IF NOT EXISTS public.portal_listings (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- null profile_id = public/shared cache (Bazoš public feed)

  source           TEXT        NOT NULL
    CHECK (source IN ('nehnutelnosti_sk','bazos_sk','reality_sk',
                      'byty_sk','topreality_sk')),
  external_id      TEXT        NOT NULL,   -- portálové ID inzerátu
  external_url     TEXT,

  -- Core fields
  title            TEXT        NOT NULL,
  price            NUMERIC(12,2),
  currency         TEXT        DEFAULT 'EUR',
  price_per_m2     NUMERIC(10,2),
  area_m2          NUMERIC(8,2),
  rooms            NUMERIC(4,1),
  floor            TEXT,
  property_type    TEXT,       -- apartment|house|land|commercial
  transaction_type TEXT        DEFAULT 'sale',  -- sale|rent

  -- Location (structured + raw)
  street           TEXT,
  city             TEXT,
  district         TEXT,
  region           TEXT,
  postal_code      TEXT,
  lat              NUMERIC(10,7),
  lng              NUMERIC(10,7),
  location_raw     TEXT,       -- original string from portal

  -- Computed fingerprint for cross-portal matching
  location_hash    TEXT,       -- SHA256(normalised_city + normalised_street)
  property_hash    TEXT,       -- SHA256(type + rooms + area_bucket + location_hash)

  -- Metadata
  seller_type      TEXT        DEFAULT 'unknown',  -- agency|private
  seller_name      TEXT,
  seller_phone     TEXT,
  seller_email     TEXT,
  description      TEXT,
  photo_count      SMALLINT    DEFAULT 0,
  cover_photo_url  TEXT,

  -- Lifecycle
  first_seen_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_price       NUMERIC(12,2),  -- price on previous scan
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  disappeared_at   TIMESTAMPTZ,    -- when listing vanished (sold?)

  UNIQUE (source, external_id)
);

CREATE INDEX IF NOT EXISTS idx_listings_source
  ON public.portal_listings(source, is_active);
CREATE INDEX IF NOT EXISTS idx_listings_prop_hash
  ON public.portal_listings(property_hash)
  WHERE property_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_location_hash
  ON public.portal_listings(location_hash)
  WHERE location_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listings_city_price
  ON public.portal_listings(city, price)
  WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_listings_profile
  ON public.portal_listings(profile_id)
  WHERE profile_id IS NOT NULL;

-- ── Price history per listing ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.listing_price_history (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id   UUID        NOT NULL
                           REFERENCES public.portal_listings(id) ON DELETE CASCADE,
  source       TEXT        NOT NULL,
  price        NUMERIC(12,2) NOT NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_listing
  ON public.listing_price_history(listing_id, recorded_at DESC);

-- ── Arbitrage matches ─────────────────────────────────────────
-- A pair: one nehnutelnosti.sk listing + one bazos.sk listing
-- matched as likely the same property
CREATE TABLE IF NOT EXISTS public.arbitrage_matches (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,

  listing_portal   UUID        NOT NULL
                               REFERENCES public.portal_listings(id),
  listing_bazos    UUID        NOT NULL
                               REFERENCES public.portal_listings(id),

  -- Prices at time of match
  price_portal     NUMERIC(12,2) NOT NULL,
  price_bazos      NUMERIC(12,2) NOT NULL,
  delta_eur        NUMERIC(12,2) NOT NULL,  -- portal - bazos
  delta_pct        NUMERIC(5,2) NOT NULL,   -- delta / portal * 100

  -- Match confidence
  match_score      NUMERIC(4,3) NOT NULL,   -- 0.0 – 1.0
  match_reasons    TEXT[]       NOT NULL DEFAULT '{}',
    -- 'same_street','same_area','same_rooms','same_type','same_price_range'

  -- Location
  city             TEXT,
  address_display  TEXT,

  -- Motivation signals
  price_drop_count SMALLINT    NOT NULL DEFAULT 0,
  days_on_market   SMALLINT,
  seller_is_private BOOLEAN    DEFAULT FALSE,
    -- private seller on Bazoš = likely motivated = higher priority

  -- State
  status           TEXT        NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','viewed','contacted','dismissed','expired')),
  dismissed_reason TEXT,
  lead_id          TEXT,

  detected_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '14 days'),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (listing_portal, listing_bazos)
);

CREATE INDEX IF NOT EXISTS idx_arb_profile_status
  ON public.arbitrage_matches(profile_id, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_arb_delta_pct
  ON public.arbitrage_matches(delta_pct DESC)
  WHERE status = 'new';
CREATE INDEX IF NOT EXISTS idx_arb_city
  ON public.arbitrage_matches(city, status);

-- Auto-expire old matches
CREATE INDEX IF NOT EXISTS idx_arb_expires
  ON public.arbitrage_matches(expires_at)
  WHERE status = 'new';

-- ── Scan config per workspace ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.arbitrage_config (
  profile_id         UUID    PRIMARY KEY
                             REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled            BOOLEAN NOT NULL DEFAULT TRUE,
  regions            TEXT[]  NOT NULL DEFAULT ARRAY['Prešov','Košice'],
  cities             TEXT[]  NOT NULL DEFAULT '{}',
  min_delta_pct      NUMERIC(5,2) NOT NULL DEFAULT 8.0,
  min_delta_eur      NUMERIC(10,2) NOT NULL DEFAULT 5000,
  min_match_score    NUMERIC(4,3) NOT NULL DEFAULT 0.65,
  transaction_types  TEXT[]  NOT NULL DEFAULT ARRAY['sale'],
  property_types     TEXT[]  NOT NULL DEFAULT ARRAY['apartment','house'],
  price_min          NUMERIC(12,2),
  price_max          NUMERIC(12,2),
  notify_email       BOOLEAN NOT NULL DEFAULT TRUE,
  notify_push        BOOLEAN NOT NULL DEFAULT TRUE,
  last_scan_at       TIMESTAMPTZ,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.arbitrage_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own arbitrage config"
  ON public.arbitrage_config FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ── RLS for matches and listings ─────────────────────────────
ALTER TABLE public.arbitrage_matches  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users see own arbitrage matches"
  ON public.arbitrage_matches FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "users see own or public listings"
  ON public.portal_listings FOR SELECT
  USING (
    profile_id IS NULL OR
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

CREATE POLICY "service role listings full access"
  ON public.portal_listings FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "service role matches full access"
  ON public.arbitrage_matches FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "users see own price history"
  ON public.listing_price_history FOR SELECT
  USING (
    listing_id IN (
      SELECT id FROM public.portal_listings
      WHERE profile_id IS NULL OR profile_id IN (
        SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
      )
    )
  );

CREATE POLICY "service role price history"
  ON public.listing_price_history FOR ALL
  USING  (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── Arbitrage stats view ──────────────────────────────────────
CREATE OR REPLACE VIEW public.arbitrage_stats AS
SELECT
  profile_id,
  COUNT(*)                                          AS total_matches,
  COUNT(*) FILTER (WHERE status = 'new')            AS new_matches,
  COUNT(*) FILTER (WHERE status = 'contacted')      AS contacted,
  COUNT(*) FILTER (WHERE status = 'dismissed')      AS dismissed,
  ROUND(AVG(delta_pct),1)                           AS avg_delta_pct,
  ROUND(AVG(delta_eur),0)                           AS avg_delta_eur,
  MAX(delta_eur)                                    AS max_delta_eur,
  ROUND(AVG(match_score)::NUMERIC, 3)               AS avg_match_score,
  COUNT(*) FILTER (WHERE seller_is_private = TRUE)  AS private_sellers,
  MAX(detected_at)                                  AS last_detected_at
FROM public.arbitrage_matches
WHERE detected_at > NOW() - INTERVAL '30 days'
GROUP BY profile_id;

-- ── Property hash helper function ────────────────────────────
CREATE OR REPLACE FUNCTION public.compute_property_hash(
  p_type   TEXT,
  p_rooms  NUMERIC,
  p_area   NUMERIC,
  p_city   TEXT,
  p_street TEXT
) RETURNS TEXT AS $$
DECLARE
  -- Area bucket: round to nearest 5m² to absorb minor differences
  v_area_bucket  INTEGER := ROUND(COALESCE(p_area, 0) / 5) * 5;
  -- Rooms bucket: round to nearest 0.5
  v_rooms_bucket NUMERIC := ROUND(COALESCE(p_rooms, 0) * 2) / 2;
  v_city_norm    TEXT    := LOWER(TRIM(REGEXP_REPLACE(
                              COALESCE(p_city,''), '[^a-záäčďéíľĺňóôŕšťúýž ]','','g')));
  v_street_norm  TEXT    := LOWER(TRIM(REGEXP_REPLACE(
                              COALESCE(p_street,''), '\s+(ul\.|ulica|nám\.|námestie|sídl\.|sídlisko)','','gi')));
  v_input        TEXT;
BEGIN
  v_input := CONCAT_WS('|',
    LOWER(COALESCE(p_type,  'unknown')),
    v_rooms_bucket::TEXT,
    v_area_bucket::TEXT,
    v_city_norm,
    v_street_norm
  );
  RETURN MD5(v_input);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ── Auto-expire old matches daily ────────────────────────────
CREATE OR REPLACE FUNCTION public.expire_arbitrage_matches()
RETURNS INTEGER AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE public.arbitrage_matches
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'new'
    AND expires_at < NOW();
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── Enable realtime on matches ────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication p
    WHERE p.pubname = 'supabase_realtime'
  ) AND NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables t
    WHERE t.pubname = 'supabase_realtime'
      AND t.schemaname = 'public'
      AND t.tablename = 'arbitrage_matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.arbitrage_matches;
  END IF;
END $$;

COMMENT ON TABLE public.portal_listings IS
  'Raw cache of all scraped listings from nehnutelnosti.sk, Bazoš.sk and other portals. Cross-portal matching runs against this table.';
COMMENT ON TABLE public.arbitrage_matches IS
  'Detected price arbitrage pairs. One portal listing + one Bazoš listing for the same property at different prices. The delta is the acquisition opportunity.';
