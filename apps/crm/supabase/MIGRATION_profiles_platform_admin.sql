-- MIGRATION.sql — profiles.is_platform_admin (founder GO on PROD only)
-- Canonical: apps/crm/supabase/migrations/20260728140000_profiles_platform_admin.sql
--
-- After apply:
--   UPDATE public.profiles SET is_platform_admin = true
--   WHERE email = 'YOUR_REVOLIS_OPERATOR_EMAIL';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_platform_admin IS
  'Revolis platform operator; cross-tenant routes (e.g. /operator). Never true for customer brokers.';

CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
  ON public.profiles (id)
  WHERE is_platform_admin = true;

CREATE OR REPLACE FUNCTION public.profiles_guard_platform_admin()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_platform_admin IS DISTINCT FROM OLD.is_platform_admin THEN
    IF COALESCE(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
      NEW.is_platform_admin := OLD.is_platform_admin;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_platform_admin ON public.profiles;
CREATE TRIGGER profiles_guard_platform_admin
  BEFORE UPDATE OF is_platform_admin ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_platform_admin();
