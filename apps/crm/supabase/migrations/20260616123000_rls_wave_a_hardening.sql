-- Brief 12 Wave A: RLS hardening for agency-scoped tables.
-- Goal: remove NULL-clause tenant bypasses and close policy gaps.

-- Strict tenant policies for agency-scoped decision tables.
do $$
declare
  row record;
begin
  for row in
    select *
    from (
      values
        ('lead_events', 'lead_events_tenant'),
        ('lead_scores', 'lead_scores_tenant'),
        ('client_dna', 'client_dna_tenant'),
        ('deal_risk', 'deal_risk_tenant'),
        ('deal_moments', 'deal_moments_tenant'),
        ('ai_actions', 'ai_actions_tenant'),
        ('lead_action_scores', 'lead_action_scores_tenant'),
        ('lead_closing_windows', 'closing_windows_tenant'),
        ('lead_rescue_runs', 'rescue_runs_tenant'),
        ('lead_micro_actions', 'micro_actions_tenant'),
        ('ai_action_audit', 'ai_action_audit_tenant')
    ) as t(tbl, pol)
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = row.tbl
    ) then
      execute format('alter table public.%I enable row level security', row.tbl);
      execute format('drop policy if exists %I on public.%I', row.pol, row.tbl);

      -- Remove legacy policy names where present.
      if row.tbl = 'ai_action_audit' then
        execute 'drop policy if exists "ai_action_audit_select_tenant" on public.ai_action_audit';
        execute 'drop policy if exists "ai_action_audit_insert_tenant" on public.ai_action_audit';
      elsif row.tbl = 'lead_scores' then
        execute 'drop policy if exists "lead_scores_agency" on public.lead_scores';
      end if;

      execute format(
        'create policy %I on public.%I for all to authenticated using (agency_id in (select public.profile_agencies_for_auth())) with check (agency_id in (select public.profile_agencies_for_auth()))',
        row.pol,
        row.tbl
      );
    end if;
  end loop;
end
$$;

-- Explicit service-role-only guardrails for automation tables with agency_id.
do $$
declare
  tbl text;
begin
  foreach tbl in array ARRAY['agency_signals', 'listings_snapshot', 'outbound_messages', 'migration_cases']
  loop
    if exists (
      select 1
      from information_schema.tables
      where table_schema = 'public'
        and table_name = tbl
    ) then
      execute format('alter table public.%I enable row level security', tbl);
      execute format('drop policy if exists %I on public.%I', tbl || '_service_role_all', tbl);
      execute format(
        'create policy %I on public.%I for all using (auth.role() = ''service_role'') with check (auth.role() = ''service_role'')',
        tbl || '_service_role_all',
        tbl
      );
    end if;
  end loop;
end
$$;

