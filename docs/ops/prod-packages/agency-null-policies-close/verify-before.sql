-- ============================================================================
-- verify-before.sql — BALÍK B „agency-null-policies-close". IBA SELECT.
-- Spúšťa founder (alebo agent po jeho GO) v PROD SQL editore PRED apply.sql.
-- Výstup uložiť ako dôkaz „pred". Po apply.sql spustiť verify-after.sql.
--
-- Stav PROD je k dátumu písania UNVERIFIED; tento skript ho zmeria.
-- Ako čítať:
--   sekcia 10  — všetky politiky s vetvou agency_id IS NULL, ktoré v PROD ŽIJÚ
--                (apply.sql ich prepíše; neznáme ho zastavia),
--   sekcia 20  — riadky s agency_id IS NULL (ak > 0, apply.sql sa zastaví),
--   sekcia 30  — stav tabuľky activities (legacy politiky + náhrada),
--   sekcia 40  — SECURITY DEFINER funkcie a kto ich môže spustiť,
--   sekcia 50  — iné NULL-vetvy (profile_id / lead_id IS NULL): mimo apply.sql.
-- ============================================================================
SELECT sekcia, kontrola, hodnota FROM (

  -- 10: živé politiky s vetvou agency_id IS NULL (všetky schémy okrem systémových)
  SELECT 10 AS ord, 'politiky_null' AS sekcia, 'pocet politik s agency_id IS NULL' AS kontrola,
         (SELECT count(*)::text FROM pg_policies
           WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
             AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) ~* 'agency_id\s+is\s+null') AS hodnota
  UNION ALL
  SELECT 11, 'politiky_null', 'zoznam (schema.tabulka.politika [cmd roles])',
         COALESCE((SELECT string_agg(schemaname || '.' || tablename || '.' || policyname || ' [' || cmd || ' ' || roles::text || ']',
                                     ' ;; ' ORDER BY schemaname, tablename, policyname)
                     FROM pg_policies
                    WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
                      AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) ~* 'agency_id\s+is\s+null'), '(ziadne)')
  UNION ALL
  -- politiky z mapy: existuje? ma NULL vetvu? (UNVERIFIED v PROD; repo ich po migraciach nema)
  SELECT 12, 'politiky_null', 'politiky z mapy apply.sql: existuje / ma vetvu NULL',
         (SELECT string_agg(m.t || '.' || m.p || '=' ||
                  CASE WHEN p.policyname IS NULL THEN 'chyba'
                       WHEN (COALESCE(p.qual, '') || ' ' || COALESCE(p.with_check, '')) ~* 'agency_id\s+is\s+null' THEN 'EXISTUJE-S-NULL'
                       ELSE 'ok-bez-null' END, ' ;; ' ORDER BY m.t, m.p)
            FROM (VALUES
              ('activities','activities_tenant_select'),('activities','activities_tenant_write'),
              ('ai_action_audit','ai_action_audit_insert_tenant'),('ai_action_audit','ai_action_audit_select_tenant'),
              ('ai_actions','ai_actions_tenant'),('bri_history','bri_history_tenant'),('client_dna','client_dna_tenant'),
              ('deal_moments','deal_moments_tenant'),('deal_risk','deal_risk_tenant'),
              ('lead_action_scores','lead_action_scores_tenant'),('lead_closing_windows','closing_windows_tenant'),
              ('lead_events','lead_events_tenant'),('lead_micro_actions','micro_actions_tenant'),
              ('lead_rescue_runs','rescue_runs_tenant'),('lead_scores','lead_scores_tenant'),('leads','leads_tenant'),
              ('pipeline_moves','pipeline_moves_tenant_select'),('pipeline_moves','pipeline_moves_tenant_write'),
              ('platform_events','platform_events_select_tenant'),('priority_alerts','priority_alerts_tenant'),
              ('properties','properties_tenant')) AS m(t, p)
            LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = m.t AND p.policyname = m.p)
  UNION ALL
  SELECT 13, 'politiky_null', 'tabulky z mapy: RLS zapnuta (false = politiky nic nechrania)',
         (SELECT string_agg(m.t || '=' || COALESCE(c.relrowsecurity::text, 'tabulka-chyba'), ' ;; ' ORDER BY m.t)
            FROM (VALUES ('activities'),('ai_action_audit'),('ai_actions'),('bri_history'),('client_dna'),('deal_moments'),
                         ('deal_risk'),('lead_action_scores'),('lead_closing_windows'),('lead_events'),('lead_micro_actions'),
                         ('lead_rescue_runs'),('lead_scores'),('leads'),('pipeline_moves'),('platform_events'),
                         ('priority_alerts'),('properties')) AS m(t)
            LEFT JOIN pg_class c ON c.oid = to_regclass('public.' || m.t))

  -- 20: riadky s agency_id IS NULL (dopad prepísania: také riadky by sa skryli)
  UNION ALL
  SELECT 20, 'riadky_null', 'tabuliek so stlpcom agency_id (public, zakladne tabulky)',
         (SELECT count(*)::text FROM information_schema.columns c
            JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
           WHERE c.table_schema = 'public' AND c.column_name = 'agency_id')
  UNION ALL
  SELECT 21, 'riadky_null', 'tabulky s riadkami agency_id IS NULL (tabulka=pocet)',
         COALESCE((SELECT string_agg(x.tn || '=' || x.n, ' ;; ' ORDER BY x.tn)
                     FROM (SELECT c.table_name AS tn,
                                  (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I where agency_id is null', c.table_name), false, true, '')))[1]::text AS n
                             FROM information_schema.columns c
                             JOIN information_schema.tables t ON t.table_schema = c.table_schema AND t.table_name = c.table_name AND t.table_type = 'BASE TABLE'
                            WHERE c.table_schema = 'public' AND c.column_name = 'agency_id') x
                    WHERE x.n::bigint > 0), '(ziadne)')
  UNION ALL
  SELECT 22, 'riadky_null', 'leads.agency_id: nullable / NOT NULL constraint (NO = vetva v activities je mrtva)',
         COALESCE((SELECT is_nullable FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'agency_id'), 'stlpec chyba')

  -- 30: activities
  UNION ALL
  SELECT 30, 'activities', 'politiky na activities',
         COALESCE((SELECT string_agg(policyname || ' [' || cmd || ' ' || roles::text || '] ' ||
                                     regexp_replace(COALESCE(qual, '') || ' ' || COALESCE(with_check, ''), '\s+', ' ', 'g'), ' ;; ' ORDER BY policyname)
                     FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities'), '(ziadne / tabulka chyba)')
  UNION ALL
  SELECT 31, 'activities', 'nahrada z 20261001170000: stlpec agency_id / trigger activities_fill_agency_trg / policy activities_agency_insert',
         EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'activities' AND column_name = 'agency_id')::text || ' / ' ||
         EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid = to_regclass('public.activities') AND tgname = 'activities_fill_agency_trg' AND NOT tgisinternal)::text || ' / ' ||
         EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'activities' AND policyname = 'activities_agency_insert')::text
  UNION ALL
  SELECT 32, 'activities', 'activities: riadkov celkom',
         CASE WHEN to_regclass('public.activities') IS NULL THEN 'tabulka chyba'
              ELSE (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.activities', false, true, '')))[1]::text END
  UNION ALL
  SELECT 33, 'activities', 'activities: riadkov s lead_id IS NULL (bez vlastnika, ak nema agency_id)',
         CASE WHEN to_regclass('public.activities') IS NULL THEN 'tabulka chyba'
              ELSE (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.activities where lead_id is null', false, true, '')))[1]::text END

  -- 40: SECURITY DEFINER funkcie v public a ich EXECUTE
  UNION ALL
  SELECT 40, 'secdef', 'SECURITY DEFINER funkcie spustitelne cez anon (pocet)',
         (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prosecdef AND has_function_privilege('anon', p.oid, 'EXECUTE'))
  UNION ALL
  SELECT 41, 'secdef', 'zoznam: nazov(args) [anon/authenticated/service_role EXECUTE; trigger?]',
         COALESCE((SELECT string_agg(p.oid::regprocedure::text || ' [' ||
                         has_function_privilege('anon', p.oid, 'EXECUTE')::text || '/' ||
                         has_function_privilege('authenticated', p.oid, 'EXECUTE')::text || '/' ||
                         has_function_privilege('service_role', p.oid, 'EXECUTE')::text ||
                         CASE WHEN p.prorettype = 'trigger'::regtype THEN '; trigger' ELSE '' END || ']',
                         ' ;; ' ORDER BY p.proname)
                     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.prosecdef), '(ziadne)')
  UNION ALL
  SELECT 42, 'secdef', 'SECURITY DEFINER bez pevneho search_path (riziko hijacku)',
         COALESCE((SELECT string_agg(p.oid::regprocedure::text, ' ;; ' ORDER BY p.proname)
                     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.prosecdef
                      AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, ARRAY[]::text[])) c WHERE c LIKE 'search_path=%')), '(ziadne)')
  UNION ALL
  SELECT 43, 'secdef', 'funkcie z decisions.md (12): existuju v PROD? (nazov=pocet pretazeni)',
         (SELECT string_agg(f.n || '=' || (SELECT count(*) FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
                                             WHERE ns.nspname = 'public' AND p.proname = f.n), ' ;; ' ORDER BY f.n)
            FROM (VALUES ('record_brief_click'),('record_brief_open'),('add_price_point'),('compute_bri_score'),('compute_bri_score_v2'),
                         ('expire_arbitrage_matches'),('rotate_bri_snapshots'),('get_valuation_tenant'),('match_leads'),
                         ('match_properties'),('profile_agencies_for_auth'),('rls_audit_snapshot')) AS f(n))
  UNION ALL
  SELECT 44, 'secdef', 'match_leads / match_properties: SECURITY DEFINER? (nie su v aktivnych migraciach repa)',
         COALESCE((SELECT string_agg(p.oid::regprocedure::text || ' secdef=' || p.prosecdef::text || ' anon=' || has_function_privilege('anon', p.oid, 'EXECUTE')::text, ' ;; ')
                     FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                    WHERE n.nspname = 'public' AND p.proname IN ('match_leads', 'match_properties')), '(funkcie v PROD nie su)')
  UNION ALL
  SELECT 45, 'secdef', 'rls_audit_snapshot: proacl (kto ma EXECUTE)',
         COALESCE((SELECT COALESCE(p.proacl::text, '(NULL = default PUBLIC)') FROM pg_proc p WHERE p.oid = to_regprocedure('public.rls_audit_snapshot()')), 'funkcia chyba')

  -- 50: iné NULL-vetvy (mimo apply.sql; len hlásenie)
  UNION ALL
  SELECT 50, 'ine_null', 'politiky s vetvou "<stlpec> IS NULL" okrem agency_id (zoznam)',
         COALESCE((SELECT string_agg(tablename || '.' || policyname || ' [' || cmd || ' ' || roles::text || ']', ' ;; ' ORDER BY tablename, policyname)
                     FROM pg_policies
                    WHERE schemaname = 'public'
                      AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) ~* '\w+\s+is\s+null'
                      AND regexp_replace(COALESCE(qual, '') || ' ' || COALESCE(with_check, ''), 'agency_id\s+is\s+null', '', 'gi') ~* '\w+\s+is\s+null'), '(ziadne)')
  UNION ALL
  SELECT 51, 'ine_null', 'tabulky public, kde anon ma akekolvek pravo (pocet)',
         (SELECT count(*)::text FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
           WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
             AND has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER'))

  -- 60: záloha z predchádzajúceho behu
  UNION ALL
  SELECT 60, 'zaloha', 'schema wp6_backup uz existuje (predchadzajuci beh apply.sql)',
         (to_regclass('wp6_backup.policies_before') IS NOT NULL)::text

) q
ORDER BY ord;
