# API Cost Governor v1 — úzka BUS vrstva

**Dátum:** 2026-10-15  
**Vetva:** `cursor/api-cost-governor-v1-0b41`  
**Základ:** `origin/main` `ce2be49a3093a23d79c2e149d129258cc5b1eafb`  
**Stav k odovzdaniu:** CODE-IMPLEMENTED + TEST-PASS na tejto vetve. Nie MERGED, nie DEPLOYED, nie PRODUCTION-VERIFIED.

Kontrolór: jeden agent robil Architect, Governor, Builder, Verifier aj Red Team za sebou. To nie je nezávislý druhý proces.

## 1. Preflight

| Položka | Dôkaz |
|---|---|
| HEAD pred zmenou | `ce2be49a` `fix(security): SECURITY DEFINER RPC cez service role + balík D (#846)` |
| Vetva | `cursor/api-cost-governor-v1-0b41` založená z `origin/main` |
| Worktree | jediný cudzí necommitnutý strom: `apps/crm/supabase/.branches/` (nechal som ho untracked) |
| Node na tomto VM | `v22.14.0` |
| Count cap | `packages/bus-core/src/execution-cap.ts` je strop počtu behov (100 / 24 h), nie USD |
| Platený CLI spawn | `scripts/bus/consume.ts` `realClaudeExecutor`, pred touto zmenou bez USD brány |
| CRM LLM cesty | `callOpenAI`, Anthropic `messages.create`, embeddings — **mimo tejto vlny** |
| Cenník v CRM | `apps/crm/src/lib/ai/llm-usage-cost.ts` má natvrdo sadzby a neznámy Claude model padá na Sonnet. Nepoužil som ho ako pravdu |
| CHECKOUT-ENV-01 | kód `areSeatCheckoutPricesConfigured()` stále vyžaduje tri seat env kľúče. Posledný live Stripe výpis v repe je `docs/reports/2026-09-22-stripe-verify-prices.md` (0/9). V2 katalóg (`docs/pricing/2026-10-05-stripe-v2-priprava.md`) sám hovorí, že ceny nie sú vytvorené. Dnešný Stripe účet a Vercel env som nečítal |

Merge, deploy, produkčná migrácia, zápis secrets a nákup kreditov nie sú v tomto GO.

## 2. Task Contract a budget

Táto implementácia **nevolala platený model**. Governor sa na ňu preto neaplikuje ako na spawn. Odhad nie je zapísaný ako spotreba.

| Pole | Hodnota |
|---|---|
| task_id | `COST-GOVERNOR-V1` |
| requester | founder |
| purpose | Najmenšia fail-closed USD brána pred plateným BUS spawnom |
| risk | low (žiadny live provider call, žiadny produkčný zápis) |
| provider / model | žiadny |
| estimated_cost_usd | neaplikovateľné — práca je lokálna, odhad sa nezapisuje ako actual |
| actual_cost_usd | `null` (žiadna provider usage odpoveď) |
| max_cost_usd | interný strop úlohy 0,50 USD, ak by sa neskôr spúšťal platený model |
| daily / monthly | interné limity Governoru: **0,50 / 5,00 / 25,00 USD** |
| acceptance | unit testy 1–15, typecheck, CLI bez snapshotu nespustí executor |
| approval_gate | toto GO. Nie je to GO na merge ani na navýšenie limitu |
| rozhodnutie pre platený call | **BLOCK**, kým nie je platný Task Contract a snapshot. Samotná lokálna implementácia kredity neminula |

Bonus 100 USD v Claude Console **nie je** schválený spend target. Limity sú interná politika, nie zostatok u providera.

Defaultný katalóg cien je **prázdny**. Neznámy model → `BLOCK` / `unknown_price`. Snapshot v testoch má nálepku `configured_snapshot_not_vendor_live` a dátum `2026-10-15`. Nie je to živý cenník.

Okná sú **UTC kalendárny deň** (`YYYY-MM-DD`) a **UTC kalendárny mesiac** (`YYYY-MM`). Nie sú to rolujúce 24 h count capu ani polnoc Europe/Bratislava.

## 3. Architektúra a súbory

Governor je pure policy + ledger vedľa `execution-cap.ts`. Nespúšťa druhý runner. `evaluateTask` poradie brán (READ_ONLY, AUTO-SAFE, capability, founder decision) sa nemení. USD kontrola je v `processTask` **po** count cap kontrole a **pred** `counter.record` a pred `executor`.

`BLOCK` / `ESCALATE` / `DOWNGRADE` nespustia executor a nerezervujú hold (DOWNGRADE len vráti návrh lacnejšieho modelu). `ALLOW` / `WARN` zapíšu hold = odhad. `actual_cost_usd` zapíše až `settle` z `run.costUsd`. Chýbajúca suma ostáva `null`, nie `0` a nie kópia odhadu.

CLI `main()` vždy nasadí `buildConsumerCostGate`. `runConsumer` bez `costGate` sa správa ako doteraz, aby existujúce testy so stub executorom nepredstierali cenník. To je vedomá diera: knižničný volajúci musí bránu predať sám.

Ledger CLI je `FileCostLedger` v stavovom adresári consumera (`cost-ledger.json`). Zámok je v jednom procese. Dva OS procesy môžu stratiť update. Po reštarte toho istého súboru spend ostáva.

### Súbory

- `packages/bus-core/src/cost-governor.ts` — politika, in-memory aj file ledger
- `packages/bus-core/tests/cost-governor.test.ts` — prípady 1–15 a red-team
- `packages/bus-core/src/index.ts` — export
- `packages/bus-core/src/consumer.ts` — refusal `cost_governor` (reportable)
- `packages/bus-core/src/execution-cap.ts` — komentár, že count cap nie je USD
- `scripts/bus/consume.ts` — voliteľný `costGate` / `costSettle`; CLI ho vždy zapne
- `scripts/bus/__tests__/consume.test.ts` — prázdny katalóg nespustí executor; settle neodhad neprepíše na actual
- `docs/prompts/agentic/revolis-api-cost-governor-stack-v1.0.md` — meta-prompt

## 4. Testy

Node na VM je `v22.14.0`. Holé `node --test súbor.ts` tu nevie načítať TypeScript.

| Príkaz | Exit | Výsledok |
|---|---|---|
| `npm run bus:test` | **1** | FAIL na tomto Node: `ERR_UNKNOWN_FILE_EXTENSION` `.ts` (auth-identity.test.ts a ďalšie). Nie je to verdikt logiky Governoru |
| `node --experimental-strip-types --test packages/bus-core/tests/cost-governor.test.ts scripts/bus/__tests__/consume.test.ts` | **0** | **53 / 53 PASS**, 0 fail, 0 skipped |
| `NODE_OPTIONS=--experimental-strip-types node --test packages/bus-core/tests/*.test.ts scripts/bus/__tests__/*.test.ts` | **0** | **227 / 227 PASS**, 0 fail, 0 skipped |
| `npx tsc -p packages/bus-core/tsconfig.json --noEmit` | **0** | PASS |
| lint | **SKIPPED** | v root `package.json` nie je lint skript pre bus-core |
| platený live API call | **SKIPPED** | zámerne žiadny |

Bez `NODE_OPTIONS` spadli v plnom behu aj 3 testy `scripts/bus/__tests__/cli.test.ts`, lebo child process spúšťa `cli.ts` bez strip-types. S `NODE_OPTIONS=--experimental-strip-types` prešli. Na novšom Node 22 v CI (`actions/setup-node` `node-version: 22`) môže `npm run bus:test` prejsť aj bez flagu. To som na tomto VM neoveril.

## 5. Ledger — odhad a actual oddelene

Testovací záznam po `ALLOW` a `settle(..., cost_source: "unavailable")`. Čísla sú fixture, nie faktúra.

```json
{
  "estimated_cost_usd": 0.1,
  "hold_usd": 0.1,
  "actual_cost_usd": null,
  "cost_source": "unavailable",
  "overage_usd": null
}
```

Druhý fixture, keď provider vráti inú sumu, než bol odhad:

```json
{
  "estimated_cost_usd": 0.1,
  "hold_usd": 0.1,
  "actual_cost_usd": 0.4,
  "cost_source": "provider_usage",
  "overage_usd": 0.3
}
```

Integrate test consumera so stubom `costUsd: null` zapísal do `cost-ledger.json` `estimated_cost_usd: 0.1`, `actual_cost_usd: null`, `cost_source: "unavailable"`.

Rozpočet medzitým drží `hold`, kým actual chýba. Keď actual príde, počíta sa actual (aj keď je nižší alebo vyšší). `0` od providera by bola skutočná nula. Chýbajúce pole ňou nie je.

## 6. Red team

| Nález | Uzavretie |
|---|---|
| Regex nepustil `billing.charge` (kotva platila len na prvú alternatívu) | opravené; test 13 PASS |
| Veľký, ale ešte legálny odhad vyšiel `WARN`, lebo zostávajúci pomer ≤ 20 % | správanie ponechané; testy prestavené tak, aby `ALLOW` bolo nad prahom |
| `daily > monthly` je neplatný config, nie mesačný strop | test mesačného stropu ide cez deklarovaný zostatok a cez ďalší UTC deň v tom istom mesiaci |
| Parameter properties nejdú na Node 22.14 strip-types | polia sú priradené v tele konštruktora |
| Dva procesy môžu prepis ledger | **otvorené**. Zámok je len v jednom procese |
| CRM `callOpenAI` / Anthropic / embeddings Governor nevidia | **otvorené**. Táto vlna ich zámerne nepokrýva |
| `runConsumer` bez `costGate` executor pustí | **otvorené** pre knižnicu. CLI `main()` bránu nasadzuje vždy |
| In-flight call sa po štarte nedá zrušiť | po páde sa actual nechá `null`, ďalší authorize tej istej úlohy ide na `retry_limit` / `in_flight` a executor sa znova nespustí |
| `GO REQUIRED` + `acked: true` | `ESCALATE`, žiadny hold |
| `STOP`, kill switch, prázdny katalóg, `vendor_live` nálepka, zhodený ledger | `BLOCK` |
| Secret v purpose | do ledgera ide `[redacted]` |
| Samoreview | nie je druhý nezávislý agent |

## 7. Ďalšia úloha

Poradie: business blocker > security > reliability > observability > cost > feature.

Kandidáti z dnešného čítania repa, nie z pamäte ako z produkcie:

1. **CHECKOUT-ENV-01 / predaj** — stále otvorený v kóde aj v dokumentoch. Živý Stripe a Vercel env dnes neoverené. Vybrané.
2. Gmail pull / produkčné secrets — vyžaduje Founder GO a secrets. Nerobiť.
3. CRM cost telemetry a `CREDITS_ENFORCEMENT` — väčší rozsah než táto vlna, produkčná migrácia. Nerobiť.
4. Nová feature — Ústava: nie, kým nejde platba.

Vybraná úloha je read-only rozhodovací balík: `docs/reports/2026-10-15-checkout-env-01-founder-checklist.md`. Žiadne Price ID, žiadny env zápis.

## 8. Acceptance

| Kritérium | Stav |
|---|---|
| ALLOW / WARN / DOWNGRADE / ESCALATE / BLOCK | PASS v unit testoch |
| Fail closed pri neznámej cene, budgete, ledgeri, zlom configu | PASS |
| Odhad ≠ actual | PASS |
| Paralelný double-spend v jednom procese | PASS |
| UTC deň, nie lokálna polnoc | PASS |
| GO REQUIRED prežije ack | PASS |
| STOP a kill switch | PASS |
| CLI bez snapshotu nespustí stub executor | PASS |
| Žiadny live platený call | PASS (žiadny nebol spustený) |
| Všetky CRM call site pokryté | **FAIL ako rozsah** — zámerne nepokryté |
| Merge / deploy / produkčný env | nerobené |

## 9. Riziká a potrebné GO

- CRM a ostatné SDK cesty idú naokolo. Kým nie sú napojené, Governor nie je globálny.
- File ledger nie je bezpečný pre dva paralelné consumer procesy.
- Ceny modelov v defaultnom katalógu nie sú. Kým founder nedoručí **označený** snapshot (dátum, source_label, stropy odhadu), CLI každý platený spawn zablokuje. To je želaný stav.
- Interné limity 0,50 / 5 / 25 sa dajú zmeniť len novým config súborom `REVOLIS_COST_GOVERNOR_CONFIG`. Súbor s nálepkou `vendor_live` sa odmietne.
- `REVOLIS_COST_GOVERNOR_KILL=1` blokuje CLI spawn.
- Ďalší krok predaja je v checkout checkliste. Vyžaduje Foundera.

## 10. Status

**CODE-IMPLEMENTED.** **TEST-PASS** na príkazoch v §4 s exit 0.  
**Nie** DOCS-ONLY. **Nie** MERGED. **Nie** DEPLOYED. **Nie** PRODUCTION-VERIFIED.

Commity na vetve: `12621ae1` (governor) a `4c54cced` (checklist).  
PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/847 — draft, base `main`, stav OPEN v čase zápisu (`gh pr view 847`). CI na tomto PR som nespúšťal a zelený stav netvrdím.
