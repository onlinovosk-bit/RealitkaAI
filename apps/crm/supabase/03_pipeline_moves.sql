create table if not exists public.pipeline_moves (
  id uuid primary key default gen_random_uuid(),
  lead_id text not null references public.leads(id) on delete cascade,
  lead_name text not null default '',
  from_status text not null,
  to_status text not null,
  changed_at timestamptz not null default now()
);

alter table public.pipeline_moves enable row level security;

drop policy if exists "demo_select_pipeline_moves" on public.pipeline_moves;
drop policy if exists "demo_insert_pipeline_moves" on public.pipeline_moves;

create policy "demo_select_pipeline_moves"
on public.pipeline_moves
for select
to anon, authenticated
using (true);

create policy "demo_insert_pipeline_moves"
on public.pipeline_moves
for insert
to anon, authenticated
with check (true);
