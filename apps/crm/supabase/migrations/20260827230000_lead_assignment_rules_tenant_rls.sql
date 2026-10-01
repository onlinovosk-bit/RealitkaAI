-- Tenant-scope lead_assignment_rules: add agency_id, replace open demo RLS.
-- Prod table existed via supabase/13_add_lead_assignment_rules.sql (open USING (true)).
-- App ownership check selected agency_id (column missing) and fail-opened → any
-- authenticated caller + cookie-less anon client could list/delete every rule.

CREATE TABLE IF NOT EXISTS public.lead_assignment_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rule_type text NOT NULL,
  profile_ids uuid[] NOT NULL DEFAULT '{}',
  criteria jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.lead_assignment_rules
  ADD COLUMN IF NOT EXISTS agency_id uuid REFERENCES public.agencies(id);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_rules_agency
  ON public.lead_assignment_rules (agency_id);

CREATE INDEX IF NOT EXISTS idx_lead_assignment_rules_active
  ON public.lead_assignment_rules (is_active, created_at DESC);

ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "demo_select_lead_assignment_rules" ON public.lead_assignment_rules;
DROP POLICY IF EXISTS "demo_insert_lead_assignment_rules" ON public.lead_assignment_rules;
DROP POLICY IF EXISTS "demo_update_lead_assignment_rules" ON public.lead_assignment_rules;
DROP POLICY IF EXISTS "demo_delete_lead_assignment_rules" ON public.lead_assignment_rules;
DROP POLICY IF EXISTS "lead_assignment_rules_agency" ON public.lead_assignment_rules;

-- Fail-closed: rows with NULL agency_id are invisible/unwritable until backfilled.
CREATE POLICY "lead_assignment_rules_agency"
  ON public.lead_assignment_rules
  FOR ALL
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_assignment_rules TO authenticated;
GRANT ALL ON public.lead_assignment_rules TO service_role;
-- Revoke anon — cookie-less singleton must not mutate this table.
REVOKE ALL ON public.lead_assignment_rules FROM anon;
