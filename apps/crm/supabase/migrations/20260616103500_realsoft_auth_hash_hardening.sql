BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.agencies
  ADD COLUMN IF NOT EXISTS realsoft_export_pass_hash TEXT;

UPDATE public.agencies
SET realsoft_export_pass_hash = extensions.crypt(realsoft_export_pass, extensions.gen_salt('bf'))
WHERE COALESCE(btrim(realsoft_export_pass), '') <> ''
  AND COALESCE(btrim(realsoft_export_pass_hash), '') = '';

ALTER TABLE IF EXISTS public.agencies
  DROP COLUMN IF EXISTS realsoft_export_pass;

COMMENT ON COLUMN public.agencies.realsoft_export_pass_hash IS
  'BCrypt hash of RealSoft export API password/token. Never stored in plaintext.';

CREATE OR REPLACE FUNCTION public.resolve_agency_id_for_realsoft_credentials(
  p_user TEXT,
  p_pass TEXT
)
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id
  FROM public.agencies a
  WHERE lower(btrim(COALESCE(a.realsoft_export_user, ''))) = lower(btrim(COALESCE(p_user, '')))
    AND btrim(COALESCE(a.realsoft_export_user, '')) <> ''
    AND btrim(COALESCE(a.realsoft_export_pass_hash, '')) <> ''
    AND a.realsoft_export_pass_hash = extensions.crypt(COALESCE(p_pass, ''), a.realsoft_export_pass_hash)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_agency_id_for_realsoft_credentials(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_agency_id_for_realsoft_credentials(TEXT, TEXT) TO service_role;

COMMIT;

