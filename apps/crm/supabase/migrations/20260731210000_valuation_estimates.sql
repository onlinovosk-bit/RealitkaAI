-- Wave 1C: persist valuation widget estimates (moat capture — stop losing preview traffic)
-- Founder applies on PROD after PR merge. Do not run automatically in CI beyond schema parity.

CREATE TABLE IF NOT EXISTS public.valuation_estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  session_id text,
  location text NOT NULL,
  postal_code text,
  sqm numeric NOT NULL,
  rooms int,
  floor int,
  total_floors int,
  year_built int,
  land_sqm numeric,
  property_type text NOT NULL CHECK (property_type IN ('byt', 'dom')),
  estimate_min numeric,
  estimate_mid numeric,
  estimate_max numeric,
  price_data_version text,
  is_sandbox boolean NOT NULL DEFAULT false,
  lead_id text REFERENCES public.leads(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_valuation_estimates_agency_created
  ON public.valuation_estimates (agency_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_valuation_estimates_session
  ON public.valuation_estimates (session_id)
  WHERE session_id IS NOT NULL;

ALTER TABLE public.valuation_estimates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS valuation_estimates_tenant ON public.valuation_estimates;
CREATE POLICY valuation_estimates_tenant
  ON public.valuation_estimates
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  )
  WITH CHECK (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );

DROP POLICY IF EXISTS valuation_estimates_service_role ON public.valuation_estimates;
CREATE POLICY valuation_estimates_service_role
  ON public.valuation_estimates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.valuation_estimates FROM anon;
GRANT SELECT, INSERT, UPDATE ON public.valuation_estimates TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.valuation_estimates TO service_role;

COMMENT ON TABLE public.valuation_estimates IS
  'Valuation widget estimate events — property input + computed band, including sandbox previews.';
