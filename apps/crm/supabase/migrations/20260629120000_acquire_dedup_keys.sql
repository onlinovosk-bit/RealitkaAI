create table if not exists public.acquire_dedup_keys (
  key text primary key,
  event_id text,
  agency_id uuid not null,
  created_at timestamptz default now()
);

-- RLS: zapisuje len service_role (gateway), nečíta sa klientom
alter table public.acquire_dedup_keys enable row level security;

create policy "service_role_only" on public.acquire_dedup_keys
  for all to service_role using (true) with check (true);
