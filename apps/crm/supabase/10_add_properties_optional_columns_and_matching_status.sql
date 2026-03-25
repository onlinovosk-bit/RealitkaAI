-- Adds optional properties fields used by the richer UI and matching status support.
-- Safe to run repeatedly in Supabase SQL editor.

begin;

alter table if exists public.properties
  add column if not exists description text not null default '',
  add column if not exists owner_name text not null default '',
  add column if not exists owner_phone text not null default '',
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

update public.properties
set updated_at = coalesce(updated_at, created_at, timezone('utc', now()))
where updated_at is null;

create or replace function public.set_properties_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists trg_properties_set_updated_at on public.properties;

create trigger trg_properties_set_updated_at
before update on public.properties
for each row
execute function public.set_properties_updated_at();

create index if not exists idx_properties_updated_at
  on public.properties (updated_at desc);

alter table if exists public.lead_property_matches
  add column if not exists status text not null default 'sent';

create index if not exists idx_lead_property_matches_status
  on public.lead_property_matches (status);

commit;