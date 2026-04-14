-- Revolis enterprise: platform events (Realtime), audit, usage, tenant RLS
-- Spustiť v Supabase SQL Editor alebo cez CLI migrácie.

-- ─── Globálny tenant pre systémové metriky (cron bez agency) ───────────────
-- Používa sa len v usage_metrics_daily, ak agency_id chýba v kóde.

-- ─── Platform events (Supabase Realtime) ───────────────────────────────────
create table if not exists public.platform_events (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_platform_events_agency_created
  on public.platform_events (agency_id, created_at desc);

create index if not exists idx_platform_events_type_created
  on public.platform_events (event_type, created_at desc);

alter table public.platform_events enable row level security;

drop policy if exists "platform_events_select_tenant" on public.platform_events;
create policy "platform_events_select_tenant"
  on public.platform_events
  for select
  to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

-- ─── AI / outbound audit ─────────────────────────────────────────────────────
create table if not exists public.ai_action_audit (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid references public.agencies(id) on delete set null,
  lead_id text references public.leads(id) on delete set null,
  profile_id uuid references public.profiles(id) on delete set null,
  action_kind text not null,
  channel text not null default 'email',
  variant text,
  subject_preview text,
  body_hash text,
  meta jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_action_audit_agency_created
  on public.ai_action_audit (agency_id, created_at desc);

create index if not exists idx_ai_action_audit_lead
  on public.ai_action_audit (lead_id, created_at desc);

alter table public.ai_action_audit enable row level security;

drop policy if exists "ai_action_audit_select_tenant" on public.ai_action_audit;
create policy "ai_action_audit_select_tenant"
  on public.ai_action_audit
  for select
  to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

drop policy if exists "ai_action_audit_insert_tenant" on public.ai_action_audit;
create policy "ai_action_audit_insert_tenant"
  on public.ai_action_audit
  for insert
  to authenticated
  with check (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

-- ─── Usage metrics (denormalizované denné súčty) ─────────────────────────────
create table if not exists public.usage_metrics_daily (
  agency_id uuid not null references public.agencies(id) on delete cascade,
  metric_day date not null,
  metric text not null,
  amount bigint not null default 0,
  primary key (agency_id, metric_day, metric)
);

alter table public.usage_metrics_daily enable row level security;

drop policy if exists "usage_metrics_select_tenant" on public.usage_metrics_daily;
create policy "usage_metrics_select_tenant"
  on public.usage_metrics_daily
  for select
  to authenticated
  using (
    agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create or replace function public.increment_usage_metric(
  p_agency uuid,
  p_metric text,
  p_delta bigint
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_delta bigint;
begin
  v_delta := coalesce(p_delta, 1);
  if v_delta < 1 then
    v_delta := 1;
  end if;

  insert into public.usage_metrics_daily (agency_id, metric_day, metric, amount)
  values (
    p_agency,
    (timezone('utc', now()))::date,
    p_metric,
    v_delta
  )
  on conflict (agency_id, metric_day, metric)
  do update set amount = public.usage_metrics_daily.amount + excluded.amount;
end;
$$;

revoke all on function public.increment_usage_metric(uuid, text, bigint) from public;
grant execute on function public.increment_usage_metric(uuid, text, bigint) to service_role;

-- ─── Emit funkcia + triggery (SECURITY DEFINER obchádza RLS na insert) ─────
create or replace function public.emit_platform_event(
  p_agency uuid,
  p_type text,
  p_payload jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.platform_events (agency_id, event_type, payload)
  values (p_agency, p_type, coalesce(p_payload, '{}'::jsonb));
end;
$$;

create or replace function public.trg_leads_platform_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform public.emit_platform_event(
      new.agency_id,
      'lead.created',
      jsonb_build_object(
        'lead_id', new.id,
        'name', new.name,
        'status', new.status
      )
    );
  elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
    perform public.emit_platform_event(
      new.agency_id,
      'lead.status_changed',
      jsonb_build_object(
        'lead_id', new.id,
        'from', old.status,
        'to', new.status
      )
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_leads_platform_events on public.leads;
create trigger trg_leads_platform_events
  after insert or update on public.leads
  for each row
  execute procedure public.trg_leads_platform_events();

create or replace function public.trg_activities_platform_events()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_agency uuid;
begin
  if new.lead_id is null then
    return new;
  end if;

  select l.agency_id into v_agency from public.leads l where l.id = new.lead_id limit 1;

  if new.source in ('integrations', 'email', 'imap', 'gmail', 'outreach')
     or new.type ilike '%email%'
     or new.type ilike '%sync%' then
    perform public.emit_platform_event(
      v_agency,
      'integration.activity',
      jsonb_build_object(
        'activity_id', new.id,
        'lead_id', new.lead_id,
        'type', new.type,
        'source', new.source,
        'title', left(coalesce(new.title, ''), 200)
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_activities_platform_events on public.activities;
create trigger trg_activities_platform_events
  after insert on public.activities
  for each row
  execute procedure public.trg_activities_platform_events();

-- ─── Realtime publikácia ─────────────────────────────────────────────────────
do $$
begin
  alter publication supabase_realtime add table public.platform_events;
exception
  when duplicate_object then null;
end $$;

-- ─── Tenant RLS: leads ───────────────────────────────────────────────────────
drop policy if exists "demo_select_leads" on public.leads;
drop policy if exists "demo_insert_leads" on public.leads;
drop policy if exists "demo_update_leads" on public.leads;
drop policy if exists "demo_delete_leads" on public.leads;

create policy "leads_select_agency"
  on public.leads for select to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create policy "leads_insert_agency"
  on public.leads for insert to authenticated
  with check (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create policy "leads_update_agency"
  on public.leads for update to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  )
  with check (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create policy "leads_delete_agency"
  on public.leads for delete to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

-- Legacy: serverless joby / staré API s anon kľúčom bez JWT
create policy "leads_anon_legacy_all"
  on public.leads for all to anon
  using (true)
  with check (true);

-- ─── Tenant RLS: properties ───────────────────────────────────────────────────
drop policy if exists "demo_select_properties" on public.properties;
drop policy if exists "demo_insert_properties" on public.properties;
drop policy if exists "demo_update_properties" on public.properties;
drop policy if exists "demo_delete_properties" on public.properties;

create policy "properties_select_agency"
  on public.properties for select to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create policy "properties_insert_agency"
  on public.properties for insert to authenticated
  with check (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create policy "properties_update_agency"
  on public.properties for update to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  )
  with check (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create policy "properties_delete_agency"
  on public.properties for delete to authenticated
  using (
    agency_id is null
    or agency_id in (
      select p.agency_id from public.profiles p
      where p.auth_user_id = auth.uid() and p.agency_id is not null
    )
  );

create policy "properties_anon_legacy_all"
  on public.properties for all to anon
  using (true)
  with check (true);

-- ─── Tenant RLS: lead_property_matches ────────────────────────────────────────
drop policy if exists "demo_select_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_insert_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_update_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_delete_lead_property_matches" on public.lead_property_matches;

create policy "matches_select_agency"
  on public.lead_property_matches for select to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.agency_id is null
          or l.agency_id in (
            select p.agency_id from public.profiles p
            where p.auth_user_id = auth.uid() and p.agency_id is not null
          )
        )
    )
  );

create policy "matches_insert_agency"
  on public.lead_property_matches for insert to authenticated
  with check (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.agency_id is null
          or l.agency_id in (
            select p.agency_id from public.profiles p
            where p.auth_user_id = auth.uid() and p.agency_id is not null
          )
        )
    )
  );

create policy "matches_update_agency"
  on public.lead_property_matches for update to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.agency_id is null
          or l.agency_id in (
            select p.agency_id from public.profiles p
            where p.auth_user_id = auth.uid() and p.agency_id is not null
          )
        )
    )
  );

create policy "matches_delete_agency"
  on public.lead_property_matches for delete to authenticated
  using (
    exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.agency_id is null
          or l.agency_id in (
            select p.agency_id from public.profiles p
            where p.auth_user_id = auth.uid() and p.agency_id is not null
          )
        )
    )
  );

create policy "matches_anon_legacy_all"
  on public.lead_property_matches for all to anon
  using (true)
  with check (true);

-- ─── Tenant RLS: activities (cez lead) ───────────────────────────────────────
drop policy if exists "demo_select_activities" on public.activities;
drop policy if exists "demo_insert_activities" on public.activities;

create policy "activities_select_agency"
  on public.activities for select to authenticated
  using (
    lead_id is null
    or exists (
      select 1 from public.leads l
      where l.id = activities.lead_id
        and (
          l.agency_id is null
          or l.agency_id in (
            select p.agency_id from public.profiles p
            where p.auth_user_id = auth.uid() and p.agency_id is not null
          )
        )
    )
  );

create policy "activities_insert_agency"
  on public.activities for insert to authenticated
  with check (
    lead_id is null
    or exists (
      select 1 from public.leads l
      where l.id = lead_id
        and (
          l.agency_id is null
          or l.agency_id in (
            select p.agency_id from public.profiles p
            where p.auth_user_id = auth.uid() and p.agency_id is not null
          )
        )
    )
  );

create policy "activities_anon_legacy_all"
  on public.activities for all to anon
  using (true)
  with check (true);
