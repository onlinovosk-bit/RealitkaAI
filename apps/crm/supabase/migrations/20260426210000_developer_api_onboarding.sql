-- ================================================================
-- Revolis.AI — Developer API onboarding requests
-- Migration: developer_api_onboarding
-- ================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.developer_api_key_requests (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name    TEXT        NOT NULL,
  contact_name    TEXT,
  contact_email   TEXT        NOT NULL,
  use_case        TEXT,
  requested_tier  TEXT        NOT NULL DEFAULT 'enterprise'
    CHECK (requested_tier IN ('developer','enterprise')),
  status          TEXT        NOT NULL DEFAULT 'new'
    CHECK (status IN ('new','reviewing','approved','rejected')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dev_api_requests_created
  ON public.developer_api_key_requests(created_at DESC);

ALTER TABLE public.developer_api_key_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public can insert api key requests" ON public.developer_api_key_requests;
CREATE POLICY "public can insert api key requests"
  ON public.developer_api_key_requests FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "service role full api key requests" ON public.developer_api_key_requests;
CREATE POLICY "service role full api key requests"
  ON public.developer_api_key_requests FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
