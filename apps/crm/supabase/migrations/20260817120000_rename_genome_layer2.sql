-- Rename of 2026_genome_layer2.sql -> 14-digit version 20260817120000 (D-2026-08-17-01).
-- Illegal version token was '2026' (sorts first by version-id, last by ASCII filename).
-- Idempotent: objects already live on prod (decisions, exclusivity_outcomes, genome_decision_open).
-- DO NOT supabase db push. Founder apply = Dashboard SQL Editor (this file) + history INSERT.
-- History INSERT (Dashboard only, after SQL succeeds; pattern from 20260811220000_acquisition_core):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260817120000', 'rename_genome_layer2', ARRAY[]::text[], NULL);
-- Do not INSERT version '2026'. Prod has no history row for '2026' (audit 2026-08-15).
-- Do not delete 2026_genome_layer2.sql until the history INSERT is confirmed on prod.
-- Genome Layer 2 - Prediction Registry + exclusivity outcomes (idempotent, CI + prod parity)
-- Applied manually on PROD; this file keeps ephemeral CI DB aligned.

CREATE TABLE IF NOT EXISTS public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  lead_id text NOT NULL,
  agent text NOT NULL DEFAULT 'followup_agent',
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

-- PROD parity: column added manually before repo migration; idempotent for CI.
ALTER TABLE public.decisions ADD COLUMN IF NOT EXISTS agent text NOT NULL DEFAULT 'followup_agent';

CREATE OR REPLACE VIEW public.genome_decision_open AS
SELECT
  d.id,
  d.agency_id,
  d.lead_id,
  d.agent,
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
