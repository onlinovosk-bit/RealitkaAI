-- 18_add_tasks_and_saas_leads.sql
-- Vytvorí tabuľky tasks a saas_leads potrebné pre demo booking automation

-- ─── tasks ──────────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  lead_id     text references public.leads(id) on delete set null,
  title       text not null,
  description text not null default '',
  status      text not null default 'open',
  priority    text not null default 'normal',
  created_at  timestamptz not null default now()
);

alter table public.tasks alter column lead_id drop not null;

alter table public.tasks enable row level security;

drop policy if exists "tasks_select" on public.tasks;
drop policy if exists "tasks_insert" on public.tasks;
drop policy if exists "tasks_update" on public.tasks;
drop policy if exists "tasks_delete" on public.tasks;

create policy "tasks_select" on public.tasks for select using (true);
create policy "tasks_insert" on public.tasks for insert with check (true);
create policy "tasks_update" on public.tasks for update using (true);
create policy "tasks_delete" on public.tasks for delete using (true);

-- ─── saas_leads ─────────────────────────────────────────────────────────────

create table if not exists public.saas_leads (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  email        text not null,
  phone        text not null default '',
  company      text not null,
  agents_count integer not null default 1,
  city         text not null default '',
  note         text not null default '',
  source       text not null default 'Demo request',
  status       text not null default 'new',
  created_at   timestamptz not null default now()
);

alter table public.saas_leads enable row level security;

drop policy if exists "saas_leads_select" on public.saas_leads;
drop policy if exists "saas_leads_insert" on public.saas_leads;
drop policy if exists "saas_leads_update" on public.saas_leads;
drop policy if exists "saas_leads_delete" on public.saas_leads;

create policy "saas_leads_select" on public.saas_leads for select using (true);
create policy "saas_leads_insert" on public.saas_leads for insert with check (true);
create policy "saas_leads_update" on public.saas_leads for update using (true);
create policy "saas_leads_delete" on public.saas_leads for delete using (true);
