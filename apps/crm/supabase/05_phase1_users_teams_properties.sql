-- =========================================================
-- 05_phase1_users_teams_properties.sql
-- Bezpecna dalsia migracia: pouzivatelia, timy, demo agenti,
-- demo agency, demo team a doplnkove seeds pre properties.
-- Spustit az po uspesnom verify skripte.
-- =========================================================

create extension if not exists pgcrypto;

-- DEMO AGENCY
insert into public.agencies (id, name, slug, country, city, plan, is_active)
select
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Demo Realitka',
  'demo-realitka',
  'Slovensko',
  'Bratislava',
  'Pro',
  true
where not exists (
  select 1 from public.agencies
  where id = '11111111-1111-1111-1111-111111111111'::uuid
);

-- DEMO TEAM
insert into public.teams (id, agency_id, name, is_active)
select
  '22222222-2222-2222-2222-222222222222'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  'Predaj Bratislava',
  true
where not exists (
  select 1 from public.teams
  where id = '22222222-2222-2222-2222-222222222222'::uuid
);

-- DEMO PROFILY
insert into public.profiles (
  id, agency_id, team_id, full_name, email, role, phone, is_active
)
select
  '33333333-3333-3333-3333-333333333331'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Lucia Hrivnáková',
  'lucia@demorealitka.sk',
  'agent',
  '+421900111111',
  true
where not exists (
  select 1 from public.profiles
  where id = '33333333-3333-3333-3333-333333333331'::uuid
);

insert into public.profiles (
  id, agency_id, team_id, full_name, email, role, phone, is_active
)
select
  '33333333-3333-3333-3333-333333333332'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Tomáš Krištof',
  'tomas@demorealitka.sk',
  'agent',
  '+421900222222',
  true
where not exists (
  select 1 from public.profiles
  where id = '33333333-3333-3333-3333-333333333332'::uuid
);

insert into public.profiles (
  id, agency_id, team_id, full_name, email, role, phone, is_active
)
select
  '33333333-3333-3333-3333-333333333333'::uuid,
  '11111111-1111-1111-1111-111111111111'::uuid,
  '22222222-2222-2222-2222-222222222222'::uuid,
  'Majiteľ Kancelárie',
  'owner@demorealitka.sk',
  'owner',
  '+421900333333',
  true
where not exists (
  select 1 from public.profiles
  where id = '33333333-3333-3333-3333-333333333333'::uuid
);

-- PREPOJENIE EXISTUJÚCICH LEADOV NA DEMO AGENCY/TEAM/PROFILY
update public.leads
set
  agency_id = coalesce(agency_id, '11111111-1111-1111-1111-111111111111'::uuid),
  team_id = coalesce(team_id, '22222222-2222-2222-2222-222222222222'::uuid)
where agency_id is null
   or team_id is null;

update public.leads
set assigned_profile_id =
  case
    when assigned_agent ilike '%Lucia%' then '33333333-3333-3333-3333-333333333331'::uuid
    when assigned_agent ilike '%Tomáš%' then '33333333-3333-3333-3333-333333333332'::uuid
    else assigned_profile_id
  end
where assigned_profile_id is null;

-- PREPOJENIE EXISTUJÚCICH PROPERTIES NA DEMO AGENCY
update public.properties
set agency_id = coalesce(agency_id, '11111111-1111-1111-1111-111111111111'::uuid)
where agency_id is null;

-- DEMO TASKY
insert into public.tasks (
  id, lead_id, assigned_profile_id, title, description, status, priority, due_at
)
select
  gen_random_uuid(),
  l.id,
  l.assigned_profile_id,
  'Kontaktovať lead',
  'Prvý follow-up po zachytení leadu.',
  'open',
  'high',
  now() + interval '1 day'
from public.leads l
where not exists (
  select 1 from public.tasks t where t.lead_id = l.id
)
limit 5;

-- DEMO AI RECOMMENDATIONS PRE EXISTUJÚCE LEADY
insert into public.ai_recommendations (
  id, lead_id, recommendation_type, title, description, priority, status, model_version
)
select
  gen_random_uuid(),
  l.id,
  'next_best_action',
  'Kontaktovať klienta dnes',
  'Lead má dostatočné skóre na okamžitý follow-up a navrhnutie obhliadky.',
  'high',
  'active',
  'v1'
from public.leads l
where l.score >= 70
  and not exists (
    select 1
    from public.ai_recommendations r
    where r.lead_id = l.id
      and r.recommendation_type = 'next_best_action'
  );

-- DOPLNKOVÁ KONTROLA
select 'agencies' as table_name, count(*) as rows_count from public.agencies
union all
select 'teams', count(*) from public.teams
union all
select 'profiles', count(*) from public.profiles
union all
select 'tasks', count(*) from public.tasks
union all
select 'ai_recommendations', count(*) from public.ai_recommendations
order by table_name;
