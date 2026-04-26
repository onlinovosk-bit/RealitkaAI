-- ================================================================
-- Revolis.AI — BSM Reforma 2026 Campaign Engine
-- Migration: bsm_reforma_campaign
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.bsm_campaign_config (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id     TEXT        UNIQUE NOT NULL DEFAULT 'bsm_2026_reforma',
  effective_date  DATE        NOT NULL DEFAULT DATE '2026-01-01',
  key_change      TEXT        NOT NULL,
  impact_factor   TEXT        NOT NULL,
  prompt_structure TEXT       NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.bsm_campaign_config (campaign_id, key_change, impact_factor, prompt_structure)
VALUES (
  'bsm_2026_reforma',
  'Zmena v nakladaní s nehnuteľnosťami nadobudnutými pred manželstvom a dedením.',
  'Zvýšená administratívna záťaž pri predaji po 2026, nutnosť nových súhlasov.',
  'Si seniorný realitný právnik a poradca. Napíš krátku, údernú správu pre [NAME]. Spomeň, že jeho nehnuteľnosť na [LOCATION] spadá pod novú BSM reformu 2026. Cieľom je vyvolať zvedavosť (Open Rate) a ponúknuť bezplatnú 5-minútovú konzultáciu k dopadu na cenu.'
)
ON CONFLICT (campaign_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.bsm_reforma_leads (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       UUID,
  full_name        TEXT,
  email            TEXT,
  phone            TEXT,
  location_text    TEXT        NOT NULL,
  consent_marketing BOOLEAN    NOT NULL DEFAULT TRUE,
  source           TEXT        NOT NULL DEFAULT 'bsm_reforma_landing',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bsm_reforma_leads_created
  ON public.bsm_reforma_leads(created_at DESC);

CREATE TABLE IF NOT EXISTS public.outreach_logs (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id       UUID,
  lead_id          TEXT,
  campaign         TEXT        NOT NULL,
  channel          TEXT        NOT NULL DEFAULT 'email',
  message_content  TEXT        NOT NULL,
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload          JSONB       NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_campaign_sent
  ON public.outreach_logs(campaign, sent_at DESC);

ALTER TABLE public.bsm_campaign_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bsm_reforma_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bsm config readable by authenticated" ON public.bsm_campaign_config;
CREATE POLICY "bsm config readable by authenticated"
  ON public.bsm_campaign_config FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "bsm leads insert public" ON public.bsm_reforma_leads;
CREATE POLICY "bsm leads insert public"
  ON public.bsm_reforma_leads FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "owners read own bsm leads" ON public.bsm_reforma_leads;
CREATE POLICY "owners read own bsm leads"
  ON public.bsm_reforma_leads FOR SELECT
  USING (
    profile_id IS NULL
    OR profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "owners read own outreach logs" ON public.outreach_logs;
CREATE POLICY "owners read own outreach logs"
  ON public.outreach_logs FOR SELECT
  USING (
    profile_id IS NULL
    OR profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "service role outreach full access" ON public.outreach_logs;
CREATE POLICY "service role outreach full access"
  ON public.outreach_logs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

COMMENT ON TABLE public.bsm_campaign_config IS
  'Knowledge and prompt contract for BSM 2026 legislative reactivation campaign.';
COMMENT ON TABLE public.bsm_reforma_leads IS
  'Leads captured from the public /bsm-reforma landing funnel.';
COMMENT ON TABLE public.outreach_logs IS
  'Campaign outreach audit log (Ghost resurrection and similar campaigns).';
