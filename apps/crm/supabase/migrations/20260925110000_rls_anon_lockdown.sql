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

-- Guard note, added after this migration took CI down on `main` and on every
-- open PR (run 36128319331):
--
--   ERROR: relation "public.lead_property_scores" does not exist (SQLSTATE 42P01)
--   At statement: 4
--
-- `tasks` is created by 20260310_baseline_core_schema.sql, so it is present on
-- every fresh database and needs no guard. `lead_property_scores` and
-- `saas_leads` are created by NO migration in this directory — they exist only
-- in PROD, founded outside the migration history. On a clean database the
-- statements below therefore name tables that are not there.
--
-- `DROP POLICY IF EXISTS` guards the *policy*, not the *table*, and how loudly
-- Postgres complains about the missing table is version dependent. Measured on
-- a clean database, not assumed:
--
--   PG 15 (`major_version = 15` in config.toml -- what CI boots)
--       ERROR 42P01 on the very first DROP POLICY, statement 4. Migration
--       aborts, `supabase start` fails, nothing downstream ever runs.
--   PG 16 (checked locally against this exact file)
--       DROP POLICY IF EXISTS only raises NOTICE ... skipping, but the file
--       still dies further down on `CREATE POLICY ... ON public.saas_leads`.
--
-- Either way the pre-guard file cannot be replayed onto an empty database. The
-- existence check below removes both failure modes: when the table is absent
-- nothing inside the block is reached at all, on any version.
--
-- On PROD both tables exist, so the executed statements are byte-for-byte what
-- this migration already ran there — the lockdown semantics are unchanged.

-- lead_property_scores: no caller in the application at all.
DO $$
BEGIN
  IF to_regclass('public.lead_property_scores') IS NULL THEN
    RAISE NOTICE 'lead_property_scores absent here - no anon hole to close';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS select_lead_property_scores ON public.lead_property_scores';
  EXECUTE 'DROP POLICY IF EXISTS insert_lead_property_scores ON public.lead_property_scores';
  EXECUTE 'DROP POLICY IF EXISTS update_lead_property_scores ON public.lead_property_scores';
END $$;

-- saas_leads: capture runs on the service role, which does not consult RLS.
-- The one path that genuinely needs RLS is the platform-admin funnel screen.
-- Scoped to `authenticated` rather than `public`, so `anon` is not a candidate
-- role for it at all — the mistake this migration exists to undo.
DO $$
BEGIN
  IF to_regclass('public.saas_leads') IS NULL THEN
    RAISE NOTICE 'saas_leads absent here - no anon hole to close';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "saas_leads_select"          ON public.saas_leads';
  EXECUTE 'DROP POLICY IF EXISTS "Users can view their leads" ON public.saas_leads';
  EXECUTE 'DROP POLICY IF EXISTS "saas_leads_insert"          ON public.saas_leads';
  EXECUTE 'DROP POLICY IF EXISTS "Users can insert leads"     ON public.saas_leads';
  EXECUTE 'DROP POLICY IF EXISTS "saas_leads_update"          ON public.saas_leads';
  EXECUTE 'DROP POLICY IF EXISTS "Users can update own leads" ON public.saas_leads';
  EXECUTE 'DROP POLICY IF EXISTS "saas_leads_delete"          ON public.saas_leads';

  EXECUTE 'DROP POLICY IF EXISTS saas_leads_platform_admin ON public.saas_leads';
  -- The body has no single quotes, so a plain quoted literal is enough and this
  -- file needs no nested dollar-quote tag -- it stays on the same plain
  -- do-block-with-EXECUTE shape that 20260320_rls.sql already uses, which the
  -- CLI statement splitter is known to handle.
  --
  -- Careful with comments inside a do block: a doubled dollar sign or a stray
  -- apostrophe in here terminates the enclosing quote and breaks the file.
  EXECUTE '
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
      )';
END $$;
