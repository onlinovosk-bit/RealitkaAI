-- Sandbox demo tenant + structured GDPR consent records (overnight brief 2026-07-22)

-- A1: sandbox flag on valuation tenants
ALTER TABLE public.valuation_tenants
  ADD COLUMN IF NOT EXISTS is_sandbox boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.valuation_tenants.is_sandbox IS
  'Public demo widget — no real leads, no notifications.';

-- Internal sandbox agency (no profiles linked → invisible in CRM UI via RLS)
INSERT INTO public.agencies (id, name, slug, city, plan, is_active)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Revolis Sandbox (internal)',
  'revolis-sandbox-internal',
  '',
  'Free',
  false
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = false;

INSERT INTO public.valuation_tenants (
  agency_id,
  slug,
  brand_name,
  primary_color,
  enabled,
  is_sandbox
)
VALUES (
  '22222222-2222-2222-2222-222222222222'::uuid,
  'demo',
  'Ukážková kancelária',
  '#6D28D9',
  true,
  true
)
ON CONFLICT (slug) DO UPDATE
SET
  agency_id = EXCLUDED.agency_id,
  brand_name = EXCLUDED.brand_name,
  primary_color = EXCLUDED.primary_color,
  enabled = EXCLUDED.enabled,
  is_sandbox = EXCLUDED.is_sandbox;

-- Public branding RPC exposes sandbox flag for UI badge
DROP FUNCTION IF EXISTS public.get_valuation_tenant(text);

CREATE FUNCTION public.get_valuation_tenant(requested_slug text)
RETURNS TABLE (
  slug text,
  brand_name text,
  logo_url text,
  primary_color text,
  calendly_url text,
  is_sandbox boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    vt.slug,
    vt.brand_name,
    vt.logo_url,
    vt.primary_color,
    vt.calendly_url,
    vt.is_sandbox
  FROM public.valuation_tenants AS vt
  WHERE vt.slug = requested_slug
    AND vt.enabled = true;
$$;

REVOKE ALL ON FUNCTION public.get_valuation_tenant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_valuation_tenant(text) TO anon, authenticated, service_role;

-- A3: anonymous demo submissions (no PII in payload)
CREATE TABLE IF NOT EXISTS public.sandbox_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug text NOT NULL DEFAULT 'demo',
  payload jsonb NOT NULL,
  ip_hash text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sandbox_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sandbox_submissions_service_role_all" ON public.sandbox_submissions;
CREATE POLICY "sandbox_submissions_service_role_all"
  ON public.sandbox_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.sandbox_submissions FROM anon, authenticated;
GRANT ALL ON TABLE public.sandbox_submissions TO service_role;

COMMENT ON TABLE public.sandbox_submissions IS
  'Valuation widget demo traffic — property/estimate stats only, no contact PII.';

-- B1: structured consent audit trail (linked to real leads only)
CREATE TABLE IF NOT EXISTS public.lead_consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  tenant_slug text NOT NULL,
  privacy_policy_version text NOT NULL,
  acknowledged_at timestamptz NOT NULL,
  marketing_opt_in boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_consents_lead_id_idx ON public.lead_consents (lead_id);
CREATE INDEX IF NOT EXISTS lead_consents_tenant_slug_idx ON public.lead_consents (tenant_slug);

ALTER TABLE public.lead_consents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_consents_tenant" ON public.lead_consents;
CREATE POLICY "lead_consents_tenant"
  ON public.lead_consents
  FOR ALL
  TO authenticated
  USING (
    lead_id IN (
      SELECT l.id
      FROM public.leads AS l
      WHERE l.agency_id IN (SELECT public.profile_agencies_for_auth())
    )
  )
  WITH CHECK (
    lead_id IN (
      SELECT l.id
      FROM public.leads AS l
      WHERE l.agency_id IN (SELECT public.profile_agencies_for_auth())
    )
  );

DROP POLICY IF EXISTS "lead_consents_service_role_all" ON public.lead_consents;
CREATE POLICY "lead_consents_service_role_all"
  ON public.lead_consents
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.lead_consents FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lead_consents TO authenticated;
GRANT ALL ON TABLE public.lead_consents TO service_role;

COMMENT ON TABLE public.lead_consents IS
  'GDPR consent audit for valuation widget leads — queryable without parsing notes.';
