-- Wave 3A: dedicated system agency for platform usage metrics (not Smolko tenant).
-- Founder applies manually — no prod UPDATE of historical rows in this migration.

INSERT INTO public.agencies (id, name, slug, city, plan, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Revolis System',
  'revolis-system',
  '',
  'Free',
  false
)
ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  is_active = EXCLUDED.is_active;
