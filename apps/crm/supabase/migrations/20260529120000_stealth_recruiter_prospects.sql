-- Stealth Recruiter prospects — tenant-scoped self-seller leads
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.stealth_recruiter_prospects (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id       UUID        NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  address         TEXT        NOT NULL,
  region          TEXT,
  platform        TEXT,
  days_listed     INTEGER,
  original_price  NUMERIC,
  current_price   NUMERIC,
  score           INTEGER,
  status          TEXT        NOT NULL DEFAULT 'identified',
  ai_comment      TEXT,
  ai_outreach     TEXT,
  verified_at     TIMESTAMPTZ,
  scraped_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (agency_id, address)
);

CREATE INDEX IF NOT EXISTS idx_stealth_recruiter_prospects_agency
  ON public.stealth_recruiter_prospects (agency_id);

CREATE INDEX IF NOT EXISTS idx_stealth_recruiter_prospects_agency_region
  ON public.stealth_recruiter_prospects (agency_id, region);

CREATE INDEX IF NOT EXISTS idx_stealth_recruiter_prospects_verified
  ON public.stealth_recruiter_prospects (agency_id, verified_at DESC);

ALTER TABLE public.stealth_recruiter_prospects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "stealth_recruiter_prospects_tenant" ON public.stealth_recruiter_prospects;
CREATE POLICY "stealth_recruiter_prospects_tenant"
  ON public.stealth_recruiter_prospects
  FOR ALL
  TO authenticated
  USING (agency_id IN (SELECT public.profile_agencies_for_auth()))
  WITH CHECK (agency_id IN (SELECT public.profile_agencies_for_auth()));
