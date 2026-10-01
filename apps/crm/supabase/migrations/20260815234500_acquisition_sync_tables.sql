-- PREP ONLY. Do not apply via supabase db push / apply_migration from this PR.
-- Founder applies via Dashboard SQL Editor, then records schema_migrations
-- the same way as 20260811220000_acquisition_core (SQL Editor + history row).
-- Do not set ACQUISITION_PERSIST_SYNC=true until this file has been applied.
-- Blueprint hole: Stage 0 PASS — no ad_groups / keywords / search_terms / metrics tables.
-- Pattern: acquisition_campaigns — composite FK (agency_id, …), UNIQUE provider ID, *_tenant RLS.

BEGIN;

CREATE TABLE IF NOT EXISTS public.acquisition_ad_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  acquisition_account_id uuid NOT NULL,
  provider text NOT NULL,
  provider_ad_group_id text NOT NULL,
  provider_campaign_id text,
  name text,
  status text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (agency_id, acquisition_account_id)
    REFERENCES public.acquisition_accounts (agency_id, id),
  UNIQUE (provider, provider_ad_group_id),
  UNIQUE (agency_id, id)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_ad_groups_agency_id
  ON public.acquisition_ad_groups (agency_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_ad_groups_account
  ON public.acquisition_ad_groups (agency_id, acquisition_account_id);

CREATE TABLE IF NOT EXISTS public.acquisition_keywords (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  acquisition_account_id uuid NOT NULL,
  provider text NOT NULL,
  provider_keyword_id text NOT NULL,
  provider_campaign_id text,
  provider_ad_group_id text,
  keyword_text text,
  match_type text,
  status text,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (agency_id, acquisition_account_id)
    REFERENCES public.acquisition_accounts (agency_id, id),
  UNIQUE (provider, provider_keyword_id),
  UNIQUE (agency_id, id)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_keywords_agency_id
  ON public.acquisition_keywords (agency_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_keywords_account
  ON public.acquisition_keywords (agency_id, acquisition_account_id);

CREATE TABLE IF NOT EXISTS public.acquisition_search_terms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  acquisition_account_id uuid NOT NULL,
  provider text NOT NULL,
  provider_search_term_id text NOT NULL,
  search_term text NOT NULL,
  provider_campaign_id text NOT NULL,
  metric_date date NOT NULL,
  impressions numeric DEFAULT 0,
  clicks numeric DEFAULT 0,
  cost_micros numeric DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (agency_id, acquisition_account_id)
    REFERENCES public.acquisition_accounts (agency_id, id),
  UNIQUE (provider, provider_search_term_id),
  UNIQUE (agency_id, id)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_search_terms_agency_id
  ON public.acquisition_search_terms (agency_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_search_terms_account
  ON public.acquisition_search_terms (agency_id, acquisition_account_id);

CREATE TABLE IF NOT EXISTS public.acquisition_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  acquisition_account_id uuid NOT NULL,
  provider text NOT NULL,
  provider_metric_id text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('campaign', 'ad_group')),
  provider_entity_id text NOT NULL,
  metric_date date NOT NULL,
  impressions numeric DEFAULT 0,
  clicks numeric DEFAULT 0,
  cost_micros numeric DEFAULT 0,
  conversions numeric DEFAULT 0,
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  FOREIGN KEY (agency_id, acquisition_account_id)
    REFERENCES public.acquisition_accounts (agency_id, id),
  UNIQUE (provider, provider_metric_id),
  UNIQUE (agency_id, id)
);

CREATE INDEX IF NOT EXISTS idx_acquisition_metrics_agency_id
  ON public.acquisition_metrics (agency_id);

CREATE INDEX IF NOT EXISTS idx_acquisition_metrics_account
  ON public.acquisition_metrics (agency_id, acquisition_account_id);

ALTER TABLE public.acquisition_ad_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_search_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.acquisition_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acquisition_ad_groups_tenant" ON public.acquisition_ad_groups;
CREATE POLICY "acquisition_ad_groups_tenant"
  ON public.acquisition_ad_groups FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

DROP POLICY IF EXISTS "acquisition_keywords_tenant" ON public.acquisition_keywords;
CREATE POLICY "acquisition_keywords_tenant"
  ON public.acquisition_keywords FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

DROP POLICY IF EXISTS "acquisition_search_terms_tenant" ON public.acquisition_search_terms;
CREATE POLICY "acquisition_search_terms_tenant"
  ON public.acquisition_search_terms FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

DROP POLICY IF EXISTS "acquisition_metrics_tenant" ON public.acquisition_metrics;
CREATE POLICY "acquisition_metrics_tenant"
  ON public.acquisition_metrics FOR ALL TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_ad_groups TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_keywords TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_search_terms TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisition_metrics TO authenticated;

GRANT ALL ON public.acquisition_ad_groups TO service_role;
GRANT ALL ON public.acquisition_keywords TO service_role;
GRANT ALL ON public.acquisition_search_terms TO service_role;
GRANT ALL ON public.acquisition_metrics TO service_role;

COMMIT;