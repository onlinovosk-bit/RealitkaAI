CREATE TABLE IF NOT EXISTS public.outreach_campaigns (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  segment_id  TEXT,
  template_id TEXT,
  status      TEXT        NOT NULL DEFAULT 'draft',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.outreach_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles manage own campaigns"
  ON public.outreach_campaigns
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );
