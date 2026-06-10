-- Promoted from migrations-archive: required before PR-3 cost columns.

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
