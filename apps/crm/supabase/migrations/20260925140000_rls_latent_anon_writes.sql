-- Close the three remaining anon-writable tables (RLS-LATENT-3).
--
-- 20260925110000 closed the live exposure: anon could read 227 tasks and 14
-- saas_leads. These three were found in the same sweep and left for a separate
-- gate because all three tables hold zero rows, so the exposure is latent —
-- nothing has leaked, but anything could be written.
--
-- Measured on PROD (ypgajkhqtbriqqmyawyv) before this change, as `anon`, inside
-- a rolled-back transaction. anon holds full table grants on all three
-- (SELECT/INSERT/UPDATE/DELETE), so RLS is the only gate there is:
--
--   table                  anon SELECT        anon INSERT
--   lead_property_events   allowed            ALLOWED with real FK targets
--   leads_demo             0 rows (correct)   ALLOWED
--   bsm_reforma_leads      allowed            ALLOWED
--
-- The lead_property_events insert is worth spelling out: a first probe came
-- back as a foreign-key violation (23503), not an RLS violation (42501). That
-- is the proof RLS let it through — the row was rejected downstream of the
-- policy. Repeated with a real lead_id and property_id, the insert succeeded.
--
-- Per table, from reading the callers rather than assuming they are alike:
--
--   lead_property_events   No caller anywhere in apps/crm/src. The only mention
--                          in the repo is a one-off audit script. No migration
--                          creates the table either — it is PROD drift, like
--                          lead_property_scores in 20260925110000. Both
--                          policies go; nothing needs them.
--
--   leads_demo             Both callers use `createAdminClient()`
--                          (api/demo/capture-lead, api/meta/lookalike), and the
--                          service role bypasses RLS entirely. So the
--                          `WITH CHECK (true)` INSERT policy served no caller —
--                          it only let anyone holding the publishable key stuff
--                          the demo funnel with fabricated leads, which would
--                          then be synced onward to HubSpot. The `service_only`
--                          SELECT policy is `USING (false)`: it grants nothing
--                          and its name records the intent, so it stays.
--
--   bsm_reforma_leads      One caller, POST /api/bsm-reforma/lead, which runs on
--                          the user-scoped client and returns 401 without a
--                          session, then inserts the caller's own profile_id.
--                          So the policies are scoped to `authenticated` and to
--                          the caller's own profile — which is exactly what the
--                          route already does, and nothing more.
--
--                          The SELECT policy also loses its `profile_id IS NULL`
--                          escape. That disjunct made every unattributed row
--                          readable by anyone including anon, which is the same
--                          mistake as `USING (true)` wearing a tenant check as a
--                          disguise. With the INSERT policy requiring the
--                          caller's own profile, no such row can be created
--                          through the API any more.
--
-- Open, NOT fixed here and deliberately outside this gate: public.outreach_logs
-- carries the identical pattern (`outreach_logs_agency` FOR ALL with a
-- `lead_id IS NULL` escape, plus `owners read own outreach logs` with a
-- `profile_id IS NULL` escape, both for role `public`). Measured as anon:
-- SELECT allowed, INSERT ALLOWED. It is empty too. Flagged for its own gate
-- rather than folded in silently.
--
-- Applied to PROD in the same change under the GO RLS-LATENT-3 gate, with
-- before/after measured through `set local role anon`.
-- History INSERT (Dashboard only, if replaying by hand):
--   INSERT INTO supabase_migrations.schema_migrations (version, name, statements, created_by)
--   VALUES ('20260925140000', 'rls_latent_anon_writes', ARRAY[]::text[], NULL);

-- `lead_property_events` and `leads_demo` are PROD drift: no migration in this
-- directory creates either, so on the clean database CI boots they are absent.
-- `DROP POLICY IF EXISTS` guards the policy, not the table, and on PG 15 — which
-- is what config.toml boots — it errors 42P01 on the missing table outright.
-- That is how 20260925110000 took CI down before #700 guarded it, so this file
-- carries the guard from the start, in the same `to_regclass` shape #700
-- established rather than inventing a second way to ask the same question.

-- lead_property_events: no caller in the application at all.
DO $$
BEGIN
  IF to_regclass('public.lead_property_events') IS NULL THEN
    RAISE NOTICE 'lead_property_events absent here - no anon hole to close';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS select_lead_property_events ON public.lead_property_events';
  EXECUTE 'DROP POLICY IF EXISTS insert_lead_property_events ON public.lead_property_events';
END $$;

-- leads_demo: capture runs on the service role, which does not consult RLS.
DO $$
BEGIN
  IF to_regclass('public.leads_demo') IS NULL THEN
    RAISE NOTICE 'leads_demo absent here - no anon hole to close';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "insert" ON public.leads_demo';
END $$;

-- bsm_reforma_leads: created by 20260426150000_bsm_reforma_campaign.sql, so it
-- exists in every environment and needs no guard.
DROP POLICY IF EXISTS "bsm leads insert public" ON public.bsm_reforma_leads;
DROP POLICY IF EXISTS "owners read own bsm leads" ON public.bsm_reforma_leads;

DROP POLICY IF EXISTS bsm_reforma_leads_own_insert ON public.bsm_reforma_leads;
CREATE POLICY bsm_reforma_leads_own_insert
  ON public.bsm_reforma_leads FOR INSERT TO authenticated
  WITH CHECK (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );

DROP POLICY IF EXISTS bsm_reforma_leads_own_select ON public.bsm_reforma_leads;
CREATE POLICY bsm_reforma_leads_own_select
  ON public.bsm_reforma_leads FOR SELECT TO authenticated
  USING (
    profile_id IN (SELECT id FROM public.profiles WHERE auth_user_id = auth.uid())
  );
