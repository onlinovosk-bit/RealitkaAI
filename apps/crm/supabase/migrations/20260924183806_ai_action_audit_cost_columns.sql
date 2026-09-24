-- AUDIT-SCHEMA-01 — sprav zápis nákladov funkčným (AP-010).
--
-- `logAiActionAudit()` zapisuje do `ai_action_audit` štyri stĺpce, ktoré
-- v produkcii nikdy nevznikli: repo migrácie `20260611000002_ai_action_audit_cost.sql`
-- a `20260611000004_ai_cost_daily.sql` existujú, ale neboli aplikované.
-- PostgREST taký insert odmieta a chyba končí v `console.warn`, takže eurová
-- suma z `estimateOpenAiCostEur()` sa nikam neukladá.
--
-- Táto migrácia dopĺňa VÝHRADNE tie štyri stĺpce. Definície sú prevzaté
-- doslovne z uvedených dvoch migrácií a sú `IF NOT EXISTS`, takže ak sa tie
-- niekedy dobehnú, táto migrácia im neprekáža a naopak.
--
-- ZÁMERNE NEOBSAHUJE pohľady `ai_action_daily_agency` a `ai_cost_daily`
-- z tých istých migrácií. `ai_cost_daily` počíta
--   revenue_eur_retail = credits_spent * 0,86
-- teda podľa archivovaného kreditového cenníka. Pri modeli 199 €/kancelária
-- bez kreditov je `credits_spent` vždy NULL, takže by pohľad vykazoval
-- retail 0 € a maržu −cost_eur. `FounderMetricsDashboard` ten pohľad číta
-- a dnes zobrazuje poctivý stav „view nie je dostupná"; vytvorenie pohľadu
-- by ho nahradilo nepravdivým číslom. Prepis vzorca na nový cenník je
-- samostatné rozhodnutie foundera.

ALTER TABLE public.ai_action_audit
  ADD COLUMN IF NOT EXISTS cost_eur numeric(10, 4),
  ADD COLUMN IF NOT EXISTS credits_spent integer,
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS latency_ms integer;
