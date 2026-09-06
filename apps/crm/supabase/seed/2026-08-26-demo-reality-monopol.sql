-- =============================================================================
-- DEMO SEED — Reality Monopol
-- =============================================================================
-- NEAPLIKOVAŤ z agenta. Founder číta riadok po riadku a spustí v Supabase
-- Dashboard → SQL editor na produkcii (alebo Preview DB) AŽ po kontrole UUID.
--
-- DEMO_AGENCY_ID  = 8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20
-- DEMO_PROFILE_ID = 7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021
-- ZÁKAZ: 11111111-1111-1111-1111-111111111111 (catch-all / Smolko seed)
--
-- Čísla dlaždíc vznikajú súčtom riadkov (parseBudgetCommission = round(budget*0.03)):
--   pipeline 124 000 € = suma 3 % z budget otvorených leadov
--   ohrozené  18 400 € = 3 % z 3 stale Horúci/Ponuka (Lucia 7 200 + 5 600 + 5 600)
--   24 pripravení      = všetky riadky majú ai_priority = Vysoká
--   7 akcií dnes       = 7× status Nový, created_at < 14 dní (Action Queue)
--   DailyActionPanel na dashboarde doplní filler až na 9 — to SQL nezmení.
--   /api/ai/monthly-forecast berie budget ako number; stĺpec je text → KPI
--   „predpoklad obratu“ môže ukázať €0k, kým API vráti 0. First-audit dlaždice
--   používajú 3 % z textového budgetu (124 000 / 18 400).
-- 24 riadkov < LEADS_PAGE_SIZE 50, aby dashboard spočítal všetky.
-- =============================================================================

BEGIN;

-- Idempotentné: zmaž predchádzajúci beh tohto seedu, nič iné.
DELETE FROM public.tasks
WHERE lead_id LIKE 'rm-20260826-%';

DELETE FROM public.leads
WHERE id LIKE 'rm-20260826-%'
   OR (
     agency_id = '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid
     AND note = 'DEMO_REALITY_MONOPOL_20260826'
   );

INSERT INTO public.agencies (id, name, slug, city, plan, is_active)
VALUES (
  '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  'Reality Monopol',
  'reality-monopol',
  'Bratislava',
  'protocol_authority',
  true
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    city = EXCLUDED.city,
    plan = EXCLUDED.plan,
    is_active = true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'agencies' AND column_name = 'manual_plan'
  ) THEN
    EXECUTE $u$UPDATE public.agencies
      SET manual_plan = 'protocol_authority'
      WHERE id = '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'$u$;
  END IF;
END $$;

INSERT INTO public.profiles (
  id, agency_id, full_name, email, role, phone, is_active
) VALUES (
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  'Demo Reality Monopol',
  'reality.monopol.demo@revolis.invalid',
  'owner',
  '',
  true
)
ON CONFLICT (id) DO UPDATE
SET agency_id = EXCLUDED.agency_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    is_active = true;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'account_tier'
  ) THEN
    EXECUTE $u$UPDATE public.profiles
      SET account_tier = 'protocol_authority'
      WHERE id = '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'$u$;
  END IF;
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'ui_role'
  ) THEN
    EXECUTE $u$UPDATE public.profiles
      SET ui_role = 'owner_protocol'
      WHERE id = '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'$u$;
  END IF;
END $$;

-- last_contact text: ISO, aby isLastContactStale vedel parsovať.
-- stale = now-20d (prah 7 dní). fresh = now-1d.

INSERT INTO public.leads (
  id, agency_id, assigned_profile_id, name, email, phone, location,
  budget, property_type, rooms, financing, timeline, source, status, score,
  assigned_agent, last_contact, note, created_at,
  buyer_readiness_score, ai_priority, ai_reason, ai_triage_at, is_active
)
VALUES
-- At-risk 18 400 € (stale + Horúci/Ponuka)
(
  'rm-20260826-01', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Lucia Šimko', 'lucia.simko@example.invalid', '+421901000001', 'Bratislava',
  '240000', 'Byt', '3 izby', 'Hypotéka', 'Ihneď', 'Web formulár', 'Horúci', 91,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '20 days'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '10 days',
  91, 'Vysoká', 'Pripravená kúpiť — 91 % istota', timezone('utc', now()) - interval '2 days', true
),
(
  'rm-20260826-02', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Martin Kováč', 'martin.kovac@example.invalid', '+421901000002', 'Bratislava',
  '186667', 'Byt', '2 izby', 'Hypotéka', 'Do 1 mesiaca', 'Facebook Ads', 'Horúci', 82,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '20 days'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '10 days',
  82, 'Vysoká', 'Horúci bez follow-upu', timezone('utc', now()) - interval '2 days', true
),
(
  'rm-20260826-03', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Peter Varga', 'peter.varga@example.invalid', '+421901000003', 'Bratislava',
  '186667', 'Dom', '4 izby', 'Hypotéka', 'Do 1 mesiaca', 'Google Ads', 'Ponuka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '20 days'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '10 days',
  80, 'Vysoká', 'Ponuka bez kontaktu', timezone('utc', now()) - interval '2 days', true
),
-- Lukáš Nagy / Jana Horváth (nie at-risk — čerstvý kontakt)
(
  'rm-20260826-04', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Lukáš Nagy', 'lukas.nagy@example.invalid', '+421901000004', 'Bratislava',
  '180000', 'Byt', '3 izby', 'Hypotéka', 'Ihneď', 'Odporúčanie', 'Ponuka', 87,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '8 days',
  87, 'Vysoká', 'Hypotéka pripravená', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-05', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Jana Horváth', 'jana.horvath@example.invalid', '+421901000005', 'Bratislava',
  '120000', 'Byt', '2 izby', 'Hypotéka', 'Do 1 mesiaca', 'Chatbot', 'Obhliadka', 78,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '6 days',
  78, 'Vysoká', 'Čaká na obhliadku', timezone('utc', now()) - interval '1 day', true
),
-- 7× Nový = Action Queue (score 55 → nie at-risk). Jeden budget 220000 = 6 600 €.
(
  'rm-20260826-06', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Tomáš Baláž', 'tomas.balaz@example.invalid', '+421901000006', 'Bratislava',
  '220000', 'Byt', '3 izby', 'Hypotéka', 'Do 2 mesiacov', 'Portál', 'Nový', 55,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '3 days',
  55, 'Vysoká', 'Nový inbound', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-07', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Eva Tóthová', 'eva.tothova@example.invalid', '+421901000007', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Hypotéka', 'Do 3 mesiacov', 'Web formulár', 'Nový', 55,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '3 days',
  55, 'Vysoká', 'Nový inbound', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-08', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Marek Szabó', 'marek.szabo@example.invalid', '+421901000008', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Hypotéka', 'Do 3 mesiacov', 'Facebook Ads', 'Nový', 55,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '3 days',
  55, 'Vysoká', 'Nový inbound', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-09', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Zuzana Molnárová', 'zuzana.molnarova@example.invalid', '+421901000009', 'Bratislava',
  '166667', 'Byt', '3 izby', 'Hotovosť', 'Do 2 mesiacov', 'Google Ads', 'Nový', 55,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '3 days',
  55, 'Vysoká', 'Nový inbound', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-10', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Filip Novák', 'filip.novak@example.invalid', '+421901000010', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Hypotéka', 'Do 3 mesiacov', 'Chatbot', 'Nový', 55,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '3 days',
  55, 'Vysoká', 'Nový inbound', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-11', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Kristína Urbanová', 'kristina.urbanova@example.invalid', '+421901000011', 'Bratislava',
  '166667', 'Byt', '3 izby', 'Hypotéka', 'Do 2 mesiacov', 'Odporúčanie', 'Nový', 55,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '3 days',
  55, 'Vysoká', 'Nový inbound', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-12', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Ondrej Polák', 'ondrej.polak@example.invalid', '+421901000012', 'Bratislava',
  '166667', 'Dom', '4 izby', 'Kombinácia', 'Do 3 mesiacov', 'Portál', 'Nový', 55,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '3 days',
  55, 'Vysoká', 'Nový inbound', timezone('utc', now()) - interval '1 day', true
),
-- 12 ďalších Vysoká, čerstvý kontakt, 5 000 € / ks
(
  'rm-20260826-13', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Michaela Králová', 'michaela.kralova@example.invalid', '+421901000013', 'Bratislava',
  '166667', 'Byt', '3 izby', 'Hypotéka', 'Do 1 mesiaca', 'Web formulár', 'Horúci', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravená kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-14', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Ján Kučera', 'jan.kucera@example.invalid', '+421901000014', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Hypotéka', 'Do 1 mesiaca', 'Facebook Ads', 'Obhliadka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravený kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-15', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Alena Benková', 'alena.benkova@example.invalid', '+421901000015', 'Bratislava',
  '166667', 'Byt', '3 izby', 'Hotovosť', 'Ihneď', 'Google Ads', 'Ponuka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravená kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-16', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Róbert Farkaš', 'robert.farkas@example.invalid', '+421901000016', 'Bratislava',
  '166667', 'Dom', '4 izby', 'Hypotéka', 'Do 2 mesiacov', 'Chatbot', 'Horúci', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravený kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-17', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Simona Gajdošová', 'simona.gajdosova@example.invalid', '+421901000017', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Hypotéka', 'Do 1 mesiaca', 'Odporúčanie', 'Obhliadka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravená kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-18', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Daniel Oravec', 'daniel.oravec@example.invalid', '+421901000018', 'Bratislava',
  '166667', 'Byt', '3 izby', 'Hypotéka', 'Do 1 mesiaca', 'Portál', 'Ponuka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravený kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-19', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Barbora Lacková', 'barbora.lackova@example.invalid', '+421901000019', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Hotovosť', 'Ihneď', 'Web formulár', 'Horúci', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravená kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-20', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Patrik Hruška', 'patrik.hruska@example.invalid', '+421901000020', 'Bratislava',
  '166667', 'Byt', '3 izby', 'Hypotéka', 'Do 2 mesiacov', 'Facebook Ads', 'Obhliadka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravený kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-21', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Monika Vargová', 'monika.vargova@example.invalid', '+421901000021', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Hypotéka', 'Do 1 mesiaca', 'Google Ads', 'Ponuka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravená kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-22', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Richard Nemec', 'richard.nemec@example.invalid', '+421901000022', 'Bratislava',
  '166667', 'Dom', '5 izieb', 'Hypotéka', 'Do 3 mesiacov', 'Chatbot', 'Horúci', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravený kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-23', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Lenka Kováčová', 'lenka.kovacova@example.invalid', '+421901000023', 'Bratislava',
  '166667', 'Byt', '3 izby', 'Hypotéka', 'Do 1 mesiaca', 'Odporúčanie', 'Obhliadka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravená kúpiť', timezone('utc', now()) - interval '1 day', true
),
(
  'rm-20260826-24', '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Adam Tóth', 'adam.toth@example.invalid', '+421901000024', 'Bratislava',
  '166667', 'Byt', '2 izby', 'Kombinácia', 'Do 2 mesiacov', 'Portál', 'Ponuka', 80,
  'Demo Reality Monopol',
  to_char((timezone('utc', now()) - interval '1 day'), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'),
  'DEMO_REALITY_MONOPOL_20260826',
  timezone('utc', now()) - interval '9 days',
  80, 'Vysoká', 'Pripravený kúpiť', timezone('utc', now()) - interval '1 day', true
);

-- 7 úloh na dnes — viazané na 7 Nový leadov (Action Queue).
INSERT INTO public.tasks (
  lead_id, assigned_profile_id, title, description, status, priority, due_at
)
SELECT
  l.id,
  '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid,
  'Zavolať: ' || l.name,
  'DEMO_REALITY_MONOPOL_20260826',
  'open',
  'high',
  timezone('utc', now()) + interval '3 hours'
FROM public.leads l
WHERE l.id IN (
  'rm-20260826-06','rm-20260826-07','rm-20260826-08','rm-20260826-09',
  'rm-20260826-10','rm-20260826-11','rm-20260826-12'
);

-- Overenie súčtov (očakávané: 24 / 124000 / 18400 / 7 / 7)
SELECT
  count(*) AS lead_count,
  count(*) FILTER (WHERE ai_priority = 'Vysoká') AS ready_vysoka,
  count(*) FILTER (WHERE status = 'Nový') AS action_queue_novy,
  sum(round(regexp_replace(budget, '[^0-9]', '', 'g')::numeric * 0.03)) AS pipeline_commission,
  sum(round(regexp_replace(budget, '[^0-9]', '', 'g')::numeric * 0.03))
    FILTER (
      WHERE status IN ('Nový', 'Teplý', 'Horúci', 'Obhliadka', 'Ponuka')
        AND (score >= 70 OR status IN ('Horúci', 'Ponuka'))
        AND last_contact::timestamptz < timezone('utc', now()) - interval '7 days'
    ) AS at_risk_commission
FROM public.leads
WHERE agency_id = '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid
  AND note = 'DEMO_REALITY_MONOPOL_20260826';

SELECT count(*) AS tasks_today
FROM public.tasks
WHERE description = 'DEMO_REALITY_MONOPOL_20260826';

COMMIT;

-- -----------------------------------------------------------------------------
-- ROLLBACK (spustiť samostatne, len tento demo tenant)
-- -----------------------------------------------------------------------------
-- BEGIN;
-- DELETE FROM public.tasks WHERE description = 'DEMO_REALITY_MONOPOL_20260826';
-- DELETE FROM public.leads
--   WHERE agency_id = '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid
--     AND note = 'DEMO_REALITY_MONOPOL_20260826';
-- DELETE FROM public.profiles
--   WHERE id = '7e2b9c4a-26a8-4d91-b4e7-1a5d3c8e9021'::uuid
--     AND email = 'reality.monopol.demo@revolis.invalid';
-- DELETE FROM public.agencies
--   WHERE id = '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20'::uuid
--     AND name = 'Reality Monopol';
-- COMMIT;
--
-- NAPOJENIE LOGINU (až po SELECT, nikdy naslepo):
--   SELECT id, email, agency_id FROM public.profiles WHERE email = 'VAŠE_DEMO_LOGIN';
--   UPDATE public.profiles
--     SET agency_id = '8f3a1c2e-26a8-4d91-b4e7-9c1d5a7b3e20',
--         account_tier = 'protocol_authority',
--         ui_role = 'owner_protocol'
--     WHERE id = '…iba ten riadok zo SELECT…';
