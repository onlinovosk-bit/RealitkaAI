-- Seller signals extracted from lead text — the INPUT to deterministic scoring.
--
-- Separate from `lead_scores` on purpose (engine contract §17): an extraction is
-- model-dependent and expensive, a score is deterministic and cheap. Keeping
-- them together would force re-running the model whenever a rule changes, and
-- would make old scores unreproducible the moment the model is swapped.
--
-- Reuse was checked first and none of the existing tables fits:
--   lead_scores     score + risk_score only, unique(lead_id) — no room for
--                   per-signal evidence or more than one extractor version
--   demand_signals  geographic market demand per profile, not per-lead intent
--   leads.dossier   research-agent output (owner, value, IČO) with its own zod
--                   schema and lifecycle; overloading it would merge two
--                   independently versioned things
--
-- PREP ONLY. Do not apply via `supabase db push` / apply_migration from this PR.
-- Founder applies via Dashboard SQL Editor (same path as 20260924060000).
-- History INSERT (Dashboard only):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260924120000', 'lead_signals', ARRAY[]::text[], NULL);

CREATE TABLE IF NOT EXISTS public.lead_signals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NOT NULL, unlike lead_events. That table's policy permits `agency_id is
  -- null`, which makes such a row readable across tenants; a new table has no
  -- legacy rows to accommodate, so the hole is closed by construction.
  agency_id          uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id            text NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  signal_name        text NOT NULL,
  -- NULL means the extractor looked and found nothing. That is a finding, and
  -- it is not the same as never having looked.
  value              text,
  confidence         text NOT NULL,
  -- Verbatim quote from `source_field`. A value without one is refused in the
  -- application layer and by the CHECK below: unverifiable evidence is worse
  -- than none, because it reads as proof.
  evidence_span      text,
  source_field       text NOT NULL,
  extraction_version text NOT NULL,
  extracted_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lead_signals_name_check
    CHECK (signal_name IN ('seller_intent', 'property_type', 'locality', 'timeframe')),
  CONSTRAINT lead_signals_confidence_check
    CHECK (confidence IN ('high', 'medium', 'low')),
  CONSTRAINT lead_signals_evidence_check
    CHECK (value IS NULL OR evidence_span IS NOT NULL),

  -- One row per signal per extractor version: re-running a version replaces its
  -- own rows and leaves earlier versions intact, so a lead can be re-scored
  -- without being re-extracted.
  CONSTRAINT lead_signals_unique_per_version
    UNIQUE (lead_id, signal_name, extraction_version)
);

CREATE INDEX IF NOT EXISTS idx_lead_signals_lookup
  ON public.lead_signals (agency_id, lead_id, extraction_version);

ALTER TABLE public.lead_signals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_signals_tenant" ON public.lead_signals;
CREATE POLICY "lead_signals_tenant"
  ON public.lead_signals FOR ALL TO authenticated
  USING (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL
    )
  )
  WITH CHECK (
    agency_id IN (
      SELECT p.agency_id FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL
    )
  );

COMMENT ON COLUMN public.lead_signals.evidence_span IS
  'Verbatim quote from source_field. A signal without one is never PRESENT.';
COMMENT ON COLUMN public.lead_signals.extraction_version IS
  'Which extractor produced this. Required so old leads can be re-scored without being re-extracted.';
