-- Activation onboarding e-mail event log (D0–D7 sequence, Brief 8 / prompt)

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS activation_email_opt_out BOOLEAN NOT NULL DEFAULT FALSE;

CREATE TABLE IF NOT EXISTS public.activation_email_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id         UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  node              TEXT NOT NULL,
  activation_state  TEXT NOT NULL,
  recipient_email   TEXT NOT NULL,
  subject           TEXT NOT NULL,
  status            TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('sent', 'suppressed', 'skipped_flag', 'founder_draft')),
  meta              JSONB NOT NULL DEFAULT '{}'::jsonb,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activation_email_events_agency
  ON public.activation_email_events (agency_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_activation_email_events_node
  ON public.activation_email_events (node, sent_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_activation_email_events_agency_node_day
  ON public.activation_email_events (
    agency_id,
    node,
    (timezone('utc', sent_at)::date)
  );

COMMENT ON TABLE public.activation_email_events IS
  'Lifecycle activation e-mails (D0–D7). Suppression: max 1 send per node per agency per UTC day.';

CREATE OR REPLACE VIEW public.activation_email_metrics AS
SELECT
  agency_id,
  node,
  activation_state,
  COUNT(*) FILTER (WHERE status = 'sent') AS sent_count,
  COUNT(*) FILTER (WHERE status = 'founder_draft') AS founder_draft_count,
  MIN(sent_at) AS first_sent_at,
  MAX(sent_at) AS last_sent_at
FROM public.activation_email_events
GROUP BY agency_id, node, activation_state;
