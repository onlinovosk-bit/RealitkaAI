-- Genome Layer 2 — Prediction Registry + exclusivity outcomes (idempotent, CI + prod parity)
-- Applied manually on PROD; this file keeps ephemeral CI DB aligned.

CREATE TABLE IF NOT EXISTS public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  lead_id text NOT NULL,
  decision text NOT NULL,
  p_outcome numeric,
  expected_value_eur numeric,
  confidence numeric,
  expected_outcome text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_decisions_agency_lead ON public.decisions (agency_id, lead_id);
CREATE INDEX IF NOT EXISTS idx_decisions_status ON public.decisions (status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.exclusivity_outcomes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  decision_id uuid REFERENCES public.decisions (id) ON DELETE SET NULL,
  lead_id text,
  outcome text NOT NULL,
  outcome_value_eur numeric,
  recorded_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_exclusivity_outcomes_agency ON public.exclusivity_outcomes (agency_id, recorded_at DESC);

CREATE OR REPLACE VIEW public.genome_decision_open AS
SELECT
  d.id,
  d.agency_id,
  d.lead_id,
  d.decision,
  d.p_outcome,
  d.expected_value_eur,
  d.confidence,
  d.expected_outcome,
  d.status,
  d.created_at
FROM public.decisions d
WHERE d.status = 'open';

ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusivity_outcomes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS decisions_service_role ON public.decisions;
CREATE POLICY decisions_service_role ON public.decisions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS exclusivity_outcomes_service_role ON public.exclusivity_outcomes;
CREATE POLICY exclusivity_outcomes_service_role ON public.exclusivity_outcomes
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.decisions TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.exclusivity_outcomes TO service_role;
GRANT SELECT ON public.genome_decision_open TO service_role;
