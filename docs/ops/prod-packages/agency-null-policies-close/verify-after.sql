-- ============================================================================
-- verify-after.sql — BALÍK B „agency-null-policies-close". IBA SELECT.
-- Spúšťa sa PO apply.sql. Riadky s `ok = false` treba riešiť (P19); informatívne
-- riadky majú ok = NULL. Výstup uložiť vedľa verify-before.sql.
-- ============================================================================
WITH chk AS (

  SELECT 10 AS ord, 'politiky s vetvou agency_id IS NULL (vsetky schemy)' AS kontrola, '0' AS ocakavane,
         (SELECT count(*)::text FROM pg_policies
           WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
             AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) ~* 'agency_id\s+is\s+null') AS skutocne
  UNION ALL
  SELECT 11, 'activities_insert_agency a activities_select_agency neexistuju', '0',
         (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities'
            AND policyname IN ('activities_insert_agency', 'activities_select_agency'))
  UNION ALL
  SELECT 12, 'activities: politiky tenant_select / tenant_write / agency_select / agency_insert existuju', '4',
         (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities'
            AND policyname IN ('activities_tenant_select', 'activities_tenant_write', 'activities_agency_select', 'activities_agency_insert'))
  UNION ALL
  SELECT 13, 'tabulky z mapy bez zapnutej RLS (zoznam, ocakavane prazdne)', '',
         COALESCE((SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
                     FROM pg_class c
                    WHERE c.oid = ANY (ARRAY(SELECT to_regclass('public.' || t) FROM unnest(ARRAY[
                            'activities','ai_action_audit','ai_actions','bri_history','client_dna','deal_moments','deal_risk',
                            'lead_action_scores','lead_closing_windows','lead_events','lead_micro_actions','lead_rescue_runs',
                            'lead_scores','leads','pipeline_moves','platform_events','priority_alerts','properties']) AS t
                            WHERE to_regclass('public.' || t) IS NOT NULL))
                      AND NOT c.relrowsecurity), '')
  UNION ALL
  SELECT 20, 'rls_audit_snapshot: anon EXECUTE', 'false',
         COALESCE(has_function_privilege('anon', to_regprocedure('public.rls_audit_snapshot()'), 'EXECUTE')::text, 'false')
  UNION ALL
  SELECT 21, 'rls_audit_snapshot: authenticated EXECUTE', 'false',
         COALESCE(has_function_privilege('authenticated', to_regprocedure('public.rls_audit_snapshot()'), 'EXECUTE')::text, 'false')
  UNION ALL
  SELECT 22, 'rls_audit_snapshot: service_role EXECUTE (guard/CI ju potrebuju)', 'true',
         COALESCE(has_function_privilege('service_role', to_regprocedure('public.rls_audit_snapshot()'), 'EXECUTE')::text, 'true')
  UNION ALL
  -- regresia: bez tohto padne CELÁ tenantová izolácia
  SELECT 30, 'profile_agencies_for_auth(): authenticated EXECUTE (NESMIE sa zuziť)', 'true',
         COALESCE(has_function_privilege('authenticated', to_regprocedure('public.profile_agencies_for_auth()'), 'EXECUTE')::text, 'funkcia chyba')
  UNION ALL
  SELECT 31, 'zaloha pre rollback existuje (wp6_backup.policies_before)', 'true',
         (to_regclass('wp6_backup.policies_before') IS NOT NULL)::text
  UNION ALL
  SELECT 32, 'zaloha: pocet zalohovanych politik (najstarsia davka; = pocet prepisanych + legacy)',
         '(informativne)',
         CASE WHEN to_regclass('wp6_backup.policies_before') IS NULL THEN 'zaloha chyba'
              ELSE (xpath('/row/c/text()', query_to_xml('select count(*) as c from wp6_backup.policies_before where captured_at = (select min(captured_at) from wp6_backup.policies_before)', false, true, '')))[1]::text END
  UNION ALL
  SELECT 40, 'zostavajuce SECURITY DEFINER spustitelne cez anon (informativne; faza 2, mapa-ciest.md §3)', '(informativne)',
         COALESCE((SELECT string_agg(p.oid::regprocedure::text, ' ;; ' ORDER BY p.proname)
                     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE')), '(ziadne)')
)
SELECT ord, kontrola, ocakavane, skutocne,
       CASE WHEN ocakavane = '(informativne)' THEN NULL ELSE (ocakavane = skutocne) END AS ok
FROM chk
ORDER BY ord;
