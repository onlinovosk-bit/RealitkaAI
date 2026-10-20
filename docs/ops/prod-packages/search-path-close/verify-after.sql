-- verify-after.sql — BALÍK E. IBA SELECT. Po apply: všetky riadky PASS.
-- ACL sa nemení: 10 funkcií ostáva service_role-only, get_supply_demand_gap ostáva pre authenticated.
-- Voliteľný smoke test (spustiť manuálne ako service_role, ak je v leads aspoň jeden embedding):
--   SELECT count(*) FROM public.match_leads((SELECT embedding FROM public.leads WHERE embedding IS NOT NULL LIMIT 1), 0.3, 1);
WITH fn(sig, exp_sp, exp_anon, exp_auth) AS (VALUES
  ('public.calculate_broker_metrics()', 'search_path=public, pg_temp', false, false),
  ('public.compute_motivation_score(uuid,uuid,text)', 'search_path=public, pg_temp', false, false),
  ('public.detect_broker_weakness(uuid)', 'search_path=public, pg_temp', false, false),
  ('public.get_supply_demand_gap(text)', 'search_path=public, pg_temp', false, true),
  ('public.increment_api_usage(text)', 'search_path=public, pg_temp', false, false),
  ('public.log_event(uuid,text,text,text,jsonb)', 'search_path=public, pg_temp', false, false),
  ('public.match_leads(extensions.vector,double precision,integer)', 'search_path=public, extensions, pg_temp', false, false),
  ('public.match_properties(extensions.vector,double precision,integer)', 'search_path=public, extensions, pg_temp', false, false),
  ('public.rate_limit_increment(text,timestamptz,integer)', 'search_path=public, pg_temp', false, false),
  ('public.recompute_broker_metrics(uuid)', 'search_path=public, pg_temp', false, false),
  ('public.record_kataster_event(uuid,text,text,text,uuid,text,text,text,jsonb)', 'search_path=public, pg_temp', false, false)),
chk AS (
  SELECT 10 AS ord, f.sig || ': search_path' AS kontrola, f.exp_sp AS ocakavane,
         COALESCE((SELECT array_to_string(p.proconfig, ';') FROM pg_proc p WHERE p.oid = to_regprocedure(f.sig)), '(nie je)') AS skutocne
  FROM fn f
  UNION ALL
  SELECT 20, f.sig || ': anon/authenticated/service_role EXECUTE (nezmenene)',
         f.exp_anon::text || '/' || f.exp_auth::text || '/true',
         COALESCE(has_function_privilege('anon', to_regprocedure(f.sig), 'EXECUTE')::text || '/' ||
                  has_function_privilege('authenticated', to_regprocedure(f.sig), 'EXECUTE')::text || '/' ||
                  has_function_privilege('service_role', to_regprocedure(f.sig), 'EXECUTE')::text, 'funkcia chyba')
  FROM fn f
  UNION ALL
  SELECT 30, f.sig || ': stale SECURITY DEFINER', 'true',
         COALESCE((SELECT p.prosecdef::text FROM pg_proc p WHERE p.oid = to_regprocedure(f.sig)), 'funkcia chyba')
  FROM fn f
  UNION ALL
  SELECT 40, 'regresia: profile_agencies_for_auth authenticated EXECUTE', 'true',
         COALESCE(has_function_privilege('authenticated', to_regprocedure('public.profile_agencies_for_auth()'), 'EXECUTE')::text, 'funkcia chyba')
  UNION ALL
  SELECT 41, 'regresia: get_valuation_tenant anon EXECUTE (verejna stranka)', 'true',
         COALESCE(has_function_privilege('anon', to_regprocedure('public.get_valuation_tenant(text)'), 'EXECUTE')::text, 'funkcia chyba')
  UNION ALL
  SELECT 90, 'public SECDEF funkcie bez search_path (pocet)', '0',
         (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prosecdef
             AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%'))
)
SELECT ord, kontrola, ocakavane, skutocne,
       CASE WHEN ocakavane = skutocne THEN 'PASS' ELSE 'FAIL' END AS vysledok
FROM chk ORDER BY ord, kontrola;
