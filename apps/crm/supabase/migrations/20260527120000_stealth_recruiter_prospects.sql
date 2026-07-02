-- Stealth Recruiter (Tichý Náborár) — tenant-scoped prospect store
-- RLS via profile_agencies_for_auth() (same pattern as leads / decision tables)

CREATE TABLE IF NOT EXISTS public.stealth_recruiter_prospects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  address text NOT NULL,
  source text NOT NULL DEFAULT 'other',
  score integer NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  status text NOT NULL DEFAULT 'identified'
    CHECK (status IN ('identified', 'outreached', 'converted', 'cancelled')),
  outreach_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, address)
);

CREATE INDEX IF NOT EXISTS idx_stealth_recruiter_prospects_agency_id
  ON public.stealth_recruiter_prospects (agency_id);

CREATE INDEX IF NOT EXISTS idx_stealth_recruiter_prospects_status
  ON public.stealth_recruiter_prospects (status);

CREATE INDEX IF NOT EXISTS idx_stealth_recruiter_prospects_address
  ON public.stealth_recruiter_prospects (address);

ALTER TABLE public.stealth_recruiter_prospects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stealth_recruiter_prospects_tenant"
  ON public.stealth_recruiter_prospects
  FOR ALL
  TO authenticated
  USING (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  )
  WITH CHECK (
    agency_id IN (SELECT public.profile_agencies_for_auth())
  );
