-- PR-S0.1: Acquisition OS Stage 0 core tables (additive only).
-- Blueprint: docs/architecture/acquisition-os-v2.2-final-locked.md §3.3
-- ZISTI: lead_id is text (live leads.id); UNIQUE(agency_id,id) on leads deferred to Stage 2.
-- RLS: Wave A leads_tenant pattern via profile_agencies_for_auth().

BEGIN;

CREATE TABLE IF NOT EXISTS public.acquisition_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id),
  provider text NOT NULL CHECK (provider IN ('GOOGLE', 'META', 'MICROSOFT')),
  manager_customer_id text,
  customer_id text NOT NULL,
  sub_manager_customer_id text,
  currency_code text,
  timezone text,
  status text DEFAULT 'PENDING',
  connected_at timestamptz,
  last_sync_at timestamptz,
  credential_ref text NOT NULL,
  credential_type text DEFAULT 'SERVICE_ACCOUNT',
  billing_owner text DEFAULT 'CLIENT',
  consolidated_billing boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (provider, customer_id),
  UNIQUE (agency_id, id)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_accounts_agency_id
  ON public.acquisition_accounts (agency_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_accounts_provider_status
  ON public.acquisition_accounts (agency_id, provider, status);

CREATE TABLE IF NOT EXISTS public.acquisition_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  acquisition_account_id uuid NOT NULL,
  provider text NOT NULL,
  provider_campaign_id text NOT NULL,
  name text,
  status text,
  objective text,
  daily_budget numeric,
  currency text,
  bidding_strategy text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (agency_id, acquisition_account_id)
    REFERENCES public.acquisition_accounts (agency_id, id),
  UNIQUE (provider, provider_campaign_id),
  UNIQUE (agency_id, id)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_campaigns_agency_id
  ON public.acquisition_campaigns (agency_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_campaigns_account
  ON public.acquisition_campaigns (agency_id, acquisition_account_id);

CREATE TABLE IF NOT EXISTS public.acquisition_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  lead_id text REFERENCES public.leads (id),
  provider text NOT NULL,
  event_type text NOT NULL,
  provider_event_id text,
  occurred_at timestamptz,
  received_at timestamptz DEFAULT now(),
  payload_hash text,
  attribution_id text,
  processing_status text DEFAULT 'PENDING',
  error_code text,
  processed_at timestamptz,
  metadata jsonb,
  UNIQUE (agency_id, provider, provider_event_id, event_type)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_events_agency_id
  ON public.acquisition_events (agency_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_events_lead_id
  ON public.acquisition_events (lead_id)
  WHERE lead_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_acquisition_events_received_at
  ON public.acquisition_events (agency_id, received_at DESC);

ALTER TABLE public.acquisition_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acquisition_accounts_tenant" ON public.acquisition_accounts;
CREATE POLICY "acquisition_accounts_tenant"
  ON public.acquisition_accounts FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

DROP POLICY IF EXISTS "acquisition_campaigns_tenant" ON public.acquisition_campaigns;
CREATE POLICY "acquisition_campaigns_tenant"
  ON public.acquisition_campaigns FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

DROP POLICY IF EXISTS "acquisition_events_tenant" ON public.acquisition_events;
CREATE POLICY "acquisition_events_tenant"
  ON public.acquisition_events FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_accounts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_campaigns TO authenticated;
GRANT SELECT, INSERT ON public.acquisition_events TO authenticated;
REVOKE UPDATE, DELETE ON public.acquisition_events FROM authenticated;

GRANT ALL ON public.acquisition_accounts TO service_role;
GRANT ALL ON public.acquisition_campaigns TO service_role;
GRANT ALL ON public.acquisition_events TO service_role;

COMMIT;