-- Brief 12 Wave A patch: close confirmed cross-tenant leaks.

do $$
begin
  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'leads'
  ) then
    alter table public.leads enable row level security;
    drop policy if exists "demo_select_leads" on public.leads;
    drop policy if exists "demo_insert_leads" on public.leads;
    drop policy if exists "demo_update_leads" on public.leads;
    drop policy if exists "demo_delete_leads" on public.leads;
    drop policy if exists "leads_tenant" on public.leads;
    create policy "leads_tenant"
      on public.leads for all to authenticated
      using (agency_id in (select public.profile_agencies_for_auth()))
      with check (agency_id in (select public.profile_agencies_for_auth()));
  end if;

  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'properties'
  ) then
    alter table public.properties enable row level security;
    drop policy if exists "demo_select_properties" on public.properties;
    drop policy if exists "demo_insert_properties" on public.properties;
    drop policy if exists "demo_update_properties" on public.properties;
    drop policy if exists "demo_delete_properties" on public.properties;
    drop policy if exists "properties_tenant" on public.properties;
    create policy "properties_tenant"
      on public.properties for all to authenticated
      using (agency_id in (select public.profile_agencies_for_auth()))
      with check (agency_id in (select public.profile_agencies_for_auth()));
  end if;

  if exists (
    select 1 from information_schema.tables where table_schema = 'public' and table_name = 'outreach_logs'
  ) then
    alter table public.outreach_logs enable row level security;
    drop policy if exists "owners read own outreach logs" on public.outreach_logs;
    drop policy if exists "outreach_logs_agency" on public.outreach_logs;
    drop policy if exists "outreach_logs_tenant" on public.outreach_logs;
    create policy "outreach_logs_tenant"
      on public.outreach_logs for all to authenticated
      using (
        (lead_id is not null and lead_id in (
          select id from public.leads
          where agency_id in (select public.profile_agencies_for_auth())
        ))
        or
        (profile_id is not null and profile_id in (
          select id from public.profiles
          where agency_id in (select public.profile_agencies_for_auth())
        ))
      )
      with check (
        (lead_id is not null and lead_id in (
          select id from public.leads
          where agency_id in (select public.profile_agencies_for_auth())
        ))
        or
        (profile_id is not null and profile_id in (
          select id from public.profiles
          where agency_id in (select public.profile_agencies_for_auth())
        ))
      );
  end if;
end
$$;

