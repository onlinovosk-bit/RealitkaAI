-- Close the anonymous read/write hole on onboarding_sessions.
--
-- Found while building the baseline in #705: reproducing production's policies
-- verbatim surfaced this one, which neither #697 nor #702 covered.
--
--   CREATE POLICY "Allow anon access" ON public.onboarding_sessions
--     AS PERMISSIVE FOR ALL TO anon USING (true) WITH CHECK (true);
--
-- FOR ALL, so it is not only a read hole: anyone holding the public anon key
-- could also insert, update and delete onboarding sessions.
--
-- Measured on ypgajkhqtbriqqmyawyv before this change, not assumed:
--
--   begin; set local role anon;
--   select count(*) from public.onboarding_sessions;
--   -> 5
--
-- Nothing in the application needs it. Both call sites are in
-- api/onboarding/session/route.ts (GET line 88, POST upsert line 172) and both
-- build their client with `createServiceRoleClient()`, and the service role
-- bypasses RLS entirely. The browser never touches the table directly either --
-- `lib/onboarding/session-api.ts` says so in its own header: "Browser-safe
-- helpers for onboarding_sessions sync via service-role API." A grep for the
-- table name across apps/crm/src returns those two call sites, two test
-- assertions and that comment, and nothing else.
--
-- So this policy never enabled a working path; it only exposed the table. Same
-- shape as `saas_leads` in #697: dropped, not replaced, because there is no
-- signed-in path that needs one.
--
-- The table is created by 20260925210000_baseline_prod_only_tables.sql, which
-- also recreates this policy on a clean database precisely so that the baseline
-- matches production. This migration is what then removes it, on both. The
-- guard follows AP-022: the DROP is reached only when the table is there.

DO $$
BEGIN
  IF to_regclass('public.onboarding_sessions') IS NULL THEN
    RAISE NOTICE 'onboarding_sessions absent here - no anon hole to close';
    RETURN;
  END IF;

  EXECUTE 'DROP POLICY IF EXISTS "Allow anon access" ON public.onboarding_sessions';
END $$;

-- RLS stays enabled with zero policies, which denies every role that consults
-- RLS. That is the intended end state, not an oversight: the only caller is the
-- service role, which does not consult it.
DO $$
BEGIN
  IF to_regclass('public.onboarding_sessions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.onboarding_sessions ENABLE ROW LEVEL SECURITY';
  END IF;
END $$;
