-- TENANT-ISOLATION-WALL: jeden uzavretý balík pre zvyšné cesty k tenantovým dátam (GO foundera 2026-10-01).
-- Mapa ciest: pohľady, politiky s vetvou `agency_id IS NULL`, SECURITY DEFINER funkcie spustiteľné cez `anon`.
-- Aplikované v PROD 2026-10-01 jednou transakciou (execute_sql). Overenie + dôkaz: memory/decisions.md.
--
-- NEROBÍ (vedome, s dôvodom — viď decisions.md):
--   * `activities_insert_agency` — `matching`/`team` píšu riadky s `lead_id IS NULL`; treba agency kľúč.
--   * funkcie volané používateľskou session alebo cronom cez `createClient()` (record_brief_*, add_price_point,
--     compute_bri_*, expire_arbitrage_matches, rotate_bri_snapshots, get_valuation_tenant, match_leads,
--     match_properties) a `profile_agencies_for_auth` (používa ju RLS) — REVOKE by mohol rozbiť beh, treba test.
--   * 187 riadkov `activities` bez leadu sa nemažú.

begin;

-- 1) Pohľady bez konzumenta v kóde (`decisions` všetkých agentúr, anon čítal 240 riadkov): zavrieť pre klientske roly.
revoke all on public.genome_decision_open, public.v_genome_calibration,
              public.v_genome_decisions_resolved, public.v_genome_exclusivity_patterns
  from anon, authenticated;

-- 2) Pohľady s konzumentom (prihlásený): anon preč, RLS podkladových tabuliek sa začne uplatňovať.
revoke all on public.arbitrage_stats, public.morning_brief_stats, public.negotiation_briefs from anon;

alter view public.genome_decision_open            set (security_invoker = true);
alter view public.v_genome_calibration            set (security_invoker = true);
alter view public.v_genome_decisions_resolved     set (security_invoker = true);
alter view public.v_genome_exclusivity_patterns   set (security_invoker = true);
alter view public.arbitrage_stats                 set (security_invoker = true);
alter view public.morning_brief_stats             set (security_invoker = true);
alter view public.negotiation_briefs              set (security_invoker = true);

-- 3) Politiky s vetvou `agency_id IS NULL` (dnes 0 NULL riadkov — latentné). `lead_property_matches_agency` (ALL)
--    ostáva ako bezpečná; štyri duplicitné `matches_*_agency` s NULL vetvou sa rušia.
drop policy if exists matches_select_agency on public.lead_property_matches;
drop policy if exists matches_insert_agency on public.lead_property_matches;
drop policy if exists matches_update_agency on public.lead_property_matches;
drop policy if exists matches_delete_agency on public.lead_property_matches;

alter policy pipeline_moves_tenant_select on public.pipeline_moves
  using (lead_id in (select l.id from public.leads l
                     where l.agency_id in (select public.profile_agencies_for_auth())));
alter policy pipeline_moves_tenant_write on public.pipeline_moves
  with check (lead_id in (select l.id from public.leads l
                          where l.agency_id in (select public.profile_agencies_for_auth())));

alter policy platform_events_select_tenant on public.platform_events
  using (agency_id in (select p.agency_id from public.profiles p
                       where p.auth_user_id = auth.uid() and p.agency_id is not null));

-- 4) SECURITY DEFINER funkcie, ktoré volá výhradne service role alebo nikto (dôkaz: grep kódu + pg_trigger).
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = any (array[
        'spend_credits','increment_usage_metric','rate_limit_increment',
        'resolve_agency_id_for_realsoft_credentials','resolve_agency_id_for_realvia',
        'emit_platform_event','log_event','record_kataster_event',
        'recompute_broker_metrics','compute_motivation_score','realvia_schema_health'])
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
    execute format('grant execute on function %s to service_role', r.sig);
  end loop;
end $$;

commit;
