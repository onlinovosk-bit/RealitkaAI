-- Revolis Architect W1/W2 — AI triage + follow-up sledovanie na leadoch
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS ai_priority text,
  ADD COLUMN IF NOT EXISTS ai_reason text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_triage_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_priority_manual_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_ai_followup_at timestamptz,
  ADD COLUMN IF NOT EXISTS ai_followup_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.leads.ai_priority IS 'Haiku triage: Vysoká | Stredná | Nízka';
COMMENT ON COLUMN public.leads.ai_reason IS 'Stručný dôvod priorizácie (SK)';
COMMENT ON COLUMN public.leads.ai_triage_at IS 'Čas poslednej automatickej triáže';
COMMENT ON COLUMN public.leads.ai_priority_manual_at IS 'Ak NOT NULL — cron nesmie prepisovať ai_priority/reason';

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_ai_priority_ck;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_ai_priority_ck CHECK (
    ai_priority IS NULL OR ai_priority IN ('Vysoká', 'Stredná', 'Nízka')
  );
