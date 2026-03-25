create table if not exists public.lead_property_matches (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  property_id text not null references public.properties(id) on delete cascade,
  property_title text not null default '',
  property_location text not null default '',
  property_price integer not null default 0,
  score integer not null default 0,
  status text not null default 'sent',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (lead_id, property_id)
);

alter table public.lead_property_matches enable row level security;

drop policy if exists "demo_select_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_insert_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_update_lead_property_matches" on public.lead_property_matches;
drop policy if exists "demo_delete_lead_property_matches" on public.lead_property_matches;

create policy "demo_select_lead_property_matches"
on public.lead_property_matches
for select
 to anon, authenticated
using (true);

create policy "demo_insert_lead_property_matches"
on public.lead_property_matches
for insert
 to anon, authenticated
with check (true);

create policy "demo_update_lead_property_matches"
on public.lead_property_matches
for update
 to anon, authenticated
using (true)
with check (true);

create policy "demo_delete_lead_property_matches"
on public.lead_property_matches
for delete
 to anon, authenticated
using (true);
