-- Prevent authenticated self-service privilege escalation via profiles_self_update.
-- profiles_self_update allows UPDATE WHERE id = auth.uid() with no column restriction,
-- so a broker could set role='owner' or reassign agency_id from the browser client.
-- Mirror profiles_guard_platform_admin: soft-revert privileged fields unless service_role.
-- Invite / billing / admin routes that must change role continue via service_role.

CREATE OR REPLACE FUNCTION public.profiles_guard_role_and_agency()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('request.jwt.claim.role', true), '') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role THEN
    NEW.role := OLD.role;
  END IF;

  IF NEW.agency_id IS DISTINCT FROM OLD.agency_id THEN
    NEW.agency_id := OLD.agency_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_guard_role_and_agency ON public.profiles;
CREATE TRIGGER profiles_guard_role_and_agency
  BEFORE UPDATE OF role, agency_id ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.profiles_guard_role_and_agency();

COMMENT ON FUNCTION public.profiles_guard_role_and_agency() IS
  'Blocks authenticated clients from changing profiles.role or profiles.agency_id; service_role only.';
