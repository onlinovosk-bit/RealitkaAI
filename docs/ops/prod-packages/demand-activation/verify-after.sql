-- ============================================================================
-- verify-after.sql — BALÍK A „demand-activation". IBA SELECT (nič nemení).
-- Spúšťa sa PO apply.sql. Každý riadok má `ok`; očakávaný výsledok = všetky true.
-- Uložiť výstup ako dôkaz „po" (P19) vedľa výstupu verify-before.sql.
-- ============================================================================
WITH tbl(n) AS (VALUES ('lead_demands'), ('demand_property_matches')),
chk AS (

  SELECT 10 AS ord, t.n || ': tabulka existuje' AS kontrola, 'true' AS ocakavane,
         (to_regclass('public.' || t.n) IS NOT NULL)::text AS skutocne
  FROM tbl t
  UNION ALL
  SELECT 12, t.n || ': RLS zapnuta', 'true',
         COALESCE((SELECT c.relrowsecurity::text FROM pg_class c WHERE c.oid = to_regclass('public.' || t.n)), 'chyba')
  FROM tbl t
  UNION ALL
  SELECT 14, t.n || ': pocet politik', '1',
         (SELECT count(*)::text FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.n)
  FROM tbl t
  UNION ALL
  SELECT 16, t.n || ': politika je SELECT pre authenticated nad profile_agencies_for_auth()', 'true',
         COALESCE((SELECT (p.cmd = 'SELECT' AND p.roles = '{authenticated}'::name[]
                           AND p.qual ~ 'profile_agencies_for_auth' AND p.qual ~ 'agency_id'
                           AND p.qual !~* 'is\s+null')::text
                     FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.n LIMIT 1), 'chyba')
  FROM tbl t
  UNION ALL
  SELECT 20, t.n || ': anon nema ZIADNE pravo', 'false',
         has_table_privilege('anon', 'public.' || t.n, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')::text
  FROM tbl t
  UNION ALL
  SELECT 22, t.n || ': authenticated ma SELECT', 'true',
         has_table_privilege('authenticated', 'public.' || t.n, 'SELECT')::text
  FROM tbl t
  UNION ALL
  SELECT 24, t.n || ': authenticated NEMA zapis/TRUNCATE/REFERENCES/TRIGGER', 'false',
         has_table_privilege('authenticated', 'public.' || t.n, 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')::text
  FROM tbl t
  UNION ALL
  SELECT 26, t.n || ': service_role ma SELECT aj INSERT', 'true',
         (has_table_privilege('service_role', 'public.' || t.n, 'SELECT') AND has_table_privilege('service_role', 'public.' || t.n, 'INSERT'))::text
  FROM tbl t

  -- schéma: NOT NULL tenantový kľúč a FK
  UNION ALL
  SELECT 30, 'lead_demands.agency_id NOT NULL uuid', 'uuid/NO',
         COALESCE((SELECT data_type || '/' || is_nullable FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'lead_demands' AND column_name = 'agency_id'), 'chyba')
  UNION ALL
  SELECT 31, 'demand_property_matches.agency_id NOT NULL uuid', 'uuid/NO',
         COALESCE((SELECT data_type || '/' || is_nullable FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'demand_property_matches' AND column_name = 'agency_id'), 'chyba')
  UNION ALL
  SELECT 32, 'demand_property_matches.demand_record_id NOT NULL', 'NO',
         COALESCE((SELECT is_nullable FROM information_schema.columns
                    WHERE table_schema = 'public' AND table_name = 'demand_property_matches' AND column_name = 'demand_record_id'), 'chyba')
  UNION ALL
  SELECT 33, 'lead_demands: pocet cudzich klucov (agencies, leads)', '2',
         (SELECT count(*)::text FROM pg_constraint WHERE conrelid = to_regclass('public.lead_demands') AND contype = 'f')
  UNION ALL
  SELECT 34, 'demand_property_matches: pocet cudzich klucov (agencies, leads, lead_demands, properties)', '4',
         (SELECT count(*)::text FROM pg_constraint WHERE conrelid = to_regclass('public.demand_property_matches') AND contype = 'f')
  UNION ALL
  SELECT 35, 'demand_property_matches: UNIQUE (demand_record_id, property_id)', 'true',
         EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = to_regclass('public.demand_property_matches') AND contype = 'u')::text

  -- indexy
  UNION ALL
  SELECT 40, 'indexy (4 vlastne + 2 pkey + 1 unique = 7)', '7',
         (SELECT count(*)::text FROM pg_indexes WHERE schemaname = 'public' AND tablename IN ('lead_demands', 'demand_property_matches'))

  -- nič nezapnuté: obe tabuľky prázdne po aplikácii (flagy vypnuté)
  UNION ALL
  SELECT 50, 'lead_demands: riadkov (flag vypnuty => 0)', '0',
         (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.lead_demands', false, true, '')))[1]::text
  UNION ALL
  SELECT 51, 'demand_property_matches: riadkov (flag vypnuty => 0)', '0',
         (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.demand_property_matches', false, true, '')))[1]::text

  -- regresia: RLS funkcia musí ostať volateľná pre authenticated (inak padne CELÁ tenantová izolácia)
  UNION ALL
  SELECT 60, 'profile_agencies_for_auth(): authenticated EXECUTE', 'true',
         COALESCE(has_function_privilege('authenticated', to_regprocedure('public.profile_agencies_for_auth()'), 'EXECUTE')::text, 'funkcia chyba')
  UNION ALL
  SELECT 61, 'ziadne ine objekty nezavisia od novych tabuliek (pohlady/triggery)', '0',
         (SELECT count(*)::text FROM pg_depend d
           WHERE d.refobjid IN (to_regclass('public.lead_demands'), to_regclass('public.demand_property_matches'))
             AND d.deptype = 'n' AND d.classid = 'pg_rewrite'::regclass)
)
SELECT ord, kontrola, ocakavane, skutocne, (ocakavane = skutocne) AS ok
FROM chk
ORDER BY ord, kontrola;
