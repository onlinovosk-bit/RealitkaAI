-- Close the anonymous read/write hole on tasks, saas_leads and lead_property_scores.
--
-- Found by the PROD-SHAPE-DIFF gate (docs/reports/2026-09-25-prod-shape-diff.md)
-- and reproduced before this change on project ypgajkhqtbriqqmyawyv:
--
--   begin; set local role anon;
--   select count(*) from public.tasks, public.saas_leads;
--   -> tasks 227, saas_leads 14
--
-- The report names the read. The policies below also cover INSERT, UPDATE and
-- DELETE, so anyone holding the public anon key could delete all 227 tasks.
-- RLS policies are OR-ed, so a correct tenant policy next to a `USING (true)`
-- one has no effect: true always wins.
--
-- Each table needed a different fix, established by reading the callers rather
-- than assuming they were alike:
--
--   tasks                 `tasks_agency` (FOR ALL) already scopes signed-in
--                         users, so dropping the permissive four restores
--                         correct behaviour and breaks nothing.
--   lead_property_scores  no reference anywhere in apps/crm/src. Nothing reads
--                         or writes it through the API.
--   saas_leads            the public funnel writes through
--                         `createServiceRoleClient` (api/sales-funnel/demo-request),
--                         and the service role bypasses RLS entirely — the
--                         permissive policies never helped capture, they only
--                         exposed it. `api/sales-funnel/update-status` reads and
--                         writes as a signed-in platform admin, so that path
--                         does need a policy, and gets a narrow one.
--                         Its own source comment already knew: "saas_leads RLS
--                         (owner_profile_id IS NULL / using true) could flip
--                         statuses."
--
-- PREP ONLY as a file, but unlike the earlier migrations this one was applied
-- to PROD in the same change under the GO_RLS_ANON_LOCKDOWN gate, with the
-- before/after counts measured through `set local role anon`. It is recorded
-- here so a fresh environment or a `db reset` does not silently reopen the hole.
-- History INSERT (Dashboard only, if replaying by hand):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260925110000', 'rls_anon_lockdown', ARRAY[]::text[], NULL);

-- tasks: tenant policy `tasks_agency` remains and keeps signed-in users working.
DROP POLICY IF EXISTS tasks_select ON public.tasks;
DROP POLICY IF EXISTS tasks_insert ON public.tasks;
DROP POLICY IF EXISTS tasks_update ON public.tasks;
DROP POLICY IF EXISTS tasks_delete ON public.tasks;

-- lead_property_scores: no caller in the application at all.
DROP POLICY IF EXISTS select_lead_property_scores ON public.lead_property_scores;
DROP POLICY IF EXISTS insert_lead_property_scores ON public.lead_property_scores;
DROP POLICY IF EXISTS update_lead_property_scores ON public.lead_property_scores;

-- saas_leads: capture runs on the service role, which does not consult RLS.
DROP POLICY IF EXISTS "saas_leads_select"          ON public.saas_leads;
DROP POLICY IF EXISTS "Users can view their leads" ON public.saas_leads;
DROP POLICY IF EXISTS "saas_leads_insert"          ON public.saas_leads;
DROP POLICY IF EXISTS "Users can insert leads"     ON public.saas_leads;
DROP POLICY IF EXISTS "saas_leads_update"          ON public.saas_leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.saas_leads;
DROP POLICY IF EXISTS "saas_leads_delete"          ON public.saas_leads;

-- The one path that genuinely needs RLS: the platform-admin funnel screen.
-- Scoped to `authenticated` rather than `public`, so `anon` is not a candidate
-- role for it at all — the mistake this migration exists to undo.
DROP POLICY IF EXISTS saas_leads_platform_admin ON public.saas_leads;
CREATE POLICY saas_leads_platform_admin
  ON public.saas_leads FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.is_platform_admin
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.auth_user_id = auth.uid() AND p.is_platform_admin
    )
  );
