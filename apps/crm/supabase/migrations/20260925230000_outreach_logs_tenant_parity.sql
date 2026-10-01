-- outreach_logs: bring PROD to the policy this repo has defined since June.
--
-- This is NOT a new fix. 20260616124500_rls_wave_a_leak_closure.sql already
-- drops the two escaped policies and creates `outreach_logs_tenant` in exactly
-- the shape below. That migration is absent from PROD's
-- supabase_migrations.schema_migrations, and its effect is absent too, so a
-- clean database (what CI boots) has been correctly locked down for three
-- months while production has not. The RLS isolation suite passes for the same
-- reason: it runs against the clean database, where the hole does not exist.
--
-- Measured on PROD (ypgajkhqtbriqqmyawyv) before this change, in a rolled-back
-- transaction, with one unattributable row planted (lead_id NULL, profile_id
-- NULL) — the shape both escapes expose:
--
--   role                          operation   result
--   anon                          SELECT      sees 1 of 1
--   anon                          INSERT      ALLOWED
--   anon                          DELETE      ALLOWED  <- erases the audit log
--   authenticated (real profile)  SELECT      sees 1 of 1
--
-- The DELETE is the one that matters. `outreach_logs` is the audit trail of
-- what the system sent to whom; `outreach_logs_agency` is FOR ALL, so the
-- `lead_id IS NULL` disjunct made every unattributed row deletable by anyone
-- holding the publishable key. A campaign log that can be erased anonymously
-- is not a log.
--
-- Why the escapes are wrong, not merely loose: `lead_id IS NULL OR lead_id IN
-- (my agency's leads)` reads as a tenant check and behaves as `USING (true)`
-- for every row the join cannot attribute. The same disguise as the
-- `profile_id IS NULL` disjunct in `owners read own outreach logs`.
--
-- The only writer is the ghost-resurrection-bsm edge function, which runs on
-- the service role and so does not consult RLS at all. Nothing in
-- apps/crm/src touches this table. So scoping to `authenticated` costs no
-- caller anything.
--
-- `service role outreach full access` is left alone on purpose: it is what
-- 20260426150000 created and what 20260616124500 leaves in place, so keeping it
-- makes PROD match the clean database exactly rather than approximately. It
-- grants nothing to anon (`auth.role() = 'service_role'` is false there) and
-- nothing to the service role either, which bypasses RLS regardless.
--
-- Idempotent, and a no-op on any database that already replayed
-- 20260616124500: the policy is dropped and recreated identically.
--
-- Applied to PROD in the same change under the GO RLS-OUTREACH-LOGS gate.
-- History INSERT (Dashboard only, if replaying by hand):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260925230000', 'outreach_logs_tenant_parity', ARRAY[]::text[], NULL);

ALTER TABLE public.outreach_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owners read own outreach logs" ON public.outreach_logs;
DROP POLICY IF EXISTS "outreach_logs_agency"          ON public.outreach_logs;
DROP POLICY IF EXISTS "outreach_logs_tenant"          ON public.outreach_logs;

-- Copied verbatim from 20260616124500 so the two files cannot drift apart.
CREATE POLICY "outreach_logs_tenant"
  ON public.outreach_logs FOR ALL TO authenticated
  USING (
    (lead_id IS NOT NULL AND lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
    ))
    OR
    (profile_id IS NOT NULL AND profile_id IN (
      SELECT id FROM public.profiles
      WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
    ))
  )
  WITH CHECK (
    (lead_id IS NOT NULL AND lead_id IN (
      SELECT id FROM public.leads
      WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
    ))
    OR
    (profile_id IS NOT NULL AND profile_id IN (
      SELECT id FROM public.profiles
      WHERE agency_id IN (SELECT public.profile_agencies_for_auth())
    ))
  );
