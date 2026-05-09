-- Replace open demo policies on lead_property_matches
-- with tenant-scoped policies via profile_agencies_for_auth()

DROP POLICY IF EXISTS "demo_select_lead_property_matches" ON public.lead_property_matches;
DROP POLICY IF EXISTS "demo_insert_lead_property_matches" ON public.lead_property_matches;
DROP POLICY IF EXISTS "demo_update_lead_property_matches" ON public.lead_property_matches;
DROP POLICY IF EXISTS "demo_delete_lead_property_matches" ON public.lead_property_matches;

-- Also drop any open USING (true) policies
DROP POLICY IF EXISTS "Allow all for authenticated" ON public.lead_property_matches;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON public.lead_property_matches;

CREATE POLICY "lead_property_matches_agency"
  ON public.lead_property_matches
  FOR ALL
  USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IN (SELECT profile_agencies_for_auth())
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IN (SELECT profile_agencies_for_auth())
    )
  );
