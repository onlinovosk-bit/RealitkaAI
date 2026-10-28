# E — REVOLIS INTEGRATIONS & OPERATIONS

Misia: integrácie Revolis CRM, vonkajšie API, Realvia, monitoring a operácie onboardingu. LeadHub v tomto repe vystupuje v dokumentoch Onlinovo; do Revolis operácií ho neťahám a súbory v `docs/onlinovo/` nemeníme.

## Aktuálny stav z tohto behu

- [memory/integrations.md](../../../memory/integrations.md) má hlavičku „Posledná aktualizácia: 2026-05-22". Je to historický stav Realvia exportu. Webhook a worker cesty v ňom uvedené som v tomto behu nevolal. Identifikátory a mená z toho súboru sem nekopírujem.
- STATUS.md 2026-10-07 (REALVIA-SEC-01) je novší bezpečnostný záznam k Realvia hlavičkám a diagnostike. Operatívny stav z mája 2026 ním nie je automaticky zrušený ani potvrdený. Treba čítať oba súbory.
- Gmail: rozhodnutie 2026-10-05 a riadok v STATUS.md hovoria, že kód pripojenia je hotový a neaktivovaný (čeká na Google client a súhlas). GDPR text: [inbound-gmail-pull-gdpr.md](../../architecture/inbound-gmail-pull-gdpr.md). Aktiváciu som neskúšal.
- Discovery integrácií: [docs/discovery/2026-10-21/INTEGRATIONS.md](../../discovery/2026-10-21/INTEGRATIONS.md) existuje. Počet ciest uvádzaný v rozhodnutí (24) som znova nepočítal.
- Onboarding runbook v strome CRM: `apps/crm/docs/ONBOARDING-2ND-CUSTOMER-RUNBOOK.md` je vo výpise. Nečítal som ho.

## Rozhodnutia

| Zápis | Cesta |
|---|---|
| 2026-10-05 GMAIL-CONNECT, kód hotový, neaktivované | [memory/decisions.md](../../../memory/decisions.md) |
| 2026-10-19 REALVIA-PRICINY (v hlavičke decisions, draft v čase zápisu) | ten istý súbor. Telo tohto rozhodnutia som v tomto behu nečítal, len hlavičku v prvej dvadsiatke. |

## Aktívne línie

Aktivácia Gmailu a re-test Realvie sú v starších súboroch otvorené. Tento brief ich neposúva.

## Zdroje

- [docs/REALVIA_ONBOARDING.md](../../REALVIA_ONBOARDING.md)
- [master-data-sourcing-map.md](../../architecture/master-data-sourcing-map.md)
- [docs/discovery/2026-10-21/INTEGRATIONS.md](../../discovery/2026-10-21/INTEGRATIONS.md)

## Blokátory

Kľúče a súhlas majiteľa schránky pre Gmail sú v rozhodnutí podmienkou aktivácie. LeadHub kontrakt pre Onlinovo je v STATUS sekcii ONLINOVO označený ako UNKNOWN. To nie je Revolis CRM integrácia na implementáciu v tejto úlohe.

## Ďalší krok

Pred ďalšou integračnou zmenou prečítať aktuálny zdroj v data-sourcing mape a oddeliť májový `integrations.md` od novšieho STATUS.

## Hranice

Žiadne tajomstvá, žiadne kopírovanie payloadov zákazníka, žiadny zápis do cudzieho API bez GO. `docs/onlinovo/` a `packages/mcp-onlinovo/` sa nemenia.
