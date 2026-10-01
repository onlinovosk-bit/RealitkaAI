-- Moat Capture Blok B: deal_outcomes + moat_ai_recommendations (capture-only layer)
-- Founder GO required before PROD apply. Do not run automatically in CI beyond schema parity.

-- ─── deal_outcomes ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.deal_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  lead_id text NOT NULL REFERENCES public.leads(id),
  outcome text NOT NULL CHECK (outcome IN ('won', 'lost')),
  reason_code text NOT NULL,
  reason_text text,
  negotiation_note text,
  time_to_close_days int,
  agent_id uuid,
  property_type text,
  location text,
  price numeric,
  closed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_outcomes_agency_closed
  ON public.deal_outcomes (agency_id, closed_at DESC);

ALTER TABLE public.deal_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_outcomes_tenant ON public.deal_outcomes;
CREATE POLICY deal_outcomes_tenant
  ON public.deal_outcomes
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  )
  WITH CHECK (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );

DROP POLICY IF EXISTS deal_outcomes_service_role ON public.deal_outcomes;
CREATE POLICY deal_outcomes_service_role
  ON public.deal_outcomes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.deal_outcomes TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.deal_outcomes TO service_role;

-- ─── moat_ai_recommendations (brief: ai_recommendations — separate table; see ODCHÝLKY) ─
CREATE TABLE IF NOT EXISTS public.moat_ai_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  lead_id text REFERENCES public.leads(id),
  source text NOT NULL CHECK (source IN ('triage', 'nba', 'ai_email', 'followup')),
  recommendation text NOT NULL,
  reasoning text,
  confidence numeric,
  status text NOT NULL DEFAULT 'shown'
    CHECK (status IN ('shown', 'accepted', 'rejected', 'expired')),
  acted_at timestamptz,
  outcome text,
  outcome_at timestamptz,
  model_version text,
  dedupe_key text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS moat_ai_rec_dedupe
  ON public.moat_ai_recommendations (dedupe_key)
  WHERE dedupe_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_moat_ai_rec_agency_created
  ON public.moat_ai_recommendations (agency_id, created_at DESC);

ALTER TABLE public.moat_ai_recommendations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS moat_ai_recommendations_tenant ON public.moat_ai_recommendations;
CREATE POLICY moat_ai_recommendations_tenant
  ON public.moat_ai_recommendations
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  )
  WITH CHECK (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );

DROP POLICY IF EXISTS moat_ai_recommendations_service_role ON public.moat_ai_recommendations;
CREATE POLICY moat_ai_recommendations_service_role
  ON public.moat_ai_recommendations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.moat_ai_recommendations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.moat_ai_recommendations TO service_role;
