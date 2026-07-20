-- Wave 0: public branding configuration for the valuation widget.
-- No public table access: anon can only call get_valuation_tenant(slug).

CREATE TABLE IF NOT EXISTS public.valuation_tenants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  slug text UNIQUE NOT NULL,
  brand_name text NOT NULL,
  logo_url text,
  primary_color text DEFAULT '#6D28D9',
  calendly_url text,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.valuation_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "valuation_tenants_service_role_all" ON public.valuation_tenants;
CREATE POLICY "valuation_tenants_service_role_all"
  ON public.valuation_tenants
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

REVOKE ALL ON TABLE public.valuation_tenants FROM anon, authenticated;
GRANT ALL ON TABLE public.valuation_tenants TO service_role;

CREATE OR REPLACE FUNCTION public.get_valuation_tenant(requested_slug text)
RETURNS TABLE (
  slug text,
  brand_name text,
  logo_url text,
  primary_color text,
  calendly_url text
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
    vt.calendly_url
  FROM public.valuation_tenants AS vt
  WHERE vt.slug = requested_slug
    AND vt.enabled = true;
$$;

REVOKE ALL ON FUNCTION public.get_valuation_tenant(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_valuation_tenant(text) TO anon, authenticated, service_role;

-- Production seed: canonical Smolko agency. The WHERE keeps ephemeral CI resets
-- valid when production tenant data is intentionally absent.
INSERT INTO public.valuation_tenants (
  agency_id,
  slug,
  brand_name,
  primary_color,
  enabled
)
SELECT
  a.id,
  'reality-smolko',
  'Reality Smolko, s. r. o.',
  '#6D28D9',
  true
FROM public.agencies AS a
WHERE a.id = '11111111-1111-1111-1111-111111111111'::uuid
ON CONFLICT (slug) DO UPDATE
SET
  agency_id = EXCLUDED.agency_id,
  brand_name = EXCLUDED.brand_name,
  primary_color = EXCLUDED.primary_color,
  enabled = EXCLUDED.enabled;

-- Molnár remains disabled until the agency exists and commercial terms are agreed.
-- Never associate this slug with Smolko's agency_id.
INSERT INTO public.valuation_tenants (
  agency_id,
  slug,
  brand_name,
  primary_color,
  enabled
)
SELECT
  a.id,
  'aa-reality-kosice',
  'AA REALITY Košice s.r.o.',
  '#6D28D9',
  false
FROM public.agencies AS a
WHERE a.slug = 'aa-reality-kosice'
ON CONFLICT (slug) DO UPDATE
SET
  agency_id = EXCLUDED.agency_id,
  brand_name = EXCLUDED.brand_name,
  primary_color = EXCLUDED.primary_color,
  enabled = false;
