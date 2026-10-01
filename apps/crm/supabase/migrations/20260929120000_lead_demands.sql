-- DEMAND-D1: lead_demands — Demand Contract v1 records (docs/reports/2026-09-29-demand-os-gap-audit.md).
--
-- One row per extraction attempt, append-only; the newest row per lead is the
-- current demand. `demand` holds every contract field as
-- {value, confidence, source, evidence} with explicit nulls for unknowns.
--
-- Tenant boundary
-- ===============
-- agency_id is NOT NULL from day one, so the `agency_id IS NULL OR …` escape
-- closed by 20260928070000_rls_null_escapes cannot exist here. Writers are the
-- service role only (ingestion and the backfill); `authenticated` may read its
-- own agency's rows and nothing else — no INSERT/UPDATE/DELETE policy exists.

CREATE TABLE IF NOT EXISTS public.lead_demands (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id          text        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  contract_version text        NOT NULL DEFAULT 'v1',
  status           text        NOT NULL
                   CHECK (status IN ('ok', 'no_text', 'llm_error', 'invalid_output', 'disabled')),
  demand           jsonb       NOT NULL,
  known_fields     smallint    NOT NULL DEFAULT 0 CHECK (known_fields >= 0),
  core_complete    boolean     NOT NULL DEFAULT false,
  extractor        text        NOT NULL,
  input_chars      integer     NOT NULL DEFAULT 0,
  extracted_at     timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_demands_lead_latest_idx
  ON public.lead_demands (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS lead_demands_agency_created_idx
  ON public.lead_demands (agency_id, created_at DESC);

ALTER TABLE public.lead_demands ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.lead_demands FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.lead_demands FROM authenticated;
GRANT SELECT ON public.lead_demands TO authenticated;

DROP POLICY IF EXISTS lead_demands_select_tenant ON public.lead_demands;
CREATE POLICY lead_demands_select_tenant ON public.lead_demands
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()));

COMMENT ON TABLE public.lead_demands IS
  'Demand Contract v1 — append-only extraction records. Values only with verbatim evidence (AP-001). Service-role writes; tenant read via profile_agencies_for_auth().';
