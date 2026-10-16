-- ============================================================================
-- NEAPLIKOVAŤ BEZ GO FOUNDERA.   Odomykacie slovo: GO D-APPLY   (rollback: GO D-ROLLBACK)
--
-- BALÍK D „secdef-callers-close" — 7 SECURITY DEFINER funkcií, ktoré doteraz
-- volal session/anon klient. Kód (PR s týmto balíkom) ich volá cez service role,
-- preto sa tu EXECUTE zužuje na service_role a nastavuje sa fixný search_path.
--
-- PORADIE JE POVINNÉ: 1) merge PR s kódom + nasadenie Vercel (Ready na main),
--                     2) verify-before.sql, 3) tento skript, 4) verify-after.sql.
-- Spustený PRED nasadením kódu zhodí: tracking odkazy z e-mailov, dva cron-y
-- (arbitrage-scan expire, bri-snapshot), zápis cien a prepočet BRI.
-- Predpoklad v PROD: SUPABASE_SERVICE_ROLE_KEY nastavený vo Vercel Production.
-- Jedna transakcia; chyba = ROLLBACK celého skriptu.
-- ============================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $pre$
DECLARE s text;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'public.add_price_point(uuid,numeric,text,uuid,text,text,text)',
    'public.compute_bri_score(text,uuid)',
    'public.compute_bri_score_v2(text,uuid,text)',
    'public.record_brief_click(uuid,text)',
    'public.record_brief_open(uuid)',
    'public.expire_arbitrage_matches()',
    'public.rotate_bri_snapshots()'
  ] LOOP
    IF to_regprocedure(s) IS NULL THEN RAISE EXCEPTION 'PREDPOKLAD: funkcia % chyba', s; END IF;
  END LOOP;
END $pre$;

ALTER FUNCTION public.add_price_point(uuid,numeric,text,uuid,text,text,text) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.add_price_point(uuid,numeric,text,uuid,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.add_price_point(uuid,numeric,text,uuid,text,text,text) TO service_role;
ALTER FUNCTION public.compute_bri_score(text,uuid) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.compute_bri_score(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.compute_bri_score(text,uuid) TO service_role;
ALTER FUNCTION public.compute_bri_score_v2(text,uuid,text) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.compute_bri_score_v2(text,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.compute_bri_score_v2(text,uuid,text) TO service_role;
ALTER FUNCTION public.record_brief_click(uuid,text) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.record_brief_click(uuid,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_brief_click(uuid,text) TO service_role;
ALTER FUNCTION public.record_brief_open(uuid) SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.record_brief_open(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.record_brief_open(uuid) TO service_role;
ALTER FUNCTION public.expire_arbitrage_matches() SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.expire_arbitrage_matches() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.expire_arbitrage_matches() TO service_role;
ALTER FUNCTION public.rotate_bri_snapshots() SET search_path = public, pg_temp;
REVOKE EXECUTE ON FUNCTION public.rotate_bri_snapshots() FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.rotate_bri_snapshots() TO service_role;

COMMIT;
