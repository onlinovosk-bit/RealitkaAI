-- Oprava otvorenej INSERT policy na ai_sourced_deals.
--
-- NÁLEZ:
--   20260411_performance_fee.sql vytvára policy "Service role can insert deals"
--   ako FOR INSERT TO PUBLIC WITH CHECK (true). Názov hovorí service role,
--   grant hovorí ktokoľvek. Ide o tenantnú tabuľku — je v registri
--   apps/crm/tests/rls/tenant-table-registry.ts ako scope: agency_id.
--
--   Dokázané na schéme, ktorú stavia `supabase db reset`: ako rola
--   `authenticated`, bez akejkoľvek väzby na cieľovú agentúru, prejde
--
--     insert into public.ai_sourced_deals (id, agency_id, deal_value)
--     values (gen_random_uuid(), '<cudzia agentura>', 999999.00);
--
--   RLS to nezastaví, lebo WITH CHECK (true) je splnené vždy.
--
-- ROZSAH PROBLÉMU:
--   PROD má na ai_sourced_deals 0 policies (RLS on = deny-all), takže PROD
--   zasiahnutý NIE JE — policy tam bola odstránená mimo migrácií.
--   Diera je v repo definícii schémy: dostane ju CI a každé nové prostredie
--   postavené z migrácií.
--
--   RLS izolačná suite ju nechytí, lebo assertion sa pre nenaseedované
--   tabuľky preskakuje (rls-tenant-isolation.test.ts: `if (!r!.seeded) return`).
--
-- OPRAVA:
--   Otvorenú policy zahodiť a nahradiť tenantne scopovanou, v rovnakom idióme
--   ako credit_ledger_tenant_insert. service_role má rolbypassrls = true,
--   takže backend zápisy to neovplyvní.

drop policy if exists "Service role can insert deals" on public.ai_sourced_deals;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'ai_sourced_deals'
      and policyname = 'ai_sourced_deals_tenant_insert'
  ) then
    create policy ai_sourced_deals_tenant_insert
      on public.ai_sourced_deals
      for insert
      to authenticated
      with check (agency_id in (select public.profile_agencies_for_auth()));
  end if;
end $$;
