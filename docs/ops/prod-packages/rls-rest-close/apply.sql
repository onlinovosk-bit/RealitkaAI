-- ============================================================================
-- NEAPLIKOVAŤ BEZ GO FOUNDERA.   Odomykacie slovo: GO REST-CLOSE   (rollback: GO REST-ROLLBACK)
--
-- BALÍK C „rls-rest-close" — zvyšok nálezov z balíka B, ktoré sa dajú zavrieť
-- BEZ zmeny kódu aplikácie (každé miesto má v kóde 0 volaní ako session/anon
-- klient; mapa v mapa-ciest.md):
--   1) REVOKE EXECUTE (PUBLIC, anon, authenticated) na SECURITY DEFINER funkciách,
--      ktoré nikto okrem service role nevolá: match_leads, match_properties
--      (cross-tenant čítanie embeddingov), rls_audit_snapshot, trigger funkcie.
--   2) Mŕtve zápisové granty: activities (anon všetko), portal_listings a
--      listing_price_history (zápis pre anon aj authenticated; politiky zápis
--      povoľujú len service_role, grant je zbytočný).
--   3) activities: backfill agency_id z leads pre riadky, ktoré sa dajú
--      jednoznačne priradiť (záloha pre rollback). Sirotské riadky sa NEMAŽÚ.
-- Mimo rozsahu (volajú ich session/anon cesty — treba najprv zmeniť kód; balík D):
--   add_price_point, compute_bri_score(_v2), record_brief_click/open,
--   expire_arbitrage_matches, rotate_bri_snapshots + search_path hardening.
-- Jedna transakcia; akákoľvek chyba = ROLLBACK celého skriptu.
-- ============================================================================
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = public, extensions;  -- typ vector žije v schéme extensions

DO $pre$
BEGIN
  IF to_regprocedure('public.match_leads(vector,double precision,integer)') IS NULL
     OR to_regprocedure('public.match_properties(vector,double precision,integer)') IS NULL
     OR to_regprocedure('public.rls_audit_snapshot()') IS NULL THEN
    RAISE EXCEPTION 'PREDPOKLAD: ocakavana funkcia chyba';
  END IF;
  IF to_regclass('public._bak_rls_rest_activities') IS NOT NULL THEN
    RAISE EXCEPTION 'PREDPOKLAD: zaloha _bak_rls_rest_activities uz existuje (balik bol spusteny)';
  END IF;
END $pre$;

-- 1) EXECUTE
REVOKE EXECUTE ON FUNCTION public.match_leads(vector,double precision,integer)       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.match_properties(vector,double precision,integer)  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.rls_audit_snapshot()                               FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_broker_metrics()                         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_activities_platform_events()                   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_leads_platform_events()                        FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ai_triage_feedback_set_agency()                    FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.match_leads(vector,double precision,integer)       TO service_role;
GRANT  EXECUTE ON FUNCTION public.match_properties(vector,double precision,integer)  TO service_role;
GRANT  EXECUTE ON FUNCTION public.rls_audit_snapshot()                               TO service_role;

-- 2) mŕtve granty
REVOKE ALL ON public.activities FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.portal_listings        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON public.listing_price_history  FROM anon, authenticated;

-- 3) activities backfill (so zálohou)
CREATE TABLE public._bak_rls_rest_activities AS
  SELECT a.id, a.agency_id AS old_agency_id
  FROM public.activities a JOIN public.leads l ON l.id = a.lead_id
  WHERE a.agency_id IS NULL AND l.agency_id IS NOT NULL;
ALTER TABLE public._bak_rls_rest_activities ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public._bak_rls_rest_activities FROM PUBLIC, anon, authenticated;

UPDATE public.activities a SET agency_id = l.agency_id
FROM public.leads l
WHERE l.id = a.lead_id AND a.agency_id IS NULL AND l.agency_id IS NOT NULL;

COMMIT;
