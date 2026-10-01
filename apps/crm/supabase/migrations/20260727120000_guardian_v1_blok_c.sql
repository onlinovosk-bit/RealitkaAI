-- Guardian v1 Blok C: guardian_findings (hourly rules + daily digest)
-- Founder GO required before PROD apply.

CREATE TABLE IF NOT EXISTS public.guardian_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  lead_id text NOT NULL REFERENCES public.leads(id),
  rule_code text NOT NULL CHECK (rule_code IN ('STALE', 'NO_OWNER', 'NO_PHONE', 'HOT_IGNORED')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  digest_sent_at timestamptz,
  meta jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS guardian_open_unique
  ON public.guardian_findings (agency_id, lead_id, rule_code)
  WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_guardian_findings_agency_detected
  ON public.guardian_findings (agency_id, detected_at DESC);

ALTER TABLE public.guardian_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardian_findings_tenant ON public.guardian_findings;
CREATE POLICY guardian_findings_tenant
  ON public.guardian_findings
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  )
  WITH CHECK (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );

DROP POLICY IF EXISTS guardian_findings_service_role ON public.guardian_findings;
CREATE POLICY guardian_findings_service_role
  ON public.guardian_findings
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE ON public.guardian_findings TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.guardian_findings TO service_role;
