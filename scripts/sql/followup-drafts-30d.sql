-- followup-drafts-30d.sql
-- Bod 1 zadania foundera 2026-10-15: koľko AI návrhov odpovedí vzniklo,
-- koľko ich maklér schválil a koľko sa reálne odoslalo.
-- Povolené: SELECT. Zakázané: INSERT/UPDATE/DELETE/DDL.
--
-- ČO SA POČÍTA A PREČO PRÁVE TAKTO
--
-- Návrhy nemajú vlastnú tabuľku — `insertAgentDraft`
-- (apps/crm/src/lib/inbound/insert-agent-draft.ts:56) ich zapisuje do
-- `public.activities` a označuje ich v `meta`:
--   meta.draft = true, meta.requires_approval = true, meta.agent_id = <agent>
--
-- Schválenie a odoslanie drží `approve-draft.ts` v tom istom `meta`:
--   meta.approval        – kto a kedy schválil (zapíše sa PRED odoslaním)
--   meta.approval_state  – 'sending' | 'sent' | 'send_failed'
--
-- Preto je „schválený" = existuje kľúč `approval`, a „odoslaný" =
-- `approval_state = 'sent'`. Návrh v stave 'sending' sa nepočíta ako odoslaný:
-- odoslanie ešte nie je potvrdené a tváriť sa inak by nafúklo číslo, ktoré má
-- byť dôkazom.
--
-- Pozor pri čítaní výsledku: `navrhy_30d > 0` ešte neznamená, že schopnosť
-- funguje pre zákazníka. Zákazníkovi sa niečo stane až pri `odoslane_30d > 0`.

SELECT
  count(*) FILTER (WHERE created_at >= now() - interval '30 days')
    AS navrhy_30d,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days'
                     AND meta ? 'approval')
    AS schvalene_30d,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days'
                     AND meta->>'approval_state' = 'sent')
    AS odoslane_30d,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days'
                     AND meta->>'approval_state' = 'send_failed')
    AS zlyhane_30d,
  count(*)                                                        AS navrhy_celkovo,
  count(*) FILTER (WHERE meta->>'approval_state' = 'sent')        AS odoslane_celkovo,
  min(created_at)                                                 AS prvy_navrh,
  max(created_at)                                                 AS posledny_navrh
FROM public.activities
WHERE meta->>'draft' = 'true'
  AND meta->>'requires_approval' = 'true';

-- Rozpad podľa agenta — ukáže, ktorá cesta návrhy naozaj tvorí.
SELECT
  meta->>'agent_id'                                               AS agent,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days') AS navrhy_30d,
  count(*) FILTER (WHERE created_at >= now() - interval '30 days'
                     AND meta->>'approval_state' = 'sent')         AS odoslane_30d,
  max(created_at)                                                  AS posledny_navrh
FROM public.activities
WHERE meta->>'draft' = 'true'
  AND meta->>'requires_approval' = 'true'
GROUP BY 1
ORDER BY posledny_navrh DESC NULLS LAST;
