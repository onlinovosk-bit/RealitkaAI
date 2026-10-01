-- Operator Dashboard v1: platform-admin flag on profiles (schema gate)
-- Prepare only — founder applies on PROD after review. Do NOT auto-run in prod from CI.
--
-- After PROD apply, founder must grant own account (replace email):
--   UPDATE public.profiles SET is_platform_admin = true
--   WHERE email = 'YOUR_REVOLIS_OPERATOR_EMAIL';
-- Use service role / SQL editor; never set true for customer broker accounts.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_platform_admin IS
  'Revolis platform operator; cross-tenant routes (e.g. /operator). Never true for customer brokers.';

CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
  ON public.profiles (id)
  WHERE is_platform_admin = true;

-- Prevent authenticated self-service escalation of platform-admin.
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
