-- DEMAND-D4: demand_property_matches — matches computed ONLY from verified demand.
-- Spec: docs/architecture/matching-input-contract-v1.md.
--
-- A separate table, not lead_property_matches: that one is filled by the old
-- engine, which reads leads.property_type/rooms/financing/timeline — columns
-- pre-filled with defaults on four code paths. Mixing the two would make a
-- guessed match indistinguishable from a verified one.
--
-- demand_record_id is NOT NULL and cascades: a match cannot exist without the
-- demand record (and its evidence) it was computed from (contract §5).
-- Tenant boundary as lead_demands: agency_id NOT NULL, service-role writes,
-- authenticated reads its own agency only.

CREATE TABLE IF NOT EXISTS public.demand_property_matches (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id        uuid        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  lead_id          text        NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  demand_record_id uuid        NOT NULL REFERENCES public.lead_demands(id) ON DELETE CASCADE,
  property_id      text        NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  score            numeric(4,3) NOT NULL CHECK (score >= 0 AND score <= 1),
  fields           jsonb       NOT NULL,
  engine           text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (demand_record_id, property_id)
);

CREATE INDEX IF NOT EXISTS demand_property_matches_lead_idx
  ON public.demand_property_matches (lead_id, created_at DESC);
CREATE INDEX IF NOT EXISTS demand_property_matches_agency_idx
  ON public.demand_property_matches (agency_id, created_at DESC);

ALTER TABLE public.demand_property_matches ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.demand_property_matches FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.demand_property_matches FROM authenticated;
GRANT SELECT ON public.demand_property_matches TO authenticated;

DROP POLICY IF EXISTS demand_property_matches_select_tenant ON public.demand_property_matches;
CREATE POLICY demand_property_matches_select_tenant ON public.demand_property_matches
  FOR SELECT TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()));

COMMENT ON TABLE public.demand_property_matches IS
  'DEMAND-D4 matches from verified lead_demands only (no leads.* defaults, no fallback values). Service-role writes; tenant read.';
