-- Demo Ops: Calendly bookings + B2B prospect match (Agent D)

CREATE TABLE IF NOT EXISTS public.demo_prospects (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ico                 TEXT        NOT NULL,
  nazov               TEXT        NOT NULL DEFAULT '',
  mesto               TEXT        NOT NULL DEFAULT '',
  kraj                TEXT        NOT NULL DEFAULT '',
  icp_score           INTEGER     NOT NULL DEFAULT 0,
  web                 TEXT,
  outreach_email      TEXT,
  email_domain        TEXT,
  team_size_estimate  INTEGER,
  portals_detected    TEXT[]      NOT NULL DEFAULT '{}',
  crm_signals         TEXT[]      NOT NULL DEFAULT '{}',
  konatel             TEXT,
  disqualified        BOOLEAN     NOT NULL DEFAULT FALSE,
  personal_line       TEXT,
  imported_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT demo_prospects_ico_uq UNIQUE (ico)
);

CREATE INDEX IF NOT EXISTS idx_demo_prospects_email_domain
  ON public.demo_prospects (email_domain)
  WHERE email_domain IS NOT NULL AND NOT disqualified;

CREATE INDEX IF NOT EXISTS idx_demo_prospects_icp_score
  ON public.demo_prospects (icp_score DESC)
  WHERE NOT disqualified;

CREATE TABLE IF NOT EXISTS public.demo_bookings (
  id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  calendly_invitee_uri    TEXT        NOT NULL,
  calendly_event_uri      TEXT,
  invitee_email           TEXT        NOT NULL,
  invitee_name            TEXT        NOT NULL DEFAULT '',
  scheduled_at            TIMESTAMPTZ,
  utm_source              TEXT,
  utm_medium              TEXT,
  utm_campaign            TEXT,
  utm_content             TEXT,
  utm_term                TEXT,
  prospect_id             UUID        REFERENCES public.demo_prospects(id) ON DELETE SET NULL,
  unknown_prospect        BOOLEAN     NOT NULL DEFAULT FALSE,
  raw_payload             JSONB       NOT NULL DEFAULT '{}',
  brief_sent_at           TIMESTAMPTZ,
  recap_draft             TEXT,
  recap_approval_sent_at  TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT demo_bookings_invitee_uri_uq UNIQUE (calendly_invitee_uri)
);

CREATE INDEX IF NOT EXISTS idx_demo_bookings_scheduled_at
  ON public.demo_bookings (scheduled_at);

CREATE INDEX IF NOT EXISTS idx_demo_bookings_brief_pending
  ON public.demo_bookings (scheduled_at)
  WHERE brief_sent_at IS NULL;

ALTER TABLE public.demo_prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.demo_prospects IS
  'B2B outreach prospects imported from FinStat/prospecting pipeline for demo prep.';
COMMENT ON TABLE public.demo_bookings IS
  'Calendly demo bookings; brief/recap crons use service role only.';
