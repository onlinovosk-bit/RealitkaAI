-- verify-after.sql — BALÍK D. IBA SELECT.
-- Po apply: všetky ok = true.
WITH fn(sig) AS (VALUES
  ('public.add_price_point(uuid,numeric,text,uuid,text,text,text)'),
  ('public.compute_bri_score(text,uuid)'),
  ('public.compute_bri_score_v2(text,uuid,text)'),
  ('public.record_brief_click(uuid,text)'),
  ('public.record_brief_open(uuid)'),
  ('public.expire_arbitrage_matches()'),
  ('public.rotate_bri_snapshots()')),
chk AS (
  SELECT 10 AS ord, f.sig || ': anon/authenticated EXECUTE' AS kontrola, 'false/false' AS ocakavane,
         COALESCE(has_function_privilege('anon', to_regprocedure(f.sig), 'EXECUTE')::text || '/' ||
                  has_function_privilege('authenticated', to_regprocedure(f.sig), 'EXECUTE')::text, 'funkcia chyba') AS skutocne
  FROM fn f
  UNION ALL
  SELECT 20, f.sig || ': search_path', 'search_path=public, pg_temp',
         COALESCE((SELECT array_to_string(p.proconfig, ';') FROM pg_proc p WHERE p.oid = to_regprocedure(f.sig)), '(nie je)')
         ||''
  FROM fn f
  UNION ALL
  SELECT 30, f.sig || ': service_role EXECUTE', 'true',
         has_function_privilege('service_role', to_regprocedure(f.sig), 'EXECUTE')::text
  FROM fn f
  UNION ALL
  SELECT 40, 'regresia: profile_agencies_for_auth authenticated EXECUTE', 'true',
         has_function_privilege('authenticated', to_regprocedure('public.profile_agencies_for_auth()'), 'EXECUTE')::text
  UNION ALL
  SELECT 41, 'regresia: get_valuation_tenant anon EXECUTE (verejna stranka)', 'true',
         has_function_privilege('anon', to_regprocedure('public.get_valuation_tenant(text)'), 'EXECUTE')::text
)
SELECT ord, kontrola, ocakavane, skutocne, (ocakavane = skutocne) AS ok FROM chk ORDER BY ord, kontrola;
