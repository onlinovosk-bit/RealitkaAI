-- ACTIVITIES-FEED-CHECK krok 1: `activity_stream` nesmie byť čitateľný bez prihlásenia.
--
-- Pohľad `activity_stream` je vlastnený `postgres` a nemá `security_invoker`, takže beží s právami vlastníka
-- a RLS na `activities` obchádza. `anon` mal naň SELECT (aj INSERT/UPDATE/DELETE) a cez verejný anon kľúč
-- čítal všetkých 193 riadkov (187 bez leadu — e-maily, telefóny). Jediný konzument je
-- src/app/api/activities/route.ts, ktorý vyžaduje prihláseného používateľa (401 inak).
--
-- Aplikované v PROD 2026-10-01 (execute_sql). Overené: `anon` → `permission denied for view activity_stream`;
-- has_table_privilege('anon', …, 'SELECT'/'INSERT') = false.
--
-- NEVYRIEŠENÉ (samostatné GO): `authenticated` stále vidí všetkých 193 riadkov cez pohľad (overené ako používateľ
-- agentúry 8f3a…). Treba `ALTER VIEW public.activity_stream SET (security_invoker = true);`, aby pohľad rešpektoval
-- tenantové RLS politiky `activities`.

REVOKE ALL ON public.activity_stream FROM anon;
