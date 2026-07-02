-- RLS tenant isolation: credit_ledger + lead_action_scores (audit gap closure)

-- ── credit_ledger ───────────────────────────────────────────────────────────
ALTER TABLE public.credit_ledger ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "credit_ledger_tenant_select" ON public.credit_ledger;
CREATE POLICY "credit_ledger_tenant_select"
  ON public.credit_ledger
  FOR SELECT
  TO authenticated
  USING (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );

DROP POLICY IF EXISTS "credit_ledger_tenant_insert" ON public.credit_ledger;
CREATE POLICY "credit_ledger_tenant_insert"
  ON public.credit_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );

-- Updates/deletes: service role + spend_credits RPC only (no authenticated write policy)

-- ── lead_action_scores ──────────────────────────────────────────────────────
ALTER TABLE public.lead_action_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_action_scores_tenant" ON public.lead_action_scores;
CREATE POLICY "lead_action_scores_tenant"
  ON public.lead_action_scores
  FOR ALL
  TO authenticated
  USING (
    agency_id IS NULL
    OR agency_id IN (SELECT public.profile_agencies_for_auth())
  )
  WITH CHECK (
    agency_id IS NULL
    OR agency_id IN (SELECT public.profile_agencies_for_auth())
  );

CREATE INDEX IF NOT EXISTS idx_lead_action_scores_agency
  ON public.lead_action_scores (agency_id);
