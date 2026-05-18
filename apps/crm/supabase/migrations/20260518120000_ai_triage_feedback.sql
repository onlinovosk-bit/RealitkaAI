-- Spätná väzba makléra k AI triáži (dôvera, zlepšovanie modelu) — pre-mortem Sc. 3.
create table if not exists public.ai_triage_feedback (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads (id) on delete cascade,
  agency_id uuid references public.agencies (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  helpful boolean not null,
  note text,
  created_at timestamptz not null default now()
);

comment on table public.ai_triage_feedback is 'Spätná väzba k automatickej triáži — author alebo owner/manager v agentúre.';

create index if not exists ai_triage_feedback_agency_created_idx
  on public.ai_triage_feedback using btree (agency_id asc, created_at desc);

create index if not exists ai_triage_feedback_lead_idx
  on public.ai_triage_feedback using btree (lead_id asc);

-- Doplň agency_id z leadu (pre RLS a reporty).
create or replace function public.ai_triage_feedback_set_agency()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  select l.agency_id into new.agency_id
  from public.leads l
  where l.id = new.lead_id
  limit 1;
  return new;
end;
$$;

drop trigger if exists tr_ai_triage_feedback_set_agency on public.ai_triage_feedback;
create trigger tr_ai_triage_feedback_set_agency
  before insert on public.ai_triage_feedback
  for each row
  execute function public.ai_triage_feedback_set_agency();

alter table public.ai_triage_feedback enable row level security;

create policy "ai_triage_feedback_insert_own_agency"
  on public.ai_triage_feedback for insert
  with check (
    profile_id = auth.uid()
    and exists (
      select 1
      from public.leads l
      where l.id = lead_id
        and l.agency_id is not null
        and l.agency_id in (select public.profile_agencies_for_auth())
    )
  );

-- Čítanie: autor + owner/manager v tej istej agentúre (nie čistý „surveillance“ feed pre všetkých agentov).
create policy "ai_triage_feedback_select_author_or_leadership"
  on public.ai_triage_feedback for select
  using (
    agency_id is not null
    and agency_id in (select public.profile_agencies_for_auth())
    and (
      profile_id = auth.uid()
      or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.agency_id = ai_triage_feedback.agency_id
          and lower(trim(p.role)) in ('owner', 'manager')
      )
    )
  );
