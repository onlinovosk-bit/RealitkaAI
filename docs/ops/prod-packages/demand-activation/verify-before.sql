-- ============================================================================
-- verify-before.sql — BALÍK A „demand-activation". IBA SELECT (nič nemení).
-- Spúšťa founder (alebo agent po jeho GO) v PROD SQL editore PRED apply.sql.
-- Výstup (jedna tabuľka) uložiť ako dôkaz „pred". Po apply.sql spustiť
-- verify-after.sql a výsledky porovnať.
--
-- Stav PROD je k dátumu písania UNVERIFIED. Tento skript ho zmeria.
-- Rozhodnutie:
--   - riadky 10 a 11 hovoria, či tabuľky existujú (repo tvrdí áno, zadanie nie);
--   - riadky 20–29 sú predpoklady (zelené = apply.sql prejde bez ROLLBACK);
-- ============================================================================
SELECT sekcia, kontrola, hodnota FROM (

  -- 10: existencia tabuliek
  SELECT 10 AS ord, 'tabulky' AS sekcia, 'public.lead_demands existuje' AS kontrola,
         (to_regclass('public.lead_demands') IS NOT NULL)::text AS hodnota
  UNION ALL
  SELECT 11, 'tabulky', 'public.demand_property_matches existuje',
         (to_regclass('public.demand_property_matches') IS NOT NULL)::text

  -- 12: počty riadkov (CASE zabráni vyhodnoteniu pri neexistujúcej tabuľke)
  UNION ALL
  SELECT 12, 'tabulky', 'lead_demands: pocet riadkov',
         CASE WHEN to_regclass('public.lead_demands') IS NULL THEN 'tabulka neexistuje'
              ELSE (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.lead_demands', false, true, '')))[1]::text END
  UNION ALL
  SELECT 13, 'tabulky', 'demand_property_matches: pocet riadkov',
         CASE WHEN to_regclass('public.demand_property_matches') IS NULL THEN 'tabulka neexistuje'
              ELSE (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.demand_property_matches', false, true, '')))[1]::text END

  -- 20–29: predpoklady (závislosti musia existovať PRED aplikáciou)
  UNION ALL
  SELECT 20, 'predpoklad', 'public.agencies existuje', (to_regclass('public.agencies') IS NOT NULL)::text
  UNION ALL
  SELECT 21, 'predpoklad', 'public.leads existuje', (to_regclass('public.leads') IS NOT NULL)::text
  UNION ALL
  SELECT 22, 'predpoklad', 'public.properties existuje', (to_regclass('public.properties') IS NOT NULL)::text
  UNION ALL
  SELECT 23, 'predpoklad', 'public.profile_agencies_for_auth() existuje',
         (to_regprocedure('public.profile_agencies_for_auth()') IS NOT NULL)::text
  UNION ALL
  SELECT 24 + x.o, 'predpoklad', 'typ ' || x.t || '.id (ocakavane ' || x.exp || ')',
         COALESCE((SELECT format_type(a.atttypid, a.atttypmod) FROM pg_attribute a
                    WHERE a.attrelid = to_regclass('public.' || x.t) AND a.attname = 'id' AND NOT a.attisdropped), 'chyba')
  FROM (VALUES (0, 'agencies', 'uuid'), (1, 'leads', 'text'), (2, 'properties', 'text')) AS x(o, t, exp)
  UNION ALL
  -- stĺpce properties, ktoré číta match-store.ts (PROPERTY_COLUMNS + agency_id)
  SELECT 30, 'predpoklad', 'properties: chybajuce stlpce pre matching (prazdne = OK)',
         COALESCE((SELECT string_agg(c, ', ') FROM unnest(ARRAY['id','type','location','price','rooms_count','usable_area','transaction_type','status','agency_id']) AS c
                    WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns i
                                       WHERE i.table_schema = 'public' AND i.table_name = 'properties' AND i.column_name = c)), '')
  UNION ALL
  SELECT 31, 'predpoklad', 'profile_agencies_for_auth: SECURITY DEFINER / authenticated EXECUTE / anon EXECUTE',
         COALESCE((SELECT p.prosecdef::text || ' / ' || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
                          || ' / ' || has_function_privilege('anon', p.oid, 'EXECUTE')::text
                     FROM pg_proc p WHERE p.oid = to_regprocedure('public.profile_agencies_for_auth()')), 'funkcia chyba')

  -- 40–49: ak tabuľky existujú, ich aktuálny stav (RLS, politiky, granty)
  UNION ALL
  SELECT 40 + t.o, 'rls', t.n || ': RLS zapnuta',
         COALESCE((SELECT c.relrowsecurity::text FROM pg_class c WHERE c.oid = to_regclass('public.' || t.n)), 'tabulka neexistuje')
  FROM (VALUES (0, 'lead_demands'), (1, 'demand_property_matches')) AS t(o, n)
  UNION ALL
  SELECT 45, 'politiky', 'lead_demands / demand_property_matches: zoznam politik',
         COALESCE((SELECT string_agg(tablename || '.' || policyname || ' [' || cmd || ' ' || roles::text || '] ' ||
                                     COALESCE(qual, '') || ' ' || COALESCE(with_check, ''), ' ;; ' ORDER BY tablename, policyname)
                     FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('lead_demands', 'demand_property_matches')), '(ziadne)')
  UNION ALL
  SELECT 50 + (t.o * 10) + r.o, 'granty', t.n || ': ' || r.n || ' (SELECT / zapis)',
         CASE WHEN to_regclass('public.' || t.n) IS NULL THEN 'tabulka neexistuje'
              ELSE has_table_privilege(r.n, 'public.' || t.n, 'SELECT')::text || ' / ' ||
                   has_table_privilege(r.n, 'public.' || t.n, 'INSERT,UPDATE,DELETE,TRUNCATE')::text END
  FROM (VALUES (0, 'lead_demands'), (1, 'demand_property_matches')) AS t(o, n),
       (VALUES (0, 'anon'), (1, 'authenticated'), (2, 'service_role')) AS r(o, n)
  UNION ALL
  SELECT 70, 'indexy', 'indexy na oboch tabulkach',
         COALESCE((SELECT string_agg(indexname, ', ' ORDER BY indexname) FROM pg_indexes
                    WHERE schemaname = 'public' AND tablename IN ('lead_demands', 'demand_property_matches')), '(ziadne)')
  UNION ALL
  SELECT 71, 'zavislosti', 'pohlady (pg_rewrite) zavisle od oboch tabuliek (ocakavane: ziadne)',
         COALESCE((SELECT string_agg(DISTINCT d.objid::text, ', ')
                     FROM pg_depend d
                    WHERE d.refobjid IN (to_regclass('public.lead_demands'), to_regclass('public.demand_property_matches'))
                      AND d.deptype = 'n' AND d.classid = 'pg_rewrite'::regclass), '(ziadne)')
  UNION ALL
  SELECT 72, 'triggery', 'triggery na oboch tabulkach (ocakavane: ziadne)',
         COALESCE((SELECT string_agg(tgname, ', ') FROM pg_trigger
                    WHERE NOT tgisinternal AND tgrelid IN (to_regclass('public.lead_demands'), to_regclass('public.demand_property_matches'))), '(ziadne)')

  -- 80: história migrácií (len ak existuje schéma Supabase CLI)
  UNION ALL
  SELECT 80, 'historia', 'supabase_migrations: verzie 20260929120000 / 20260930120000 zapisane',
         CASE WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL THEN 'tabulka historie neexistuje'
              ELSE COALESCE((xpath('/row/c/text()', query_to_xml(
                     'select string_agg(version, '','') as c from supabase_migrations.schema_migrations where version in (''20260929120000'',''20260930120000'')', false, true, '')))[1]::text, '(ziadna)') END

  -- 90: kontext — rozsah dát, ktorých sa FK dotkne
  UNION ALL
  SELECT 90, 'kontext', 'leads: pocet riadkov',
         CASE WHEN to_regclass('public.leads') IS NULL THEN 'tabulka neexistuje'
              ELSE (xpath('/row/c/text()', query_to_xml('select count(*) as c from public.leads', false, true, '')))[1]::text END
  UNION ALL
  SELECT 91, 'kontext', 'pg_policies (public) s vetvou agency_id IS NULL — pocet (vseobecny kontext, rieši balík B)',
         (SELECT count(*)::text FROM pg_policies WHERE schemaname = 'public'
            AND (COALESCE(qual, '') || ' ' || COALESCE(with_check, '')) ~* 'agency_id\s+is\s+null')

) q
ORDER BY ord;
