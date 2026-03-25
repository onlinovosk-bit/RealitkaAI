-- Adds automation rules table used by the assignment rules settings page.
-- Safe to run repeatedly in Supabase SQL editor.

begin;

create table if not exists public.lead_assignment_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rule_type text not null,
  profile_ids uuid[] not null default '{}',
  criteria jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.lead_assignment_rules enable row level security;

drop policy if exists "demo_select_lead_assignment_rules" on public.lead_assignment_rules;
drop policy if exists "demo_insert_lead_assignment_rules" on public.lead_assignment_rules;
drop policy if exists "demo_update_lead_assignment_rules" on public.lead_assignment_rules;
drop policy if exists "demo_delete_lead_assignment_rules" on public.lead_assignment_rules;

create policy "demo_select_lead_assignment_rules"
  on public.lead_assignment_rules for select to anon, authenticated using (true);

create policy "demo_insert_lead_assignment_rules"
  on public.lead_assignment_rules for insert to anon, authenticated with check (true);

create policy "demo_update_lead_assignment_rules"
  on public.lead_assignment_rules for update to anon, authenticated using (true) with check (true);

create policy "demo_delete_lead_assignment_rules"
  on public.lead_assignment_rules for delete to anon, authenticated using (true);

create index if not exists idx_lead_assignment_rules_active
  on public.lead_assignment_rules (is_active, created_at desc);

commit;