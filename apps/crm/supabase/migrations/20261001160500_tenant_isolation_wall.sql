-- TENANT-ISOLATION-WALL: jeden uzavretý balík pre zvyšné cesty k tenantovým dátam (GO foundera 2026-10-01).
-- Mapa ciest: pohľady, politiky s vetvou `agency_id IS NULL`, SECURITY DEFINER funkcie spustiteľné cez `anon`.
-- Aplikované v PROD 2026-10-01 jednou transakciou (execute_sql). Overenie + dôkaz: memory/decisions.md.
--
-- IDEMPOTENTNÉ voči chýbajúcim objektom: PROD a čistá databáza (CI `supabase start`) sa líšia — tri pohľady `v_genome_*`
-- existujú len v PROD (vznikli mimo migrácií), takže prvá verzia tejto migrácie padla v CI na `relation does not exist`.
-- Každá zmena sa preto vykoná len ak objekt existuje; v PROD je výsledok rovnaký ako pri prvej verzii.
--
-- NEROBÍ (vedome, s dôvodom — viď decisions.md):
--   * funkcie volané používateľskou session alebo cronom cez `createClient()` (record_brief_*, add_price_point,
--     compute_bri_*, expire_arbitrage_matches, rotate_bri_snapshots, get_valuation_tenant, match_leads,
--     match_properties) a `profile_agencies_for_auth` (používa ju RLS) — REVOKE by mohol rozbiť beh, treba test.
--   * 187 riadkov `activities` bez leadu sa nemažú (viď 20261001170000).

do $wall$
declare
  v text;
  r record;
begin
  -- 1) Pohľady bez konzumenta v kóde (`decisions` všetkých agentúr, anon čítal 240 riadkov): zavrieť pre klientske roly.
  foreach v in array array['genome_decision_open','v_genome_calibration',
                           'v_genome_decisions_resolved','v_genome_exclusivity_patterns'] loop
    if to_regclass('public.' || v) is not null then
      execute format('revoke all on public.%I from anon, authenticated', v);
      execute format('alter view public.%I set (security_invoker = true)', v);
    end if;
  end loop;

  -- 2) Pohľady s konzumentom (prihlásený): anon preč, RLS podkladových tabuliek sa začne uplatňovať.
  foreach v in array array['arbitrage_stats','morning_brief_stats','negotiation_briefs'] loop
    if to_regclass('public.' || v) is not null then
      execute format('revoke all on public.%I from anon', v);
      execute format('alter view public.%I set (security_invoker = true)', v);
    end if;
  end loop;

  -- 3) Politiky s vetvou `agency_id IS NULL` (dnes 0 NULL riadkov — latentné). `lead_property_matches_agency` (ALL)
  --    ostáva ako bezpečná; štyri duplicitné `matches_*_agency` s NULL vetvou sa rušia.
  if to_regclass('public.lead_property_matches') is not null then
    drop policy if exists matches_select_agency on public.lead_property_matches;
    drop policy if exists matches_insert_agency on public.lead_property_matches;
    drop policy if exists matches_update_agency on public.lead_property_matches;
    drop policy if exists matches_delete_agency on public.lead_property_matches;
  end if;

  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pipeline_moves'
             and policyname = 'pipeline_moves_tenant_select') then
    alter policy pipeline_moves_tenant_select on public.pipeline_moves
      using (lead_id in (select l.id from public.leads l
                         where l.agency_id in (select public.profile_agencies_for_auth())));
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'pipeline_moves'
             and policyname = 'pipeline_moves_tenant_write') then
    alter policy pipeline_moves_tenant_write on public.pipeline_moves
      with check (lead_id in (select l.id from public.leads l
                              where l.agency_id in (select public.profile_agencies_for_auth())));
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'platform_events'
             and policyname = 'platform_events_select_tenant') then
    alter policy platform_events_select_tenant on public.platform_events
      using (agency_id in (select p.agency_id from public.profiles p
                           where p.auth_user_id = auth.uid() and p.agency_id is not null));
  end if;

  -- 4) SECURITY DEFINER funkcie, ktoré volá výhradne service role alebo nikto (dôkaz: grep kódu + pg_trigger).
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
end
$wall$;
