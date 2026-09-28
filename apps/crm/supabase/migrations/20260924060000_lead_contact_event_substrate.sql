-- WALL 0 — contact-attempt substrate for C1.
--
-- Additive columns on the EXISTING public.lead_events table. No new table: the
-- reuse check found lead_events already agency-scoped, RLS-protected, indexed
-- and written to by /api/ai/lead-events. It was missing only the fields that
-- make a contact attempt countable.
--
-- Does NOT touch public.leads.last_contact (text, 'Práve vytvorený') and does
-- NOT backfill anything. Rows written before this change keep occurred_at NULL
-- and are reported as UNKNOWN, never as a contact that did not happen and never
-- as one whose time we invented from created_at.
--
-- PREP ONLY. Do not apply via `supabase db push` / apply_migration from this PR.
-- Founder applies via Dashboard SQL Editor (same path as 20260817220000).
-- History INSERT (Dashboard only):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260924060000', 'lead_contact_event_substrate', ARRAY[]::text[], NULL);

ALTER TABLE public.lead_events
  -- When the attempt happened, not when the row was written. Nullable on
  -- purpose: unknown must stay representable.
  ADD COLUMN IF NOT EXISTS occurred_at      timestamptz,
  ADD COLUMN IF NOT EXISTS actor_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS channel          text,
  ADD COLUMN IF NOT EXISTS outcome          text,
  ADD COLUMN IF NOT EXISTS source           text,
  ADD COLUMN IF NOT EXISTS note             text;

-- Vocabulary is closed at the storage layer too, so a typo cannot quietly
-- become a new channel. NULL stays legal for every pre-existing row.
ALTER TABLE public.lead_events
  DROP CONSTRAINT IF EXISTS lead_events_channel_check;
ALTER TABLE public.lead_events
  ADD CONSTRAINT lead_events_channel_check
  CHECK (channel IS NULL OR channel IN ('call', 'email', 'sms', 'whatsapp', 'other'));

ALTER TABLE public.lead_events
  DROP CONSTRAINT IF EXISTS lead_events_outcome_check;
ALTER TABLE public.lead_events
  ADD CONSTRAINT lead_events_outcome_check
  CHECK (outcome IS NULL OR outcome IN ('answered', 'unanswered', 'sent', 'bounced', 'other'));

ALTER TABLE public.lead_events
  DROP CONSTRAINT IF EXISTS lead_events_source_check;
ALTER TABLE public.lead_events
  ADD CONSTRAINT lead_events_source_check
  CHECK (source IS NULL OR source IN ('manual', 'system-assisted'));

-- The C1 query: first contact attempt per lead within a tenant. Partial, so it
-- stays small next to the high-volume email_open/click rows.
CREATE INDEX IF NOT EXISTS idx_lead_events_contact_attempt
  ON public.lead_events (agency_id, lead_id, occurred_at)
  WHERE type = 'contact_attempted';

COMMENT ON COLUMN public.lead_events.occurred_at IS
  'When the event actually happened. NULL = unknown; never substitute created_at.';
