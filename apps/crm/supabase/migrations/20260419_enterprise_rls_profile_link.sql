-- Zosúladenie RLS s reálnym prepojením profilu na auth:
-- 1) stĺpec auth_user_id (ak chýba)
-- 2) funkcia profile_agencies_for_auth() — auth.uid() = profiles.id ALEBO profiles.auth_user_id (Supabase + legacy seed)
-- 3) aktualizované politiky na enterprise AI tabuľkách

alter table public.profiles
  add column if not exists auth_user_id uuid;

create unique index if not exists idx_profiles_auth_user_id
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

comment on column public.profiles.auth_user_id is 'Odkaz na auth.users(id); dopĺňa sa pri prvom prihlásení (app).';

-- Bezpečná funkcia: vráti agency_id pre aktuálneho používateľa
create or replace function public.profile_agencies_for_auth()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct p.agency_id
  from public.profiles p
  where p.agency_id is not null
    and (
      p.auth_user_id = auth.uid()
      or p.id = auth.uid()
    );
$$;

revoke all on function public.profile_agencies_for_auth() from public;
grant execute on function public.profile_agencies_for_auth() to authenticated;
grant execute on function public.profile_agencies_for_auth() to service_role;

-- Nahradenie politík (rovnaká logika, jeden zdroj pravdy)
drop policy if exists "lead_events_tenant" on public.lead_events;
create policy "lead_events_tenant"
  on public.lead_events for all to authenticated
  using (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  );

drop policy if exists "lead_scores_tenant" on public.lead_scores;
create policy "lead_scores_tenant"
  on public.lead_scores for all to authenticated
  using (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  );

drop policy if exists "client_dna_tenant" on public.client_dna;
create policy "client_dna_tenant"
  on public.client_dna for all to authenticated
  using (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  );

drop policy if exists "deal_risk_tenant" on public.deal_risk;
create policy "deal_risk_tenant"
  on public.deal_risk for all to authenticated
  using (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  );

drop policy if exists "deal_moments_tenant" on public.deal_moments;
create policy "deal_moments_tenant"
  on public.deal_moments for all to authenticated
  using (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  );

drop policy if exists "ai_actions_tenant" on public.ai_actions;
create policy "ai_actions_tenant"
  on public.ai_actions for all to authenticated
  using (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  )
  with check (
    agency_id is null
    or agency_id in (select public.profile_agencies_for_auth())
  );

-- Realtime (Supabase): idempotentné pridanie, ak publikácia existuje
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'lead_events'
    ) then
      execute 'alter publication supabase_realtime add table public.lead_events';
    end if;
  end if;
exception
  when undefined_table then null;
  when undefined_object then null;
end
$$;
