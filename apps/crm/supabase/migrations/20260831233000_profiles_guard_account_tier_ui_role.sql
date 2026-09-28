-- Prevent authenticated self-service billing/entitlement escalation via
-- profiles_self_update (full-row UPDATE where id = auth.uid()).
-- Companion to profiles_guard_role_and_agency (role/agency_id).
-- account_tier + ui_role must only change via service_role (Stripe webhook,
-- invite/admin tooling). Client paths that normalize entitlements already
-- fall back to service_role when the user-scoped update is rejected.

-- Canonical columns for local/CI (prod had manual drift; agencies.account_tier
-- is separate — billing writes profile-level entitlements here).
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_tier text,
  ADD COLUMN IF NOT EXISTS ui_role text NOT NULL DEFAULT 'agent';

CREATE OR REPLACE FUNCTION public.profiles_guard_account_tier_and_ui_role()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.account_tier IS DISTINCT FROM OLD.account_tier THEN
    NEW.account_tier := OLD.account_tier;
  END IF;

  IF NEW.ui_role IS DISTINCT FROM OLD.ui_role THEN
    NEW.ui_role := OLD.ui_role;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_account_tier_and_ui_role ON public.profiles;
CREATE TRIGGER profiles_guard_account_tier_and_ui_role
  BEFORE UPDATE OF account_tier, ui_role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_account_tier_and_ui_role();

COMMENT ON FUNCTION public.profiles_guard_account_tier_and_ui_role() IS
  'Blocks authenticated clients from changing profiles.account_tier or profiles.ui_role; service_role only.';
