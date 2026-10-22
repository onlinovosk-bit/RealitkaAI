-- verify-before.sql — BALÍK E. IBA SELECT. Spusti pred apply.
-- Pred apply: všetky riadky PASS = stav PROD zodpovedá predpokladom apply.sql
-- (11 funkcií existuje, search_path nie je nastavený, ACL zodpovedá mape ciest).
WITH fn(sig, exp_anon, exp_auth) AS (VALUES
  ('public.calculate_broker_metrics()', false, false),
  ('public.compute_motivation_score(uuid,uuid,text)', false, false),
  ('public.detect_broker_weakness(uuid)', false, false),
  ('public.get_supply_demand_gap(text)', false, true),
  ('public.increment_api_usage(text)', false, false),
  ('public.log_event(uuid,text,text,text,jsonb)', false, false),
  ('public.match_leads(extensions.vector,double precision,integer)', false, false),
  ('public.match_properties(extensions.vector,double precision,integer)', false, false),
  ('public.rate_limit_increment(text,timestamptz,integer)', false, false),
  ('public.recompute_broker_metrics(uuid)', false, false),
  ('public.record_kataster_event(uuid,text,text,text,uuid,text,text,text,jsonb)', false, false)),
chk AS (
  SELECT 10 AS ord, f.sig || ': existuje a je SECURITY DEFINER' AS kontrola, 'true' AS ocakavane,
         COALESCE((SELECT p.prosecdef::text FROM pg_proc p WHERE p.oid = to_regprocedure(f.sig)), 'funkcia chyba') AS skutocne
  FROM fn f
  UNION ALL
  SELECT 20, f.sig || ': search_path', '(nie je)',
         COALESCE((SELECT array_to_string(p.proconfig, ';') FROM pg_proc p WHERE p.oid = to_regprocedure(f.sig)), '(nie je)')
  FROM fn f
  UNION ALL
  SELECT 30, f.sig || ': anon/authenticated/service_role EXECUTE',
         f.exp_anon::text || '/' || f.exp_auth::text || '/true',
         COALESCE(has_function_privilege('anon', to_regprocedure(f.sig), 'EXECUTE')::text || '/' ||
                  has_function_privilege('authenticated', to_regprocedure(f.sig), 'EXECUTE')::text || '/' ||
                  has_function_privilege('service_role', to_regprocedure(f.sig), 'EXECUTE')::text, 'funkcia chyba')
  FROM fn f
  UNION ALL
  SELECT 40, 'typ vector je v schéme extensions', 'extensions',
         COALESCE((SELECT n.nspname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'vector' LIMIT 1), 'chyba')
  UNION ALL
  SELECT 50, 'tabulka public.rate_limit_buckets existuje', 'true',
         (to_regclass('public.rate_limit_buckets') IS NOT NULL)::text
  UNION ALL
  SELECT 90, 'public SECDEF funkcie bez search_path (pocet)', '11',
         (SELECT count(*)::text FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
           WHERE n.nspname = 'public' AND p.prosecdef
             AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%'))
)
SELECT ord, kontrola, ocakavane, skutocne,
       CASE WHEN ocakavane = skutocne THEN 'PASS' ELSE 'FAIL' END AS vysledok
FROM chk ORDER BY ord, kontrola;
