-- CI seed (optional). Migrations in supabase/migrations/ are applied by `supabase db reset`.
--
-- Valuation widget e2e: Smolko agency + tenant. Production migration
-- 20260720193000 inserts reality-smolko only when agency exists; ephemeral CI
-- resets may lack that agency until this seed runs.

INSERT INTO public.agencies (id, name, slug, city, plan, is_active)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Reality Smolko, s. r. o.',
  'reality-smolko',
  'Košice',
  'Free',
  true
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  city = EXCLUDED.city,
  is_active = EXCLUDED.is_active;

INSERT INTO public.valuation_tenants (
  agency_id,
  slug,
  brand_name,
  primary_color,
  enabled,
  is_sandbox
)
VALUES (
  '11111111-1111-1111-1111-111111111111'::uuid,
  'reality-smolko',
  'Reality Smolko, s. r. o.',
  '#6D28D9',
  true,
  false
)
ON CONFLICT (slug) DO UPDATE
SET
  agency_id = EXCLUDED.agency_id,
  brand_name = EXCLUDED.brand_name,
  primary_color = EXCLUDED.primary_color,
  enabled = EXCLUDED.enabled,
  is_sandbox = EXCLUDED.is_sandbox;
