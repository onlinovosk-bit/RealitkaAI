-- Wave 11: RLS on core tables missing tenant isolation
-- Root cause: leads and activities had no RLS (leads) or open demo policies (activities).
-- Uses profile_agencies_for_auth() — same pattern as all other tenant tables.

-- ── leads ───────────────────────────────────────────────────────
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "leads_tenant"
  ON public.leads
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

-- Index to support the RLS subquery (avoids full scan on every row check)
CREATE INDEX IF NOT EXISTS idx_leads_agency_id ON public.leads (agency_id);

-- ── activities ───────────────────────────────────────────────────
-- Activities were created with open demo policies (using true).
-- Replace with tenant policy via lead_id → leads.agency_id.

DROP POLICY IF EXISTS "demo_select_activities" ON public.activities;
DROP POLICY IF EXISTS "demo_insert_activities" ON public.activities;

CREATE POLICY "activities_tenant_select"
  ON public.activities
  FOR SELECT
  TO authenticated
  USING (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IS NULL
        OR agency_id IN (SELECT public.profile_agencies_for_auth())
    )
  );

CREATE POLICY "activities_tenant_write"
  ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IS NULL
        OR agency_id IN (SELECT public.profile_agencies_for_auth())
    )
  );

-- Allow anon write for public demo lead capture flows
CREATE POLICY "activities_anon_insert"
  ON public.activities
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- ── Missing indexes flagged in performance audit ─────────────────
CREATE INDEX IF NOT EXISTS idx_activities_lead_id        ON public.activities (lead_id);
CREATE INDEX IF NOT EXISTS idx_activities_created_at     ON public.activities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lead_property_matches_lead_id ON public.lead_property_matches (lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_property_matches_status  ON public.lead_property_matches (status);
