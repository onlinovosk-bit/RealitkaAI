-- ============================================================================
-- NEAPLIKOVAŤ BEZ GO FOUNDERA.
-- rollback.sql — BALÍK B „agency-null-policies-close": vráti politiky a EXECUTE
-- na rls_audit_snapshot do stavu PRED apply.sql.
--
-- Odomykacie slovo:  GO NULL-ROLLBACK
-- POZOR: rollback VRACIA bezpečnostnú dieru (politiky s vetvou agency_id IS NULL
-- sa obnovia presne tak, ako boli). Použiť len ak apply.sql rozbil prevádzku
-- (P19 zlyhalo) a oprava dopredu nie je rýchlejšia.
--
-- Zdroj pravdy: wp6_backup.policies_before / function_acl_before, ktoré vytvoril
-- apply.sql v kroku 1 (berie sa NAJSTARŠIA záloha, druhý beh apply.sql ju
-- neprepíše). Bez zálohy sa skript zastaví — nič sa nehádá.
-- Poznámka: zálohu zachytávajú len politiky s vetvou agency_id IS NULL a dve
-- legacy politiky na `activities`; ak apply.sql nenašiel nič, nie je čo vracať.
-- Čistenie zálohy (až po úspešnom P19, samostatný krok): DROP SCHEMA wp6_backup CASCADE;
-- ============================================================================
BEGIN;

SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $rb$
DECLARE
  t0   timestamptz;
  f0   timestamptz;
  r    record;
  fa   record;
  stmt text;
  nrest int := 0;
BEGIN
  IF to_regclass('wp6_backup.policies_before') IS NULL OR to_regclass('wp6_backup.function_acl_before') IS NULL THEN
    RAISE EXCEPTION 'ZASTAVENÉ: záloha wp6_backup neexistuje (apply.sql sa nespustil?) — nič sa nevracia';
  END IF;

  -- politiky
  SELECT min(captured_at) INTO t0 FROM wp6_backup.policies_before;
  IF t0 IS NOT NULL THEN
    FOR r IN SELECT * FROM wp6_backup.policies_before WHERE captured_at = t0 ORDER BY tablename, policyname LOOP
      IF to_regclass(format('public.%I', r.tablename)) IS NULL THEN
        RAISE EXCEPTION 'ZASTAVENÉ: tabuľka public.% už neexistuje', r.tablename;
      END IF;
      EXECUTE format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
      stmt := format('create policy %I on public.%I as %s for %s to %s',
                     r.policyname, r.tablename, lower(r.permissive), r.cmd,
                     (SELECT string_agg(CASE WHEN x = 'public' THEN 'public' ELSE quote_ident(x) END, ', ') FROM unnest(r.roles) AS x));
      IF r.qual IS NOT NULL THEN stmt := stmt || ' using ' || r.qual; END IF;
      IF r.with_check IS NOT NULL THEN stmt := stmt || ' with check ' || r.with_check; END IF;
      EXECUTE stmt;
      nrest := nrest + 1;
    END LOOP;
  END IF;

  -- EXECUTE na rls_audit_snapshot (proacl text tvaru {postgres=X/postgres,anon=X/postgres,...})
  SELECT min(captured_at) INTO f0 FROM wp6_backup.function_acl_before;
  IF f0 IS NOT NULL AND to_regprocedure('public.rls_audit_snapshot()') IS NOT NULL THEN
    SELECT * INTO fa FROM wp6_backup.function_acl_before WHERE captured_at = f0 LIMIT 1;
    IF fa.proacl IS NULL THEN
      GRANT EXECUTE ON FUNCTION public.rls_audit_snapshot() TO PUBLIC;
    ELSE
      IF fa.proacl ~ '(^|[{,])=X/'              THEN GRANT EXECUTE ON FUNCTION public.rls_audit_snapshot() TO PUBLIC; END IF;
      IF fa.proacl ~ '(^|[{,])anon=X/'          THEN GRANT EXECUTE ON FUNCTION public.rls_audit_snapshot() TO anon; END IF;
      IF fa.proacl ~ '(^|[{,])authenticated=X/' THEN GRANT EXECUTE ON FUNCTION public.rls_audit_snapshot() TO authenticated; END IF;
    END IF;
  END IF;

  RAISE NOTICE 'Obnovených politík: %', nrest;
END
$rb$;

COMMIT;
