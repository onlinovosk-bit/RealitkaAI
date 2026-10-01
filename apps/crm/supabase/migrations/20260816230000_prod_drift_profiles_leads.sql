-- Repo catch-up: prod schema drift applied manually by founder on 16 Aug 2026
-- via Supabase Dashboard. Idempotent ADD COLUMN IF NOT EXISTS.
-- PREP ONLY. Do not apply via supabase db push / apply_migration from this PR.
-- Founder already applied the ALTERs; record schema_migrations the same way as
-- 20260811220000_acquisition_core (Dashboard SQL Editor + history row).
-- Source: docs/reports/2026-08-16-perf-hotfix-zaverecny-report.md (Schema drift).
-- History INSERT (Dashboard only; pattern from 20260811220000_acquisition_core):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260816230000', 'prod_drift_profiles_leads', ARRAY[]::text[], NULL);

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tier_updated_at timestamptz;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS sofia_insight          text,
  ADD COLUMN IF NOT EXISTS ai_insight             text,
  ADD COLUMN IF NOT EXISTS ai_engine              jsonb,
  ADD COLUMN IF NOT EXISTS ai_priority            text,
  ADD COLUMN IF NOT EXISTS ai_reason              text DEFAULT '',
  ADD COLUMN IF NOT EXISTS ai_triage_at           timestamptz,
  ADD COLUMN IF NOT EXISTS ai_priority_manual_at  timestamptz,
  ADD COLUMN IF NOT EXISTS last_ai_followup_at    timestamptz,
  ADD COLUMN IF NOT EXISTS ai_followup_count      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS client_segment         text,
  ADD COLUMN IF NOT EXISTS buyer_readiness_score  integer,
  ADD COLUMN IF NOT EXISTS assigned_profile_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_active              boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_contact           text NOT NULL DEFAULT 'Práve vytvorený',
  ADD COLUMN IF NOT EXISTS note                   text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS financing              text NOT NULL DEFAULT 'Hypotéka',
  ADD COLUMN IF NOT EXISTS timeline               text NOT NULL DEFAULT 'Do 3 mesiacov',
  ADD COLUMN IF NOT EXISTS property_type          text NOT NULL DEFAULT 'Byt',
  ADD COLUMN IF NOT EXISTS rooms                  text NOT NULL DEFAULT '2 izby';
