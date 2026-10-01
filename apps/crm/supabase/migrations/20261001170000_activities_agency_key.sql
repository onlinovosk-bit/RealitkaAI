-- ACTIVITIES-INSERT-AGENCY-KEY: tenantový kľúč pre aktivity bez leadu (GO foundera 2026-10-01).
--
-- Problém: `activities` nemá `agency_id`; väzba na tenanta šla len cez `lead_id → leads.agency_id`. Riadky s `lead_id IS NULL`
-- (tasks, team, matching, property…) preto nemali tenanta a politika `activities_insert_agency` povoľovala ich zápis komukoľvek
-- (a `activities_select_agency`, zrušená v 20261001130000, ich čítanie). 187 historických riadkov nemá vlastníka.
--
-- Riešenie (spätne kompatibilné — writery v aplikácii sa NEMENIA):
--   1) stĺpec `agency_id` + index;
--   2) BEFORE INSERT trigger: pri riadku bez leadu a bez agency_id doplní agentúru z JWT session (profile_agencies_for_auth());
--      service role / admin (bez auth.uid()) ostáva NULL a RLS obchádza;
--   3) nové politiky nad `agency_id` (SELECT + INSERT) — cudziu agentúru nemožno podstrčiť (WITH CHECK);
--   4) zrušená `activities_insert_agency` (vetva `lead_id IS NULL` bez tenanta).
-- Lead-viazané aktivity ostávajú pod `activities_tenant_select` / `activities_tenant_write` (nezmenené).
-- 187 historických riadkov bez vlastníka ostáva s `agency_id = NULL` → viditeľné len service role (nemažú sa).

alter table public.activities add column if not exists agency_id uuid;

create index if not exists activities_agency_created_idx
  on public.activities (agency_id, created_at desc);

create or replace function public.activities_fill_agency()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.lead_id is null and new.agency_id is null and auth.uid() is not null then
    select a into new.agency_id
    from public.profile_agencies_for_auth() as a
    order by a
    limit 1;
  end if;
  return new;
end;
$$;

revoke execute on function public.activities_fill_agency() from public, anon, authenticated;

drop trigger if exists activities_fill_agency_trg on public.activities;
create trigger activities_fill_agency_trg
  before insert on public.activities
  for each row execute function public.activities_fill_agency();

drop policy if exists activities_agency_select on public.activities;
create policy activities_agency_select on public.activities
  for select to authenticated
  using (agency_id in (select public.profile_agencies_for_auth()));

drop policy if exists activities_agency_insert on public.activities;
create policy activities_agency_insert on public.activities
  for insert to authenticated
  with check (agency_id in (select public.profile_agencies_for_auth()));

drop policy if exists activities_insert_agency on public.activities;
