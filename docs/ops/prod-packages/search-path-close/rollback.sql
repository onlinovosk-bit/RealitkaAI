-- rollback.sql — BALÍK E. Odomykacie slovo: GO E-ROLLBACK.
-- Vráti pôvodný stav: všetkých 11 funkcií malo proconfig = NULL (overené v PROD 2026-10-16),
-- preto RESET search_path. ACL apply.sql nemenil, takže sa tu neobnovuje.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER FUNCTION public.calculate_broker_metrics()                                   RESET search_path;
ALTER FUNCTION public.compute_motivation_score(uuid,uuid,text)                     RESET search_path;
ALTER FUNCTION public.detect_broker_weakness(uuid)                                 RESET search_path;
ALTER FUNCTION public.get_supply_demand_gap(text)                                  RESET search_path;
ALTER FUNCTION public.increment_api_usage(text)                                    RESET search_path;
ALTER FUNCTION public.log_event(uuid,text,text,text,jsonb)                         RESET search_path;
ALTER FUNCTION public.match_leads(extensions.vector,double precision,integer)      RESET search_path;
ALTER FUNCTION public.match_properties(extensions.vector,double precision,integer) RESET search_path;
ALTER FUNCTION public.rate_limit_increment(text,timestamptz,integer)               RESET search_path;
ALTER FUNCTION public.recompute_broker_metrics(uuid)                               RESET search_path;
ALTER FUNCTION public.record_kataster_event(uuid,text,text,text,uuid,text,text,text,jsonb) RESET search_path;
COMMIT;
