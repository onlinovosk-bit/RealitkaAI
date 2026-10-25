# Taxonómia, rozsah a názvy

Trvalé oblasti. Jedna oblasť nie je jedna úloha ani jeden PR.

Primárny cieľ úlohy rozhoduje. Vedľajšie slovo v texte oblasť nemení. Zmiešaný cieľ ide podľa prevládajúceho cieľa, inak ostane na posúdenie founderovi. Konverzácia má jeden domov. Inde sa na ňu odkáže, nekopíruje sa.

## A. REVOLIS — CORE PRODUCT

Stratégia, roadmapa, architektúra CRM, leady, kontakty, nehnuteľnosti, aktivity, úlohy, pipeline, skóring, matching, BI, požiadavky, spätná väzba.

Repo, ktoré táto oblasť obsluhuje: `apps/crm` a produktové dokumenty v `docs/architecture/`, `docs/discovery/`, `docs/STATUS.md`.

## B. REVOLIS — ENGINEERING & AGENTIC SYSTEMS

Cursor, Claude Code, Grok, prompty, skilly, MCP, orchestrácia, smerovanie modelov, API Cost Governor, benchmarky, inžinierske štandardy.

Spoločné pravidlá ostávajú v [kontrakte](../architecture/cross-agent-engineering-contract.md) a v skilloch. Brief oblasti ich nekopíruje.

## C. REVOLIS — SECURITY & COMPLIANCE

Audity, RLS, privilegované trasy, tajomstvá, read-only audity, náprava, dôkazy.

Cursor projekt s názvom behu **Revolis Security Audits** sa znovupoužíva. Druhý bezpečnostný projekt sa nezakladá.

Bezpečnostný audit patrí sem aj vtedy, keď rozpráva o kóde alebo o integrácii.

## D. REVOLIS — MARKETING & SALES

Pozicionovanie, akvizícia, outbound, demá, onboarding, konverzia, cenník ako predajný text, retencia. Iba kampane Revolis.

Texty pre ľudí idú cez [clay-positioning-reframe.md](../architecture/clay-positioning-reframe.md).

## E. REVOLIS — INTEGRATIONS & OPERATIONS

Integrácie CRM, vonkajšie API, LeadHub tam, kde ide o Revolis, Realvia, monitoring, operácie onboardingu zákazníka.

Osobné údaje a externé zdroje: [master-data-sourcing-map.md](../architecture/master-data-sourcing-map.md). Právny základ sa zapisuje k zdroju. Skill `gdpr-advisor` v `.claude/skills/` v tomto behu nie je (výpis zložky 2026-10-23). Historický [AI_SECURITY.md](../security/AI_SECURITY.md) z 2026-07-20 naň odkazuje; rozhodnutie 2026-10-22 v [memory/decisions.md](../../memory/decisions.md) hovorí, že skill chýba.

## F. REVOLIS — RELEASES & PRODUCTION

Pripravenosť vydania, CI, blokátory, rollback, incidenty, dôkaz po nasadení.

V repe je to **sekcia** (tento súbor a [brief](briefs/f-releases-production.md)). Samostatný Cursor projekt sa nezakladá, kým vznik projektu nepotvrdí nástroj. V tomto behu taký nástroj nebol.

Incident vydania patrí sem. Bezpečnostný audit produkčnej cesty patrí do C.

## G. ONLINOVO — E-COMMERCE

Shoptet, Yodeyma, e-mail a reklama obchodu Onlinovo. Oddelené od Revolis.

Táto oblasť je v taxonómii len ako vylúčenie. Kód Onlinovo, `docs/onlinovo/` a `packages/mcp-onlinovo/` sa z Project OS neupravujú. Existujúce súbory ostávajú na mieste.

## H. BUSINESS ADMINISTRATION & FINANCE

Firemná administratíva, účtovníctvo, mzdy, prognózy. Do briefu nepatria citlivé osobné záležitosti.

V tomto repe oblasť nie je založená. Pozri [stub](briefs/h-business-administration.md).

## I. PERSONAL & GENERAL RESEARCH

Záchytná oblasť, až keď nesedí žiadna predchádzajúca. Nie je odkladisko pre nejasný Revolis úkol. Nejasný Revolis úkol ide na posúdenie, nie sem.

## Názov konverzácie

```text
[PROJECT] — [WORKSTREAM] — [OBJECTIVE]
```

Príklady tvaru, nie existujúce chaty:

- `REVOLIS — AGENTIC SYSTEMS — COST GOVERNOR`
- `REVOLIS — SECURITY — API ROUTE AUDIT`
- `REVOLIS — RELEASES — PRODUCTION VERIFICATION`
- `ONLINOVO — MARKETING — YODEYMA TESTERS`

Premenovanie existujúceho chatu vyžaduje nástroj, ktorý premenovanie potvrdí, a len pre chat, ktorý sa premenovať smie. Tento dokument názvy neaplikuje.

## Pravidlá zaradenia

| Signál primárneho cieľa | Oblasť |
|---|---|
| Bezpečnostný audit, RLS, privilegovaná trasa, tajomstvo, dôkaz nálezu | C |
| Prompt stack, skill, orchestrácia, model routing, Cost Governor | B |
| Akvizícia a predaj Revolis | D |
| Shoptet, Yodeyma, obchod Onlinovo | G |
| Incident vydania, CI, rollback, dôkaz po nasadení | F (sekcia) |
| Leady, CRM objekty, skóring, matching, požiadavka na produkt | A |
| Prevádzka integrácie Revolis (Realvia, Gmail connect, onboarding ops) | E |
| Nič z vyššieho | I, alebo posúdenie |

Zmiešaný názov bez tela konverzácie má istotu `low` a akciu `review`. Istota `high` je len tam, kde je prečítané zadanie alebo je projekt pomenovaný nástrojom a priradením v tom istom behu.
