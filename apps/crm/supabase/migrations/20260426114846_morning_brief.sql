-- ================================================================
-- Revolis.AI — Ambient Morning Brief
-- Migration: morning_brief
-- Depends on: event_pipeline, bri_live_score
-- ================================================================

-- ── Morning brief settings per user ──────────────────────────
CREATE TABLE IF NOT EXISTS public.morning_brief_settings (
  profile_id          UUID      PRIMARY KEY
                                REFERENCES public.profiles(id) ON DELETE CASCADE,
  enabled             BOOLEAN   NOT NULL DEFAULT TRUE,
  delivery_hour_utc   SMALLINT  NOT NULL DEFAULT 6    -- 06:00 UTC = 08:00 SK
    CHECK (delivery_hour_utc BETWEEN 0 AND 23),
  delivery_minute_utc SMALLINT  NOT NULL DEFAULT 0
    CHECK (delivery_minute_utc BETWEEN 0 AND 59),
  channels            TEXT[]    NOT NULL DEFAULT ARRAY['email'],
    -- channels: 'email' | 'push' | 'whatsapp' (future)
  language            TEXT      NOT NULL DEFAULT 'sk',
  lead_count          SMALLINT  NOT NULL DEFAULT 3
    CHECK (lead_count BETWEEN 1 AND 10),
  include_lv_changes  BOOLEAN   NOT NULL DEFAULT TRUE,
  include_arbitrage   BOOLEAN   NOT NULL DEFAULT TRUE,
  include_price_drops BOOLEAN   NOT NULL DEFAULT TRUE,
  include_team_stats  BOOLEAN   NOT NULL DEFAULT FALSE, -- owner only
  a_b_variant         TEXT      NOT NULL DEFAULT 'A'
    CHECK (a_b_variant IN ('A','B')),
    -- A: 3 sentences concise | B: full briefing with context
  push_subscription   JSONB,    -- Web Push API subscription object
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.morning_brief_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users manage own brief settings"
  ON public.morning_brief_settings FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ── Sent briefs log ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.morning_briefs (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  generated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at     TIMESTAMPTZ,
  opened_at        TIMESTAMPTZ,
  clicked_at       TIMESTAMPTZ,
  lead_id_clicked  UUID        REFERENCES public.leads(id),

  -- Content snapshot
  top_lead_id      UUID        REFERENCES public.leads(id),
  top_lead_score   SMALLINT,
  brief_text       TEXT,         -- the 3-sentence AI text
  action_text      TEXT,         -- the specific recommended action
  overnight_count  SMALLINT    NOT NULL DEFAULT 0,

  -- Delivery
  channel          TEXT        NOT NULL DEFAULT 'email',
  a_b_variant      TEXT        NOT NULL DEFAULT 'A',
  subject_line     TEXT,

  -- Stats
  new_leads_count  SMALLINT    NOT NULL DEFAULT 0,
  lv_changes_count SMALLINT    NOT NULL DEFAULT 0,
  arbitrage_count  SMALLINT    NOT NULL DEFAULT 0,
  hot_leads_count  SMALLINT    NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_morning_briefs_profile
  ON public.morning_briefs(profile_id, generated_at DESC);

ALTER TABLE public.morning_briefs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users see own briefs"
  ON public.morning_briefs FOR ALL
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- ── Track open/click via pixel ────────────────────────────────
CREATE OR REPLACE FUNCTION public.record_brief_open(p_brief_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.morning_briefs
  SET opened_at = COALESCE(opened_at, NOW())
  WHERE id = p_brief_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.record_brief_click(
  p_brief_id UUID,
  p_lead_id  UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE public.morning_briefs
  SET
    clicked_at      = COALESCE(clicked_at, NOW()),
    lead_id_clicked = p_lead_id
  WHERE id = p_brief_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── View: brief performance analytics ────────────────────────
CREATE OR REPLACE VIEW public.morning_brief_stats AS
SELECT
  profile_id,
  DATE_TRUNC('week', generated_at) AS week,
  COUNT(*)                          AS briefs_sent,
  COUNT(opened_at)                  AS opened,
  COUNT(clicked_at)                 AS clicked,
  ROUND(COUNT(opened_at) * 100.0 / NULLIF(COUNT(*), 0), 1) AS open_rate_pct,
  ROUND(COUNT(clicked_at) * 100.0 / NULLIF(COUNT(*), 0), 1) AS click_rate_pct,
  ROUND(AVG(top_lead_score), 1)     AS avg_top_lead_score
FROM public.morning_briefs
WHERE generated_at > NOW() - INTERVAL '90 days'
GROUP BY profile_id, DATE_TRUNC('week', generated_at)
ORDER BY week DESC;

COMMENT ON TABLE public.morning_briefs IS
  'Every brief sent: content snapshot, delivery timestamp, open/click tracking. Drives A/B testing and delivery optimization.';
COMMENT ON TABLE public.morning_brief_settings IS
  'Per-user brief preferences: timing, channels, content toggles, push subscription object.';
