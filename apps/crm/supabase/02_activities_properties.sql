create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  type text not null default 'Poznamka',
  text text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id text primary key,
  title text not null,
  location text not null default '',
  price integer not null default 0,
  type text not null default 'Byt',
  rooms text not null default '2 izby',
  features text[] not null default '{}',
  status text not null default 'Aktivna',
  created_at timestamptz not null default now()
);

alter table public.activities enable row level security;
alter table public.properties enable row level security;

drop policy if exists "demo_select_activities" on public.activities;
drop policy if exists "demo_insert_activities" on public.activities;
drop policy if exists "demo_select_properties" on public.properties;
drop policy if exists "demo_insert_properties" on public.properties;
drop policy if exists "demo_update_properties" on public.properties;
drop policy if exists "demo_delete_properties" on public.properties;

create policy "demo_select_activities"
on public.activities
for select
to anon, authenticated
using (true);

create policy "demo_insert_activities"
on public.activities
for insert
to anon, authenticated
with check (true);

create policy "demo_select_properties"
on public.properties
for select
to anon, authenticated
using (true);

create policy "demo_insert_properties"
on public.properties
for insert
to anon, authenticated
with check (true);

create policy "demo_update_properties"
on public.properties
for update
to anon, authenticated
using (true)
with check (true);

create policy "demo_delete_properties"
on public.properties
for delete
to anon, authenticated
using (true);

insert into public.properties (id, title, location, price, type, rooms, features, status)
values
  ('p1', '3-izbovy byt Ruzinov Novostavba', 'Bratislava - Ruzinov', 278000, 'Byt', '3 izby', array['balkon','garaz','novostavba'], 'Aktivna'),
  ('p2', '2-izbovy byt Trnava centrum', 'Trnava', 189000, 'Byt', '2 izby', array['balkon','centrum'], 'Aktivna'),
  ('p3', 'Rodinny dom Nitra Zobor', 'Nitra', 319000, 'Dom', '4 izby', array['pozemok','ticha lokalita'], 'Aktivna'),
  ('p4', '2-izbovy byt Nove Mesto', 'Bratislava - Nove Mesto', 238000, 'Byt', '2 izby', array['parkovanie','balkon'], 'Aktivna'),
  ('p5', '3-izbovy byt Petrzalka po rekonstrukcii', 'Bratislava - Petrzalka', 212000, 'Byt', '3 izby', array['loggia','rekonstrukcia'], 'Aktivna')
on conflict (id) do nothing;
