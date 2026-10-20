-- ============================================================================
-- NEAPLIKOVAŤ BEZ GO FOUNDERA.   Odomykacie slovo: GO E-APPLY   (rollback: GO E-ROLLBACK)
--
-- BALÍK E „search-path-close" — fixný search_path na 11 SECURITY DEFINER funkciách
-- v public, ktoré ho nemajú. Mení IBA proconfig; telá ani ACL sa nemenia.
--   * 10 funkcií: search_path = public, pg_temp
--   * match_leads / match_properties: search_path = public, extensions, pg_temp
--     (typ vector a operátor <=> sú v schéme extensions)
--   * get_supply_demand_gap ostáva spustiteľná pre authenticated (volá ju session klient).
-- Poradie: verify-before.sql (všetko PASS) -> tento skript -> verify-after.sql.
-- Jedna transakcia; akákoľvek chyba / nesúlad predpokladov = ROLLBACK celého skriptu.
-- ============================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';

DO $pre$
DECLARE s text; n int;
BEGIN
  FOREACH s IN ARRAY ARRAY[
    'public.calculate_broker_metrics()',
    'public.compute_motivation_score(uuid,uuid,text)',
    'public.detect_broker_weakness(uuid)',
    'public.get_supply_demand_gap(text)',
    'public.increment_api_usage(text)',
    'public.log_event(uuid,text,text,text,jsonb)',
    'public.match_leads(extensions.vector,double precision,integer)',
    'public.match_properties(extensions.vector,double precision,integer)',
    'public.rate_limit_increment(text,timestamptz,integer)',
    'public.recompute_broker_metrics(uuid)',
    'public.record_kataster_event(uuid,text,text,text,uuid,text,text,text,jsonb)'
  ] LOOP
    IF to_regprocedure(s) IS NULL THEN RAISE EXCEPTION 'PREDPOKLAD: funkcia % chyba', s; END IF;
    SELECT count(*) INTO n FROM pg_proc p
     WHERE p.oid = to_regprocedure(s) AND p.prosecdef AND p.proconfig IS NULL;
    IF n <> 1 THEN RAISE EXCEPTION 'PREDPOKLAD: % nie je SECDEF alebo uz ma proconfig', s; END IF;
  END LOOP;
  IF to_regclass('public.rate_limit_buckets') IS NULL THEN
    RAISE EXCEPTION 'PREDPOKLAD: public.rate_limit_buckets chyba (rate_limit_increment ho cita bez prefixu)';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                  WHERE t.typname = 'vector' AND n.nspname = 'extensions') THEN
    RAISE EXCEPTION 'PREDPOKLAD: typ vector nie je v schéme extensions';
  END IF;
END $pre$;

ALTER FUNCTION public.calculate_broker_metrics()                                   SET search_path = public, pg_temp;
ALTER FUNCTION public.compute_motivation_score(uuid,uuid,text)                     SET search_path = public, pg_temp;
ALTER FUNCTION public.detect_broker_weakness(uuid)                                 SET search_path = public, pg_temp;
ALTER FUNCTION public.get_supply_demand_gap(text)                                  SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_api_usage(text)                                    SET search_path = public, pg_temp;
ALTER FUNCTION public.log_event(uuid,text,text,text,jsonb)                         SET search_path = public, pg_temp;
ALTER FUNCTION public.match_leads(extensions.vector,double precision,integer)      SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.match_properties(extensions.vector,double precision,integer) SET search_path = public, extensions, pg_temp;
ALTER FUNCTION public.rate_limit_increment(text,timestamptz,integer)               SET search_path = public, pg_temp;
ALTER FUNCTION public.recompute_broker_metrics(uuid)                               SET search_path = public, pg_temp;
ALTER FUNCTION public.record_kataster_event(uuid,text,text,text,uuid,text,text,text,jsonb) SET search_path = public, pg_temp;

-- Poistka: po zmene nesmie v public ostať SECDEF funkcia bez search_path.
DO $post$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname = 'public' AND p.prosecdef
     AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%');
  IF n <> 0 THEN RAISE EXCEPTION 'PO ZMENE: % SECDEF funkcii v public stale bez search_path', n; END IF;
END $post$;

COMMIT;
