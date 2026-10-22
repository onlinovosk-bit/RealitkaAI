# Tri vzťahy, ktoré kód číta a doterajšia migrácia nemala

**Stav:** migrácia je súbor v PR. Na PROD sa neaplikuje. Žiadny SELECT na PROD v tomto turne.

## Čo kód volá

| vzťah | kde | v `supabase/migrations` pred týmto PR |
|---|---|---|
| `event_store` | `src/infra/db/eventstore/EventStore.ts` | nie (iné je `public.events`, migrácia `20260425231407`) |
| `outreach_log` | `src/lib/ai/action-executor.ts` insert | nie (`outreach_logs` je iná tabuľka) |
| `team_member_permissions` | `src/app/api/nav/permissions/route.ts` | nie |

Či na PROD naozaj chýbajú: **NEZMERANÉ** v tomto turne (žiadny `to_regclass`). `team_member_permissions` je v `docs/reports/2026-10-05-fail-open-sweep.md` označená ako chýbajúca k 2026-10-05. `public.events` komentár v `log-event.ts` hovorí, že tabuľka existuje a má 0 riadkov — túto migráciu nezakladá znova.

## SECURITY

Člen tímu, ktorému sa riadok oprávnení nedá prečítať, dostáva `UNKNOWN_TEAM_PERMISSIONS` (všetko `false`), nie `DEFAULT_TEAM_PERMISSIONS` (`can_export_contacts: true`). Solo bez `team_license_id` ostáva na default — sú to jeho kontakty. Overené čítaním `route.ts`, nie novým správaním.

Nové tabuľky: RLS zapnuté. `event_store` len `service_role`. `outreach_log` insert/select len ak lead patrí agentúre volajúceho. `team_member_permissions` default stĺpcov je `false`; klient smie čítať len svoj riadok.

## Allowlist

`config/public-schema-allowlist.json` sa nemení. Guard porovnáva allowlist s LIVE schémou; pridať mená pred aplikovaním by CI hlásilo missing.

`apps/crm/scripts/schema-gap-allowlist.json` je iný zoznam: výnimka platí, kým migrácia v repe chýba. Táto migrácia tri tabuľky zakladá, preto sú `event_store`, `outreach_log` a `team_member_permissions` z výnimiek zmazané. Na PROD sa nič neaplikovalo.
