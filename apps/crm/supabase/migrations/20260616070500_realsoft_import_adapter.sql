BEGIN;

ALTER TABLE IF EXISTS public.agencies
  ADD COLUMN IF NOT EXISTS realsoft_export_user TEXT,
  ADD COLUMN IF NOT EXISTS realsoft_export_pass TEXT;

COMMENT ON COLUMN public.agencies.realsoft_export_user IS
  'RealSoft export API user for agency-scoped import receiver auth.';
COMMENT ON COLUMN public.agencies.realsoft_export_pass IS
  'RealSoft export API password/token for agency-scoped import receiver auth.';

CREATE TABLE IF NOT EXISTS public.realsoft_import_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  action SMALLINT NOT NULL CHECK (action IN (1, 2)),
  external_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  unmapped JSONB NOT NULL DEFAULT '{}'::jsonb,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_realsoft_import_logs_received_at
  ON public.realsoft_import_logs (received_at DESC);

CREATE INDEX IF NOT EXISTS idx_realsoft_import_logs_agency
  ON public.realsoft_import_logs (agency_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_realsoft_import_logs_dedupe
  ON public.realsoft_import_logs (agency_id, action, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE public.realsoft_import_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "realsoft_import_logs_service_role_all" ON public.realsoft_import_logs;
CREATE POLICY "realsoft_import_logs_service_role_all"
  ON public.realsoft_import_logs FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

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

COMMIT;

