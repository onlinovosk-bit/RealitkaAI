-- ENABLE RLS + POLICIES (safe for different schema variants)
do $$
begin
  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'saas_leads'
  ) then
    execute 'alter table public.saas_leads enable row level security';

    execute 'drop policy if exists "Users can view their leads" on public.saas_leads';
    execute 'drop policy if exists "Users can insert leads" on public.saas_leads';
    execute 'drop policy if exists "Users can update own leads" on public.saas_leads';

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'saas_leads'
        and column_name = 'owner_profile_id'
    ) then
      execute 'create policy "Users can view their leads"
        on public.saas_leads
        for select
        using (auth.uid() = owner_profile_id or owner_profile_id is null)';

      execute 'create policy "Users can update own leads"
        on public.saas_leads
        for update
        using (auth.uid() = owner_profile_id or owner_profile_id is null)';
    else
      execute 'create policy "Users can view their leads"
        on public.saas_leads
        for select
        using (true)';

      execute 'create policy "Users can update own leads"
        on public.saas_leads
        for update
        using (true)';
    end if;

    execute 'create policy "Users can insert leads"
      on public.saas_leads
      for insert
      with check (true)';
  end if;

  if exists (
    select 1
    from pg_tables
    where schemaname = 'public'
      and tablename = 'saas_lead_notes'
  ) then
    execute 'alter table public.saas_lead_notes enable row level security';

    execute 'drop policy if exists "Users can view notes" on public.saas_lead_notes';
    execute 'drop policy if exists "Users can insert notes" on public.saas_lead_notes';

    execute 'create policy "Users can view notes"
      on public.saas_lead_notes
      for select
      using (true)';

    execute 'create policy "Users can insert notes"
      on public.saas_lead_notes
      for insert
      with check (true)';
  end if;
end
$$;
