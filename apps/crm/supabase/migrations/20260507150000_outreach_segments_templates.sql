-- outreach_segments: per-profile lead filter presets
CREATE TABLE IF NOT EXISTS public.outreach_segments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  filter_json JSONB       NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.outreach_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles manage own segments"
  ON public.outreach_segments
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- outreach_templates: per-profile email/message templates
CREATE TABLE IF NOT EXISTS public.outreach_templates (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  UUID        REFERENCES public.profiles(id) ON DELETE CASCADE,
  name        TEXT        NOT NULL,
  subject     TEXT        NOT NULL DEFAULT '',
  body        TEXT        NOT NULL DEFAULT '',
  channel     TEXT        NOT NULL DEFAULT 'email',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.outreach_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles manage own templates"
  ON public.outreach_templates
  USING (
    profile_id IN (
      SELECT id FROM public.profiles WHERE auth_user_id = auth.uid()
    )
  );

-- Update outreach_campaigns to reference the real tables
ALTER TABLE public.outreach_campaigns
  ALTER COLUMN segment_id  TYPE UUID USING segment_id::uuid,
  ALTER COLUMN template_id TYPE UUID USING template_id::uuid;

ALTER TABLE public.outreach_campaigns
  ADD CONSTRAINT fk_campaign_segment  FOREIGN KEY (segment_id)  REFERENCES public.outreach_segments(id)  ON DELETE SET NULL,
  ADD CONSTRAINT fk_campaign_template FOREIGN KEY (template_id) REFERENCES public.outreach_templates(id) ON DELETE SET NULL;
