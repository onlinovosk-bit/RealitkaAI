---
id: ONL-AGENTS-P09
title: ONLINOVO Agentic Revenue OS — P09 Implementation Plan
status: approved scope pre P10 (tento dokument je plán, nie schválenie merge ani nasadenia)
created: 2026-10-02
rau: P09 IMPLEMENTATION-PLAN
depends_on: docs/onlinovo/ONL-AGENTS-P08-AGENT-SPECS.md
---

# ONL-AGENTS-P09 — Implementation Plan

Plán vychádza zo skutočného stavu repozitára (pozri P08 §A). Runner z `docs/prompts/runner/` je kontrakt, nie
bežiaci systém. DAG, vlny a dôkaz disjunktnosti write-setov sú urobené **ručne** podľa vrstiev 03–04.

## Rozhodnutie o rozsahu (REUSE > EXTEND > COMPOSE > BUILD)

| Čo | Voľba | Prečo |
|---|---|---|
| Register agentov | EXTEND `apps/crm/src/lib/agents/agent-specs.ts` | pokyn „nevytváraj druhý register", test stráži drift |
| Register akcií | EXTEND `packages/control-contract/src/actions.ts` | akcia bez záznamu = `FORBIDDEN` |
| Autorita | REUSE `resolveAuthority` cez diferenciálny test | lokálna tabuľka v `mcp-onlinovo` je zrkadlo, nie druhý zdroj pravdy |
| Dátový vstup agentov | BUILD malý `RevenueDataPort` (`fixture`, `unconnected`) | `ShopAdapter` nemá históriu zákazníkov a nesmie sa zovšeobecniť; `LeadHubProvider` neexistuje |
| Tooly | EXTEND `server.ts` o 3 nástroje len na čítanie | rovnaký vzor ako existujúce 4 nástroje |
| LLM | NEZAPOJENÉ | všetky operácie P10 sú deterministické, náklad 0 |

**Čo sa nemení:** `resolve-adapter.ts`, `adapters/*`, `policy.ts`, `write-stub.ts`, `audit.ts`, `denyWrite()`, `WRITE_DISABLED_IN_MVP`,
fail-closed správanie, žiadny HTTP, žiadny LeadHub endpoint, žiadny `.github/**`, žiadna migrácia, žiadny `.ai/**`.

## 1. Implementation DAG

```
T00 baseline
  └─ T01 ACTIONS (control-contract) ──┬─ T02 REGISTRY (apps/crm agent-specs)
                                      └─ T03 FOUNDATION (agents/types,classification,budget,pseudonym,guard)
                                              └─ T04 DATA PORT (agents/data-port, fixture-data)
                                                    ├─ T05 OPPORTUNITY  (agents/opportunity)
                                                    ├─ T06 NEXT-ACTION  (agents/next-action)
                                                    └─ T07 EXPERIMENT   (agents/kpi, allocation, experiment)
                                                          └─ T08 TOOLS (tools/*, server.ts, tools.test.ts, package.json)
                                                                └─ T09 BOUNDARY + DIFFERENTIAL EVALS
                                                                      └─ T10 DOCS / MEMORY / STATUS
```

## 2. Vlny

| Vlna | Úlohy | Paralelizmus |
|---|---|---|
| **Wave 0** | T00 | – |
| **Wave 1** (FOUNDATION) | T01, potom T03 | T01 a T03 majú disjunktné write-sety (`packages/control-contract/**` vs `packages/mcp-onlinovo/src/agents/**`), ale T03 guard-test čítá T01 → sekvenčne |
| **Wave 2** (AGENT CONTRACTS + DATA) | T02, T04 | disjunktné (`apps/crm/src/lib/agents/**` vs `packages/mcp-onlinovo/src/agents/{data-port,fixture-data}*`); T02 závisí od T01, T04 od T03 |
| **Wave 3** (DOMAIN LOGIC) | T05, T06, T07 | párovo disjunktné: `opportunity*`, `next-action*`, `{kpi,allocation,experiment}*` |
| **Wave 4** (TOOLS) | T08 | – |
| **Wave 5** (EVALS) | T09 | – |
| **Wave 6** (DOCS) | T10 | – |

Vlna N+1 nezačne pred dokončením vlny N (lokálne zelené testy). Jeden pracovník = všetko sekvenčne; disjunktnosť je dokázaná pre prípad,
že by sa vlna 3 delila.

## 3. Úlohy

Skratky: **RB** = rollback (vždy `git revert <commit>` alebo zmazanie nových súborov, žiadne dáta sa nemenia), **MT** = mutation test
(sabotuj → test červený → vráť → zelený).

### T00 — Baseline
- **OBJECTIVE:** zdokumentovať zelený východiskový stav pred zmenou.
- **FILES / WRITE TERRITORY:** žiadne.
- **TESTS:** `cd packages/mcp-onlinovo && npm test` (17 testov), `npm run control-contract:test` (62), `tsc` v `mcp-onlinovo`, `vitest` `agent-specs` v `apps/crm` (14).
- **RISK:** `packages/mcp-shared/dist` musí byť zostavený (netrackovaný), `npm install` mení `package-lock.json` (nepatrí do PR).
- **PR:** žiadny.

### T01 — ACTIONS (FOUNDATION)
- **OBJECTIVE:** zaregistrovať ONL akcie (povolené, `BLOCKED`, `DENIED`) v existujúcom registri akcií.
- **FILES:** `packages/control-contract/src/actions.ts` (pridať záznamy na koniec poľa `ENTRIES`), nový `packages/control-contract/tests/onlinovo-actions.test.ts`.
- **WRITE TERRITORY:** `packages/control-contract/**`.
- **DEPENDENCIES:** T00. **INPUTS:** matica akcií z P08 §F. **OUTPUTS:** 13 nových záznamov.
- **API CHANGES:** žiadne (aditívne záznamy). **DATA CHANGES:** žiadne.
- **TESTS:** každá `onlinovo.*` akcia je zaregistrovaná; povolené majú capability OBSERVE/ANALYZE/RECOMMEND, sú vratné a interné; `campaign.*`, `journey.write`, `record.persist`, `price.change`, `customer.permission.change` sú `denied` s dôvodom; `resolveAuthority` vráti `FORBIDDEN` pre každú `denied` aj s kill switchom vypnutým; schválenie (`applyApproval`) `FORBIDDEN` nezmení; nezaregistrovaná `onlinovo.leadhub.contact.upsert` je `FORBIDDEN` (`unregistered_action`).
- **MT:** nastaviť `denied: false` pri `onlinovo.campaign.send` → test červený.
- **RB:** `git revert`. **RISK:** nízke; existujúce testy v `actions.test.ts` (unikátnosť, pasívna capability, odôvodnenie `denied`, externý provider → idempotencia) musia ostať zelené.
- **PR:** commit 1.

### T02 — REGISTRY (AGENT CONTRACTS)
- **OBJECTIVE:** zapísať 3 ONL agentov do existujúceho registra bez druhého registra.
- **FILES:** `apps/crm/src/lib/agents/agent-specs.ts` (typ + 3 záznamy), `apps/crm/src/lib/agents/__tests__/agent-specs.test.ts`.
- **WRITE TERRITORY:** `apps/crm/src/lib/agents/**`. **DEPENDENCIES:** T01.
- **API CHANGES:** typ `AgentSpec` dostane voliteľné `kind?: "customer_facing_send" | "internal_intelligence"` a `domain?: "revolis" | "onlinovo"`; chýbajúce `kind` znamená `customer_facing_send` (existujúci agenti sa nezmenia).
- **TESTS:** existujúcich 14 ostáva; pre `internal_intelligence`: každá povolená akcia je zaregistrovaná, nie `denied`, capability ∈ {OBSERVE, ANALYZE, RECOMMEND}, vratná, neviditeľná navonok; každá zakázaná položka je text; spec obsahuje „send without a human approval"; súbory `code` a `evaluationSuite` existujú; ID unikátne.
- **MT:** zmeniť v ONL spec `allowedActions` na `onlinovo.campaign.send` → test červený.
- **RB:** `git revert`. **RISK:** Revolis CI job `Lint, test, build` beží nad `apps/crm`; zmena je aditívna a test je lokálne overený `vitest`.
- **PR:** commit 2.

### T03 — FOUNDATION (domain primitives + policy)
- **OBJECTIVE:** spoločné čisté primitíva: typy a evidence, klasifikácia operácií, rozpočet, pseudonymizácia, guard.
- **FILES (nové):** `packages/mcp-onlinovo/src/agents/{types,classification,budget,pseudonym,guard}.ts` + `{classification,budget,pseudonym,guard}.test.ts`.
- **WRITE TERRITORY:** `packages/mcp-onlinovo/src/agents/**` (len tieto súbory). **DEPENDENCIES:** T01.
- **INPUTS:** env `ONLINOVO_AGENTS_KILL_SWITCH`, `ONLINOVO_PSEUDONYM_SALT`. **OUTPUTS:** `authorizeAgentAction()` (vrátane `FORBIDDEN`, `APPROVAL_REQUIRED`, `AUTONOMOUS`), `OPERATION_CLASS`, `RunBudget`, `pseudonymizeCustomer()`, `assertNoPii()`, `toLlmSafe()`.
- **API CHANGES:** žiadne verejné MCP. `policy.ts` sa len importuje (`denyWrite`, `WRITE_DISABLED_CODE`).
- **TESTS:** pozri §5 (negatívne testy 1–10 aplikované na guard a primitíva). Diferenciálny test proti `resolveAuthority` je v T09.
- **MT:** guard — odstrániť kontrolu kill switchu → test červený; pseudonym — prijať prázdnu soľ → test červený; klasifikácia — preklasifikovať `revenue_sum` na `LLM-REASONING` → test červený; rozpočet — odstrániť limit → test červený.
- **RB:** zmazať `src/agents/`. **RISK:** stredné (guard je bezpečnostná hranica); preto je každý guard pokrytý sabotážnym testom.
- **PR:** commit 3.

### T04 — DATA PORT
- **OBJECTIVE:** úzky vstupný port pre agentov, oddelený od `ShopAdapter`.
- **FILES (nové):** `agents/data-port.ts`, `agents/fixture-data.ts`, `agents/data-port.test.ts`.
- **WRITE TERRITORY:** rovnaké priečinky ako T03, iné súbory. **DEPENDENCIES:** T03.
- **API CHANGES:** nová premenná `ONLINOVO_INTELLIGENCE_SOURCE` = `fixture` (predvolené) | `unconnected`; čokoľvek iné → `unconnected` + kód `INTELLIGENCE_SOURCE_UNSUPPORTED` (fail-closed). `resolveAdapter()` sa **nemení**.
- **DATA CHANGES:** žiadne. Fixture má len syntetické ID (`FIX-…`), žiadne e-maily.
- **TESTS:** fixture je označený `source: "fixture"`; `unconnected` vracia prázdny snapshot označený; neznáma hodnota → fail-closed; snapshot neobsahuje `@`; fixture nikdy nehlási `source: "shoptet"` ani `"leadhub"`.
- **MT:** nechať port vrátiť `source: "shoptet"` → test červený.
- **RB:** zmazať súbory. **RISK:** nízke.
- **PR:** commit 4.

### T05 — OPPORTUNITY (DOMAIN LOGIC)
- **OBJECTIVE:** deterministická detekcia štyroch typov príležitostí.
- **FILES (nové):** `agents/opportunity.ts`, `agents/opportunity.test.ts`. **WRITE TERRITORY:** len tieto dva. **DEPENDENCIES:** T04.
- **Typy:** `REORDER_WINDOW`, `REACTIVATION_POOL`, `UNPAID_RECOVERY`, `STOCKOUT_LEAK`.
- **OUTPUTS:** `Opportunity` s deterministickým `opportunity_id` (sha256 z typu, rozsahu a hashu snapshotu).
- **TESTS:** reprodukovateľnosť (dvakrát rovnaký výsledok); počty a súčty sú `FACT`; odhad hodnoty je `ESTIMATE` s predpokladmi a bez predpokladov je `null`; zastaraný snapshot (`STALE_SNAPSHOT`); duplicitné vstupy sa nezdvoja; platba nezrealizovaná, ale neskôr uhradená iným objednávaním sa nepočíta; `STOCKOUT_LEAK` sa nevyrobí, keď sklad je `null` (UNKNOWN); príležitosť s akciou voči zákazníkovi nesie `requires_approval: true`, `tier: 3`.
- **MT:** posunúť hranicu okna o deň → test červený; odstrániť kontrolu zastarania → test červený.
- **RB:** zmazať súbory. **RISK:** stredné (obchodné pravidlá sú parametre, nie fakty).
- **PR:** commit 5.

### T06 — NEXT-ACTION
- **OBJECTIVE:** konečný výber akcie z oprávnených kandidátov.
- **FILES (nové):** `agents/next-action.ts`, `agents/next-action.test.ts`. **DEPENDENCIES:** T04.
- **TESTS:** súhlas ≠ `marketing_ok` → `NO_ACTION` (`BLOCKED_CONSENT`); frekvenčný limit; nezaplatená objednávka má prednosť (`NO_ACTION`); každé okno kandidáta (REPLENISHMENT, REACTIVATION, DISCOVERY, CROSS_SELL, BUNDLE); `BUNDLE` bez nákladu → neoprávnený; neplatný alebo e-mailový `customer_ref` → odmietnutie `PII_IN_REF`; neznámy zákazník → `NO_ACTION`; všetky akcie okrem `NO_ACTION` majú `REQUIRES_APPROVAL`; rovnaký vstup dá rovnaký výstup.
- **MT:** obísť kontrolu súhlasu → test červený; vypnúť frekvenčný limit → test červený.
- **RB:** zmazať súbory. **RISK:** stredné. **PR:** commit 6.

### T07 — EXPERIMENT
- **OBJECTIVE:** špecifikácia experimentu, alokácia, KPI a stavový automat.
- **FILES (nové):** `agents/kpi.ts`, `agents/allocation.ts`, `agents/experiment.ts` + `*.test.ts`. **DEPENDENCIES:** T04.
- **TESTS:** alokácia reprodukovateľná a vyvážená (n = 10 000, tolerancia); neexistuje cesta na ručné prepísanie ramena; KPI vzorce vyhodnotené deterministicky; `INDICATIVE` pri malej vzorke a rozhodnutie nikdy `KEEP`; úspech bez prahu → `THRESHOLD_REQUIRED`; zmena primárneho KPI po schválení → `KPI_LOCKED`; neplatný prechod → `INVALID_TRANSITION`; `PROPOSED → APPROVED` bez `approval` → `APPROVAL_REQUIRED`; negatívny výsledok sa zaznamená; stop podmienka → `REJECT`; duplicitné ID.
- **MT:** povoliť `KEEP` pri malej vzorke → test červený; odstrániť zámok KPI → test červený.
- **RB:** zmazať súbory. **RISK:** stredné (aritmetika). **PR:** commit 7.

### T08 — TOOLS
- **OBJECTIVE:** tri MCP nástroje len na čítanie nad agentmi.
- **FILES:** nové `tools/revenue-opportunities.ts`, `tools/customer-next-action.ts`, `tools/experiment-plan.ts`; upravené `server.ts` (registrácia a `switch`), `tools.test.ts` (zoznam nástrojov 4 → 7), `package.json` (pridať nové testy do `test`).
- **WRITE TERRITORY:** `packages/mcp-onlinovo/src/tools/*`, `server.ts`, `tools.test.ts`, `package.json`. **DEPENDENCIES:** T05–T07.
- **API CHANGES:** nové nástroje `onlinovo_revenue_opportunities`, `onlinovo_customer_next_action`, `onlinovo_experiment_plan`. `onlinovo_write_product` ostáva zakázaný stub.
- **TESTS:** `tools/list` obsahuje 7 nástrojov; každý používa `beginAudit`; odpoveď nesie `source`; `onlinovo_write_product` stále `WRITE_DISABLED_IN_MVP`; pokus o nástroj s parametrom `action: "campaign.send"` je odmietnutý (`ACTION_BLOCKED_NO_VERIFIED_CONTRACT`); kill switch zastaví tool; odpoveď neobsahuje `@`.
- **MT:** odstrániť `authorizeAgentAction` z jedného toolu → test červený.
- **RB:** `git revert`. **RISK:** stredné (mení `server.ts`, existujúci test zoznamu nástrojov sa musí upraviť).
- **PR:** commit 8.

### T09 — BOUNDARY a DIFFERENTIAL EVALS
- **OBJECTIVE:** testy, ktoré zhasnú pri pokuse o obídenie hranice.
- **FILES (nové):** `agents/leadhub-boundary.test.ts` (statická kontrola zdrojákov: v `src/agents` a v nových tooloch nie sú `fetch(`, `http://`, `https://`, `leadhub.co`, `XMLHttpRequest`, `child_process`, ani `playwright`/`puppeteer`), `agents/guard-differential.test.ts` (pre každú ONL akciu rovnaký výsledok z lokálneho guardu a z `resolveAuthority`). **DEPENDENCIES:** T08.
- **MT:** vložiť do `opportunity.ts` reťazec `fetch(` → hranica červená; zmeniť `denied` v T01 → diferenciálny test červený.
- **RB:** zmazať testy. **PR:** commit 9.

### T10 — DOCS, MEMORY, STATUS
- **FILES:** `docs/onlinovo/ONL-AGENTS-P08-AGENT-SPECS.md`, `ONL-AGENTS-P09-IMPLEMENTATION-PLAN.md`, `memory/decisions.md`, `memory/session-summary.md` (**PREPEND**), `docs/STATUS.md`.
- **DEPENDENCIES:** T09. **PR:** commit 10. Zápis do pamäte je **jeden** na konci (pracovná dohoda).

## 4. Vlastníctvo súborov (write territory) a dôkaz disjunktnosti

| Úloha | Územie |
|---|---|
| T01 | `packages/control-contract/src/actions.ts`, `packages/control-contract/tests/onlinovo-actions.test.ts` |
| T02 | `apps/crm/src/lib/agents/agent-specs.ts`, `apps/crm/src/lib/agents/__tests__/agent-specs.test.ts` |
| T03 | `packages/mcp-onlinovo/src/agents/{types,classification,budget,pseudonym,guard}.ts` + testy |
| T04 | `packages/mcp-onlinovo/src/agents/{data-port,fixture-data}.ts` + test |
| T05 | `packages/mcp-onlinovo/src/agents/opportunity{,.test}.ts` |
| T06 | `packages/mcp-onlinovo/src/agents/next-action{,.test}.ts` |
| T07 | `packages/mcp-onlinovo/src/agents/{kpi,allocation,experiment}{,.test}.ts` |
| T08 | `packages/mcp-onlinovo/src/tools/{revenue-opportunities,customer-next-action,experiment-plan}.ts`, `server.ts`, `tools.test.ts`, `package.json` |
| T09 | `packages/mcp-onlinovo/src/agents/{leadhub-boundary,guard-differential}.test.ts` |
| T10 | `docs/**`, `memory/**` |

Žiadne dve cesty sa nekryjú. Pre celé zadanie neexistuje cesta pod `.github/**`, migráciami, `.ai/**`, cenami, auth ani billingom (denylist `docs/AUTOMERGE-POLICY.md`). Ak by sa takáto cesta objavila, úloha sa **zastaví** a odovzdá founderovi.

## 5. Povinné negatívne testy (mapovanie na zadanie)

| # | Požiadavka | Kde |
|---|---|---|
| 1 | agent skúsi zakázanú akciu | T03 guard, T08 tooly |
| 2 | chýbajúce povolenie | T03 (`agentId` nemá akciu v povolenom zozname) |
| 3 | chýbajúce dáta | T05, T06 (`UNKNOWN`) |
| 4 | neplatný stav | T06, T07 |
| 5 | duplicitná požiadavka | T05 (`opportunity_id`), T07 (`DUPLICATE_EXPERIMENT`) |
| 6 | zastaraný stav | T05, T06 |
| 7 | nepodporovaná schopnosť | T03 guard (`CAPABILITY_UNSUPPORTED`) |
| 8 | akcia voči zákazníkovi bez schválenia | T03, T06, T07 |
| 9 | neznámy kontrakt API | T01, T09 |
| 10 | nadmerná cena alebo retry | T03 `RunBudget` |

## 6. Rollback a PR stratégia

- **Rollback celku:** `git revert` jednotlivých commitov v opačnom poradí (T10 → T01). Nič sa nenasadzuje, nič sa nezapisuje do produkčných dát, nepoužíva sa žiadny secret.
- **Obmedzenie relácie:** push je povolený iba na vetvu `claude/leaddhub-connector-capabilities-mgbuhe`. Preto je jedna **draft PR** zložená z 10 samostatných commitov, ktoré zodpovedajú úlohám. Ak chce founder pravidlo „jedna zmena = jeden PR", commity sa dajú cherry-pickom rozdeliť. Merge robí founder, agent nemerguje.

## 7. Presné príkazy

```bash
npm install --workspace=@revolis/mcp-onlinovo --workspace=@revolis/mcp-shared --include-workspace-root --no-audit --no-fund
npm run build --workspace=@revolis/mcp-shared                      # dist je netrackovaný
(cd packages/mcp-onlinovo && npm test)                            # tsx --test, rozšírené v T08
npx tsc -p packages/mcp-onlinovo/tsconfig.json --noEmit
npm run control-contract:test && npm run control-contract:typecheck
npm install --workspace=apps/crm --include-workspace-root --no-audit --no-fund
(cd apps/crm && npx vitest run src/lib/agents/__tests__/agent-specs.test.ts)
./scripts/ci/prepush-gate.sh                                      # pred pushom
git checkout package-lock.json                                    # lock sa do PR nedostane
```

## 8. STOP podmienky

1. Úloha by zasiahla cestu z denylistu (`.github/**`, migrácie, `.ai/**`, ceny, auth, billing). → zastav, odovzdaj founderovi.
2. Je potrebný LeadHub endpoint alebo tvar požiadavky, ktorý nie je overený. → `UNKNOWN / BLOCKED`, bez vymysleného koncového bodu.
3. Test, ktorý má zhasnúť pri sabotáži, **nezhasne**. → guard nie je dokázaný, zastav a oprav.
4. Existujúci test v `control-contract` alebo `agent-specs` zhasne kvôli zmene a oprava by vyžadovala oslabiť jeho tvrdenie. → zastav.
5. Zmena by vyžadovala upraviť `resolveAdapter()`, `denyWrite()` alebo `write-stub`. → zastav.
6. Typecheck ratchet by stúpol alebo build zlyhá. → zastav.
7. Vyskytne sa PII (e-mail, telefón) vo výstupe, fixture alebo logu. → zastav.
