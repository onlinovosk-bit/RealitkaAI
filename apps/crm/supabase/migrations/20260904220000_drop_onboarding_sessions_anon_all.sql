-- 20260904220000_drop_onboarding_sessions_anon_all.sql
-- PREPARED ONLY — do NOT apply from Cursor / agent.
-- Founder applies AFTER preview OK + merge GO (Path B: API /api/onboarding/session uses service role).
-- Audit: docs/audit/2026-09-04-rls-anon-policies.md (#8 Allow anon access)
-- Task: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
-- Rollback: docs/runbooks/rollback-onboarding-sessions-anon.md
--
-- Effect: DROP "Allow anon access" on public.onboarding_sessions.
-- After drop, RLS remains enabled with 0 policies → full deny for anon/authenticated.
-- Service role bypasses RLS (API upsert/get). No authenticated policy needed for public wizard.
-- Guard: to_regclass — table may be absent on fresh CI DBs that never had the loose SQL create.

BEGIN;

DO $$
BEGIN
  IF to_regclass('public.onboarding_sessions') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow anon access" ON public.onboarding_sessions;
  END IF;
END $$;

COMMIT;