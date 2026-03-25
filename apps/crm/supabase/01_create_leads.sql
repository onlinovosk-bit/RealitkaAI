create table if not exists public.leads (
  id text primary key,
  name text not null,
  email text not null default '',
  phone text not null default '',
  location text not null default '',
  budget text not null default '',
  property_type text not null default 'Byt',
  rooms text not null default '2 izby',
  financing text not null default 'Hypotéka',
  timeline text not null default 'Do 3 mesiacov',
  source text not null default 'Web formulár',
  status text not null default 'Nový',
  score integer not null default 50,
  assigned_agent text not null default 'Nepriradený',
  last_contact text not null default 'Práve vytvorený',
  note text not null default '',
  created_at timestamptz not null default now()
);

alter table public.leads enable row level security;

drop policy if exists "demo_select_leads" on public.leads;
drop policy if exists "demo_insert_leads" on public.leads;
drop policy if exists "demo_update_leads" on public.leads;
drop policy if exists "demo_delete_leads" on public.leads;

create policy "demo_select_leads"
on public.leads
for select
to anon, authenticated
using (true);

create policy "demo_insert_leads"
on public.leads
for insert
to anon, authenticated
with check (true);

create policy "demo_update_leads"
on public.leads
for update
to anon, authenticated
using (true)
with check (true);

create policy "demo_delete_leads"
on public.leads
for delete
to anon, authenticated
using (true);