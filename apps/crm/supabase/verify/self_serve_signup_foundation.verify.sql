-- Overenie SIGNUP-ARCH. Spúšťať VÝHRADNE na TEST projekte; celé v transakcii, na konci ROLLBACK.
-- Použitie: psql "$TEST_DB_URL" -v ON_ERROR_STOP=1 -f self_serve_signup_foundation.verify.sql
-- Pred aj po aplikácii migrácie: pred = FAIL riadky (funkcia neexistuje), po = samé PASS.
begin;
create temp table _r(test text, ok boolean, detail text) on commit drop;

do $$
declare
  u_ok uuid := gen_random_uuid(); u_unconf uuid := gen_random_uuid(); u_inv uuid := gen_random_uuid();
  j jsonb; j2 jsonb; a uuid; n int; v text;
begin
  insert into auth.users(id, email, email_confirmed_at, instance_id, aud, role)
    values (u_ok, 'verify-ok@example.test', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
           (u_unconf, 'verify-unconf@example.test', null, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated'),
           (u_inv, 'verify-invite@example.test', now(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');

  -- T1 funkcia existuje a nie je volateľná klientmi
  insert into _r select 'T1 bootstrap exists', to_regprocedure('public.bootstrap_self_serve_agency(uuid,text,text,text,text,text,integer,integer)') is not null, '';
  insert into _r select 'T2 anon/authenticated bez EXECUTE',
    not has_function_privilege('anon','public.bootstrap_self_serve_agency(uuid,text,text,text,text,text,integer,integer)','EXECUTE')
    and not has_function_privilege('authenticated','public.bootstrap_self_serve_agency(uuid,text,text,text,text,text,integer,integer)','EXECUTE')
    and has_function_privilege('service_role','public.bootstrap_self_serve_agency(uuid,text,text,text,text,text,integer,integer)','EXECUTE'), '';

  -- T3 neoverený e-mail sa odmietne
  j := public.bootstrap_self_serve_agency(u_unconf,'X',null,'Neoverena','start','v1',14,0);
  insert into _r select 'T3 unconfirmed rejected', (j->>'error') = 'email_not_confirmed', j::text;
  -- T4 bez súhlasu sa odmietne
  j := public.bootstrap_self_serve_agency(u_ok,'X',null,'Agentura','start','',14,0);
  insert into _r select 'T4 consent required', (j->>'error') = 'consent_required', j::text;
  -- T5 neexistujúci používateľ
  j := public.bootstrap_self_serve_agency(gen_random_uuid(),'X',null,'A','start','v1',14,0);
  insert into _r select 'T5 unknown user rejected', (j->>'error') = 'user_not_found', j::text;

  -- T6 úspešné založenie so bezpečnými predvolenými hodnotami
  j := public.bootstrap_self_serve_agency(u_ok,'Jana Test','+421900000000','Test Reality s.r.o.','team','v1',14,0);
  a := (j->>'agency_id')::uuid;
  insert into _r select 'T6 created', (j->>'ok')::boolean and (j->>'created')::boolean and a is not null, j::text;
  insert into _r select 'T7 safe defaults',
    exists(select 1 from public.agencies g where g.id=a and g.seats=0 and g.account_tier='free' and g.plan='Free'
           and g.created_via='self_serve' and g.trial_ends_at between now()+interval '13 days' and now()+interval '15 days'
           and coalesce(g.credits_balance,0)=0), '';
  insert into _r select 'T8 owner profile linked',
    exists(select 1 from public.profiles p where p.auth_user_id=u_ok and p.agency_id=a and p.role='owner'), '';
  insert into _r select 'T9 audit row + plan intent',
    exists(select 1 from public.account_signups s where s.auth_user_id=u_ok and s.agency_id=a and s.plan_intent='team' and s.consent_version='v1'), '';

  -- T10 idempotencia: druhé volanie nezaloží novú agentúru
  j2 := public.bootstrap_self_serve_agency(u_ok,'Jana Test',null,'Iny nazov','start','v1',14,0);
  select count(*) into n from public.agencies where created_via='self_serve' and id in (select agency_id from public.account_signups where auth_user_id=u_ok);
  insert into _r select 'T10 idempotent', (j2->>'created')::boolean = false and (j2->>'agency_id')::uuid = a and n = 1, j2::text;

  -- T11 pozvaný profil s rovnakým e-mailom: bez novej agentúry
  insert into public.profiles(agency_id, full_name, email, role, is_active) values (a, 'Pozvany', 'verify-invite@example.test', 'agent', true);
  j := public.bootstrap_self_serve_agency(u_inv,'Pozvany',null,'Nova','start','v1',14,0);
  insert into _r select 'T11 invite not hijacked', (j->>'error') = 'invite_exists', j::text;

end $$;

-- T13 guard: klient (authenticated) nezmení billing/trial stĺpce, ale zmení nechránené (name).
-- SET ROLE musí byť na najvyššej úrovni (nie vnútri DO s EXCEPTION blokom — na TEST to visí).
create temp table _g as select s.agency_id as a, s.auth_user_id as uid from public.account_signups s order by created_at desc limit 1;
select set_config('v.agency', (select a::text from _g), true);
alter table public.agencies disable row level security; -- iba v tejto (rollbacknutej) transakcii: test guardu, nie RLS
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
update public.agencies set trial_ends_at = now() + interval '3650 days', plan = 'enterprise', seats = 999, name = 'Premenovana'
  where id = current_setting('v.agency')::uuid;
reset role;
insert into _r select 'T13 guard reverts billing cols, allows name',
  g.plan = 'Free' and g.seats = 0 and g.trial_ends_at < now() + interval '15 days' and g.name = 'Premenovana', g.plan || '/' || g.seats
  from public.agencies g where g.id = (select a from _g);
select set_config('request.jwt.claim.role', '', true);

-- T14 hardening: e-mailová vetva profile_agencies_for_auth vyžaduje overený e-mail
do $$
declare uid uuid := gen_random_uuid(); a uuid; n_unconf int; n_conf int;
begin
  select agency_id into a from public.profiles where email = 'verify-ok@example.test' limit 1;
  insert into public.profiles(agency_id, full_name, email, role, is_active) values (a, 'Duch', 'ghost@example.test', 'agent', true);
  insert into auth.users(id, email, email_confirmed_at, instance_id, aud, role)
    values (uid, 'ghost@example.test', null, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated');
  perform set_config('request.jwt.claim.sub', uid::text, true);
  perform set_config('request.jwt.claim.role', 'authenticated', true);
  select count(*) into n_unconf from public.profile_agencies_for_auth();
  update auth.users set email_confirmed_at = now() where id = uid;
  select count(*) into n_conf from public.profile_agencies_for_auth();
  insert into _r values ('T14 unverified email gets no tenant; verified does', n_unconf = 0 and n_conf = 1, n_unconf||'/'||n_conf);
end $$;

select case when ok then 'PASS' else 'FAIL' end as verdict, test, detail from _r order by test;
rollback;
