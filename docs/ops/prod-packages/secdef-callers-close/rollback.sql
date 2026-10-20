-- rollback.sql — BALÍK D. Odomykacie slovo: GO D-ROLLBACK. Vráti EXECUTE pre PUBLIC/anon/authenticated a zruší fixný search_path.
BEGIN;
SET LOCAL lock_timeout = '5s';
GRANT EXECUTE ON FUNCTION public.add_price_point(uuid,numeric,text,uuid,text,text,text) TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.add_price_point(uuid,numeric,text,uuid,text,text,text) RESET search_path;
GRANT EXECUTE ON FUNCTION public.compute_bri_score(text,uuid) TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.compute_bri_score(text,uuid) RESET search_path;
GRANT EXECUTE ON FUNCTION public.compute_bri_score_v2(text,uuid,text) TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.compute_bri_score_v2(text,uuid,text) RESET search_path;
GRANT EXECUTE ON FUNCTION public.record_brief_click(uuid,text) TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.record_brief_click(uuid,text) RESET search_path;
GRANT EXECUTE ON FUNCTION public.record_brief_open(uuid) TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.record_brief_open(uuid) RESET search_path;
GRANT EXECUTE ON FUNCTION public.expire_arbitrage_matches() TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.expire_arbitrage_matches() RESET search_path;
GRANT EXECUTE ON FUNCTION public.rotate_bri_snapshots() TO PUBLIC, anon, authenticated;
ALTER FUNCTION public.rotate_bri_snapshots() RESET search_path;
COMMIT;
