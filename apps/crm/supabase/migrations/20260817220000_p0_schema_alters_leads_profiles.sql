-- P0 column ALTERs only (follow-up to L38 audit #436).
-- NOT a replay of L37 20260816230000_prod_drift_profiles_leads (#435).
-- Do NOT drop or rename public.leads.last_contact (text, live from 16.8 founder ALTERs).
-- Code queries last_contact_at (timestamptz); prod currently has last_contact text only.
-- PREP ONLY. Do not apply via supabase db push / apply_migration from this PR.
-- Founder applies via Dashboard SQL Editor (same path as 16.8 / L37 / 20260811220000).
-- History INSERT (Dashboard only; pattern from 20260811220000_acquisition_core):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260817220000', 'p0_schema_alters_leads_profiles', ARRAY[]::text[], NULL);
--
-- Scope: leads.last_contact_at, leads.bri_score, leads.dossier, profiles.is_platform_admin.
-- Out of scope: l99_slots_*, ai_tone, enterprise_onboarded_at, hubspot_contact_id,
-- L37 16.8 columns, missing tables, 50 unrecorded local migrations.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_platform_admin boolean NOT NULL DEFAULT false;

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS bri_score smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dossier jsonb;

CREATE INDEX IF NOT EXISTS idx_leads_bri_score ON public.leads (bri_score);
CREATE INDEX IF NOT EXISTS idx_profiles_platform_admin
  ON public.profiles (id) WHERE is_platform_admin = true;
