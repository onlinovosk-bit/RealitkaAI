-- Wave 9 follow-up: properties table had auth on routes but no RLS.
-- Any authenticated user could read/write properties across all tenants.
-- Uses same profile_agencies_for_auth() pattern as leads (Wave 11).

ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "properties_tenant"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (
    agency_id IS NULL
    OR agency_id IN (SELECT public.profile_agencies_for_auth())
  )
  WITH CHECK (
    agency_id IS NULL
    OR agency_id IN (SELECT public.profile_agencies_for_auth())
  );

-- Support the RLS subquery
CREATE INDEX IF NOT EXISTS idx_properties_agency_id ON public.properties (agency_id);
