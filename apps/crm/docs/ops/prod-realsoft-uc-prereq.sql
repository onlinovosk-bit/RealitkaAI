-- PROD prereq: RealSoft/UC auth + import logs (Brief 10 + 14)
-- Run each section separately in Supabase SQL Editor (prod ypgajkhqtbriqqmyawyv).

-- === SECTION 1: agencies auth columns ===
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS realsoft_export_user TEXT,
  ADD COLUMN IF NOT EXISTS realsoft_export_pass_hash TEXT;

-- === SECTION 2: realsoft_import_logs table ===
CREATE TABLE IF NOT EXISTS public.realsoft_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  action SMALLINT NOT NULL CHECK (action IN (1, 2)),
  external_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  unmapped JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  result_code SMALLINT
);

CREATE INDEX IF NOT EXISTS idx_realsoft_import_logs_received_at
  ON public.realsoft_import_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_realsoft_import_logs_agency
  ON public.realsoft_import_logs (agency_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_realsoft_import_logs_dedupe
  ON public.realsoft_import_logs (agency_id, action, external_id)
  WHERE external_id IS NOT NULL;

-- === SECTION 3: RLS policies ===
ALTER TABLE public.realsoft_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realsoft_import_logs_service_role_all" ON public.realsoft_import_logs;
CREATE POLICY "realsoft_import_logs_service_role_all"
  ON public.realsoft_import_logs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "realsoft_import_logs_agency_read" ON public.realsoft_import_logs;
CREATE POLICY "realsoft_import_logs_agency_read"
  ON public.realsoft_import_logs FOR SELECT TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()));

DROP POLICY IF EXISTS "realsoft_import_logs_agency_insert" ON public.realsoft_import_logs;
CREATE POLICY "realsoft_import_logs_agency_insert"
  ON public.realsoft_import_logs FOR INSERT TO authenticated
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

GRANT SELECT, INSERT ON public.realsoft_import_logs TO authenticated;
GRANT ALL ON public.realsoft_import_logs TO service_role;

-- === SECTION 4: auth RPC ===
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

-- === SECTION 5: DIAGNOSTIC (read-only) ===
-- Spusti v PROD SQL Editore. Očakávané: user = smolko-uc-export, hash_status = bcrypt_ok, hash_len ~ 60.
SELECT
  id,
  slug,
  realsoft_export_user,
  CASE
    WHEN realsoft_export_pass_hash IS NULL OR btrim(realsoft_export_pass_hash) = '' THEN 'MISSING'
    WHEN left(realsoft_export_pass_hash, 3) IN ('$2a', '$2b') THEN 'bcrypt_ok'
    ELSE 'INVALID_FORMAT'
  END AS hash_status,
  length(realsoft_export_pass_hash) AS hash_len
FROM public.agencies
WHERE id = '11111111-1111-1111-1111-111111111111'
   OR lower(btrim(realsoft_export_user)) = 'smolko-uc-export';

-- === SECTION 6: SET / ROTATE credentials ===
-- Nahrad REPLACE_WITH_YOUR_PASSWORD presnym heslom (rovnake ako v smoke skripte).
-- DÔLEŽITÉ: použi extensions.crypt + extensions.gen_salt (nie plain crypt bez schema).
UPDATE public.agencies
SET
  realsoft_export_user = 'smolko-uc-export',
  realsoft_export_pass_hash = extensions.crypt(
    'REPLACE_WITH_YOUR_PASSWORD',
    extensions.gen_salt('bf')
  )
WHERE id = '11111111-1111-1111-1111-111111111111';

-- === SECTION 7: VERIFY RPC (musí vrátiť Smolko agency UUID) ===
SELECT public.resolve_agency_id_for_realsoft_credentials(
  'smolko-uc-export',
  'REPLACE_WITH_YOUR_PASSWORD'
) AS agency_id;

-- === SECTION 8: audit upsert constraint (AP-010 / 42P10 fix) ===
-- Partial UNIQUE INDEX does not satisfy Supabase upsert onConflict.
-- Run once on PROD if audit rows stay empty despite code: 1.
DROP INDEX IF EXISTS public.uq_realsoft_import_logs_dedupe;

ALTER TABLE public.realsoft_import_logs
  DROP CONSTRAINT IF EXISTS uq_realsoft_import_logs_dedupe;

ALTER TABLE public.realsoft_import_logs
  ADD CONSTRAINT uq_realsoft_import_logs_dedupe
  UNIQUE (agency_id, action, external_id);
