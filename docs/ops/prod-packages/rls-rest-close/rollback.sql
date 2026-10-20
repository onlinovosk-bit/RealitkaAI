-- rollback.sql — BALÍK C. Odomykacie slovo: GO REST-ROLLBACK. Vráti pôvodný stav (Supabase defaulty).
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL search_path = public, extensions;
DO $pre$ BEGIN
  IF to_regclass('public._bak_rls_rest_activities') IS NULL THEN RAISE EXCEPTION 'PREDPOKLAD: zaloha neexistuje (apply nebol spusteny?)'; END IF;
END $pre$;

GRANT EXECUTE ON FUNCTION public.match_leads(vector,double precision,integer)       TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_properties(vector,double precision,integer)  TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_audit_snapshot()                               TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_broker_metrics()                         TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_activities_platform_events()                   TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trg_leads_platform_events()                        TO PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_triage_feedback_set_agency()                    TO PUBLIC, anon, authenticated;

GRANT ALL ON public.activities TO anon;
GRANT ALL ON public.portal_listings TO anon, authenticated;
GRANT ALL ON public.listing_price_history TO anon, authenticated;

UPDATE public.activities a SET agency_id = b.old_agency_id
FROM public._bak_rls_rest_activities b WHERE b.id = a.id;
DROP TABLE public._bak_rls_rest_activities;
COMMIT;
