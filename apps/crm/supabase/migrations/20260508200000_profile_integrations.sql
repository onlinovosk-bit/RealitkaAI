-- profile_integrations: generic integration config store per profile
-- Stores calendar ICS URLs, IMAP config, future OAuth tokens etc.

CREATE TABLE IF NOT EXISTS public.profile_integrations (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,  -- 'calendar_ics' | 'gmail_imap' | ...
  config      JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (profile_id, type)
);

ALTER TABLE public.profile_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_integrations_self"
  ON public.profile_integrations
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE INDEX idx_profile_integrations_profile ON public.profile_integrations(profile_id);
