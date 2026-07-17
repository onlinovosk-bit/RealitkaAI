-- Inbound auto-response v1: dedup timestamp on lead, opt-out on agency.

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS auto_response_sent_at timestamptz;

ALTER TABLE public.agencies
  ADD COLUMN IF NOT EXISTS auto_response_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.leads.auto_response_sent_at IS
  'Set after first inbound auto-response email; NULL = not yet sent.';

COMMENT ON COLUMN public.agencies.auto_response_enabled IS
  'When false, inbound gateway skips auto-response for this agency.';
