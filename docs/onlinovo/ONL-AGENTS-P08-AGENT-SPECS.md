---
id: ONL-AGENTS-P08
title: ONLINOVO Agentic Revenue OS — P08 Agent Specification (3 roly)
status: proposal (spec first; kód je až P10 a len v rozsahu schválenom v P09)
created: 2026-10-02
rau: P08 AGENT-SPEC
depends_on: docs/onlinovo/ONL-MCP-002-IMPLEMENTATION.md, packages/control-contract, apps/crm/src/lib/agents/agent-specs.ts
---

# ONL-AGENTS-P08 — Agent Specification

> Spec je nadradený kódu aj promptu. Nič v tomto dokumente nie je schválenie na odoslanie
> kampane, zápis do LeadHub, zmenu ceny ani nasadenie. Tento PR nič nemerguje a nič nenasadzuje.

## A. Zistená architektúra (skontrolované v kóde, nie z dokumentácie)

| Zistenie | Dôkaz |
|---|---|
| ONLINOVO MCP je stdio server so 4 nástrojmi (`onlinovo_health`, `_stock_low`, `_orders_open`, `_write_product`). **Žiadny HTTP transport a žiadna HTTP autentifikácia neexistuje.** | `packages/mcp-onlinovo/src/server.ts` (len `StdioServerTransport`); `ONL-MCP-002` §1 „Mimo MVP: Streamable HTTP" |
| `ShopAdapter` má tri implementácie: `fixture`, `unconnected`, `shoptet`; `resolveAdapter()` číta `ONLINOVO_SHOP_ADAPTER`. Shoptet adaptér má len `health()`, `stockLow()`/`ordersOpen()` hádžu `SHOP_MAPPING_BLOCKED`. | `src/adapters/*.ts`, `src/resolve-adapter.ts` |
| Governance: `denyWrite()` + kód `WRITE_DISABLED_IN_MVP`, `write-stub`, audit na stderr bez tokenov a bez PII (`beginAudit`). | `src/policy.ts`, `src/tools/write-stub.ts`, `src/audit.ts` |
| **`LeadHubProvider` v kóde neexistuje.** LeadHub je v dokumentácii „NEZNÁME existencia v tomto clone" a „mimo MVP". Zmienka o P1 (`upsertContact`, `addTag`, …) je smer od foundera, nie implementácia. | grep `LeadHub|leadhub` → len `docs/onlinovo/ONL-MCP-FEASIBILITY.md`, `ONL-MCP-002-IMPLEMENTATION.md`, `docs/rau/routing-rules.json` |
| Control Contract: cyklus OBSERVE→DECIDE→AUTHORIZE→ACT→REPORT→LEARN, `ACTION_REGISTRY`, `resolveAuthority` (čistá funkcia), kill switch, `DENY_LIST`. **Trvalé schvaľovanie (CP-P0-2) neexistuje**: akcia vyžadujúca schválenie sa uzavrie ako `unknown{too_early}`. | `packages/control-contract/README.md`, `src/authority.ts`, `src/policy.ts` |
| CI: `control-contract` má vlastný job. **`packages/mcp-onlinovo` nemá v `.github/workflows` žiadny job**, jeho testy bežia len lokálne. | `grep mcp-onlinovo .github/workflows` → 0 zásahov |
| Repozitár `onlinovosk-bit/onlinovo` pod týmto kontom neexistuje alebo k nemu nie je prístup (`list_repos`: 7 repozitárov, žiadny `onlinovo`). Kód ONLINOVO MCP je v `onlinovosk-bit/RealitkaAI`, `packages/mcp-onlinovo`. | `list_repos`, `add_repo` → „not found / no access" |

## B. Existujúci register (a prečo sa nevytvára druhý)

- **Register agentov:** `apps/crm/src/lib/agents/agent-specs.ts` (`AGENT_SPECS`, typ `AgentSpec`), stráži ho `__tests__/agent-specs.test.ts`. Dnes 4 agenti Revolisu, všetci „draft → človek schváli → odoslanie". Test dnes vyžaduje, aby **každá** povolená akcia bola nevratná a externe viditeľná, a aby `promptVersion` končil `-vN`. Tri ONL agenti sú **interné, nevysielajúce a deterministické**, preto sa typ rozšíri o voliteľné polia (`kind`, `domain`) a test dostane vetvu pre `internal_intelligence`. Existujúci agenti sa nemenia.
- **Register akcií:** `packages/control-contract/src/actions.ts` (`ACTION_REGISTRY`). Akcia bez záznamu sa nedá autorizovať (fail-closed). ONL akcie sa pridávajú sem, nie do vlastnej tabuľky. Lokálna tabuľka v `mcp-onlinovo` je len zrkadlo overené diferenciálnym testom proti `resolveAuthority`.
- **Rozhodnutie o kolízii s pravidlom „nevytváraj druhý register":** REUSE > EXTEND. Rozšírenie typu je aditívne a vyžaduje zmenu testu v `apps/crm` (Revolis kód). To je kompromis; alternatíva (samostatný register v `mcp-onlinovo`) by porušila priamy pokyn.

## Spoločné pravidlá pre všetky tri roly

1. Agent nie je autorita: nerozširuje vlastné oprávnenia, nemení governance, nevypína bezpečnostné prvky.
2. Deterministicky najprv. Každá operácia je klasifikovaná ako `PTC`, `RULE`, `API`, `SQL`, `FUNCTION` alebo `LLM-REASONING`. **V P10 sa nezapája žiadny LLM** (náklad 0). Klasifikácia `LLM-REASONING` je v špecifikácii len pre úlohy, kde determinizmus nestačí.
3. LLM nikdy nepočíta: počty zákazníkov, dátumy, RFM, tržby, maržu, oprávnenosť, frekvenčné limity, prahy, aritmetiku experimentov ani KPI.
4. Každý fakt má druh: `FACT` (z dát), `ESTIMATE` (vypočítaný z explicitných predpokladov), `ASSUMPTION` (vstup od foundera), `INFERENCE` (odvodenie). Inference sa nikdy ticho nestane faktom.
5. Chýbajúci údaj je `UNKNOWN`, nikdy vymyslená hodnota. Nepodporovaná schopnosť je `BLOCKED`.
6. Kill switch: premenná `ONLINOVO_AGENTS_KILL_SWITCH` (fail-closed: zapnutý pri akejkoľvek hodnote okrem explicitne vypnutej `0`, `false`, `off`, `no`, `disabled` alebo prázdnej) zablokuje všetky akcie okrem čistého čítania stavu.
7. Identita zákazníka je pseudonymná (`customer_ref`). Surový e-mail ani telefón nesmú ísť do výstupu ani do (budúceho) LLM payloadu.

## C. AGENT SPEC — ONL-REVENUE-OPPORTUNITY

| Pole | Hodnota |
|---|---|
| **AGENT-ID** | `ONL-REVENUE-OPPORTUNITY` |
| **VERSION** | `0.1.0` |
| **MISSION** | Zisťovať dôkazmi podložené obchodné príležitosti v existujúcich dátach zákazníkov, objednávok a produktov a vyrábať ohraničený, auditovateľný objekt príležitosti pre človeka alebo následný workflow. Nikdy nespúšťa kampaň. |
| **INPUTS** | `RevenueSnapshot` z `RevenueDataPort` (`fixture` alebo `unconnected`): objednávky a riadky, produkty (cenníková cena, jednotkový náklad alebo `null`, sklad alebo `null`), zákazníci (pseudonymné `customer_ref`, súhlas), predchádzajúce zásahy. Explicitné `assumptions` (označené). **Nedostupné:** živé marže, výsledky LeadHub kampaní, živý Shoptet (mapovanie je `BLOCKED`). |
| **OUTPUTS** | `Opportunity[]`: `opportunity_id, type, segment_or_scope, evidence, estimated_value, confidence, recommended_next_action, constraints, expires_at` plus `source`, `as_of`, `data_quality`. |
| **TOOLS** | MCP nástroj `onlinovo_revenue_opportunities` (len čítanie). Interné čisté funkcie. Žiadny sieťový nástroj. |
| **ALLOWED ACTIONS** | `onlinovo.data.observe` (T0), `onlinovo.opportunity.analyze` (T0), `onlinovo.opportunity.recommend` (T1) |
| **FORBIDDEN ACTIONS** | odoslať alebo naplánovať kampaň; upraviť kampaň alebo journey; zmeniť ceny; zmeniť súhlasy zákazníkov; rozšíriť vlastný rozsah; vymýšľať dáta; použiť nepodporovaný LeadHub endpoint; považovať inferenciu za fakt; odoslať bez schválenia človekom. V registri: `onlinovo.campaign.*`, `onlinovo.journey.write`, `onlinovo.record.persist`, `onlinovo.price.change`, `onlinovo.customer.permission.change` (všetky `denied`). |
| **DECISION RIGHTS** | Môže klasifikovať a zoradiť príležitosti deterministicky (stredná hodnota odhadu, remíza podľa `opportunity_id`). **Nemôže** schváliť externú akciu voči zákazníkovi. |
| **ACTION TIER** | Čítanie = T0. Interný vratný záznam = T1 (zápis je v P10 `BLOCKED`: žiadna overená cesta). Akcia voči zákazníkovi = T3 a vyžaduje schválenie (dnes aj tak `BLOCKED`). |
| **MEMORY POLICY** | Bezstavový. Nič nezapisuje. História zásahov prichádza ako vstup (fakt zo zdroja), nie ako pamäť agenta. |
| **APPROVAL POLICY** | Odporúčanie, ktoré navrhuje akciu voči zákazníkovi, nesie `requires_approval: true` a `tier: 3`. Trvalé schvaľovanie neexistuje (CP-P0-2), preto sa takáto akcia nevykoná. |
| **FAILURE POLICY** | Fail-closed: zastaraný snapshot (`STALE_SNAPSHOT`), nepripojený zdroj (`source: unconnected`, prázdny výstup), neplatný vstup (`INVALID_INPUT`), prekročený rozpočet (`BUDGET_EXCEEDED`), kill switch (`KILL_SWITCH`). Nikdy nevracia odhad bez označenia. |
| **ESCALATION CONDITIONS** | zdroj `unconnected` pri požiadavke na živé dáta; chýbajúce náklady pri požiadavke na maržu (`UNKNOWN`); `confidence: low`; príležitosť by vyžadovala akciu T3; nezrovnalosť medzi dvoma datasetmi. |
| **COST LIMIT** | LLM volania 0, tokeny 0, externé API volania 0. Výpočet ≤ 50 000 riadkov objednávok na beh (prekročenie = `BUDGET_EXCEEDED`). |
| **TIME LIMIT** | Čas behu sa meria v audite (`latency_ms`). Pevný limit času **NEMERANÉ** (žiadny runtime plánovač). Limit riadkov je vynútený. |
| **SUCCESS CRITERIA** | Reprodukovateľné: rovnaký snapshot a parametre dajú rovnaké `opportunity_id` aj hodnoty. Každé číslo je `FACT` alebo označený `ESTIMATE` s predpokladmi. Žiadna príležitosť bez dôkazu. |
| **EVAL SUITE** | `agents/opportunity.test.ts` (žiaduce správanie, zakázané správanie, duplicita, zastaraný stav, chýbajúce dáta, nepripojený zdroj), `agents/guard.test.ts`, `agents/budget.test.ts`, `agents/leadhub-boundary.test.ts` |
| **HANDOFF FORMAT** | TASK · STATUS · CHANGES · EVIDENCE · TESTS · CHECKS NOT RUN · RISKS · BLOCKERS · NEXT ACTION |

**Klasifikácia operácií:** počty a súčty = `FUNCTION`; okná dní = `RULE`; zoradenie = `FUNCTION`; zistenie `STOCKOUT` = `RULE`; výber vysvetlenia pre človeka = `LLM-REASONING` (v P10 nezapojené).

## D. AGENT SPEC — ONL-CUSTOMER-NEXT-ACTION

| Pole | Hodnota |
|---|---|
| **AGENT-ID** | `ONL-CUSTOMER-NEXT-ACTION` |
| **VERSION** | `0.1.0` |
| **MISSION** | Pre jedného zákazníka určiť oprávnenú akciu s najvyššou hodnotou z konečnej množiny schválených akcií. |
| **INPUTS** | `customer_ref` (pseudonym), stav zákazníka, história objednávok a produktov, predchádzajúce zásahy, stav životného cyklu, pravidlá oprávnenosti (`RuleSet` s predvolenými prahmi označenými `ASSUMPTION`). |
| **OUTPUTS** | `{ customer_ref, action, evidence, confidence, expires_at, policy_status }`, kde `action ∈ {NO_ACTION, REPLENISHMENT, CROSS_SELL, BUNDLE, REACTIVATION, DISCOVERY}`. |
| **TOOLS** | MCP nástroj `onlinovo_customer_next_action` (len čítanie). |
| **ALLOWED ACTIONS** | `onlinovo.data.observe` (T0), `onlinovo.nextaction.recommend` (T1) |
| **FORBIDDEN ACTIONS** | vymýšľať fakty o zákazníkovi; obísť oprávnenosť; kontaktovať zákazníka priamo; odoslať e-mail; meniť dáta zákazníka mimo schválených akcií; posielať surový e-mail či telefón LLM-ke; prepísať politiku. V registri: `onlinovo.campaign.send` a ostatné `denied`. |
| **DECISION RIGHTS** | Z už oprávnených kandidátov vyberá deterministicky podľa priority pravidla. Kontextové zoradenie LLM-kou je **v špecifikácii povolené len medzi oprávnenými kandidátmi** a v P10 nie je zapojené. Nemôže pridať kandidáta ani zmeniť oprávnenosť. |
| **ACTION TIER** | T0 čítanie, T1 odporúčanie. Samotné vykonanie akcie voči zákazníkovi = T3 a mimo rozsahu. |
| **MEMORY POLICY** | Bezstavový. Pamäť experimentov a zásahov je len vstup. Odvodená informácia je označená `INFERENCE`. |
| **APPROVAL POLICY** | Výstup je odporúčanie. Každá akcia okrem `NO_ACTION` je v `policy_status` označená `REQUIRES_APPROVAL` a nič nespúšťa. |
| **FAILURE POLICY** | Chýbajúci zákazník alebo neplatný `customer_ref` → `NO_ACTION` s `policy_status: BLOCKED_INVALID_STATE`. Nejasný súhlas → `NO_ACTION` (`BLOCKED_CONSENT`). Zastaraný snapshot → `NO_ACTION` (`BLOCKED_STALE`). Referencia vyzerajúca ako e-mail alebo telefón → odmietnutie (`PII_IN_REF`). |
| **ESCALATION CONDITIONS** | konflikt medzi pravidlami; `confidence: low`; chýbajúce náklady pre `BUNDLE`; akcia by vyžadovala kontakt s zákazníkom. |
| **COST LIMIT** | LLM 0, externé volania 0; jedna požiadavka = jeden zákazník. |
| **TIME LIMIT** | Meria sa v audite; pevný limit **NEMERANÉ**. |
| **SUCCESS CRITERIA** | Deterministický: rovnaký vstup dá rovnaký výstup; každý výber má pravidlo a dôkaz; frekvenčný limit a súhlas sa nikdy neobídu. |
| **EVAL SUITE** | `agents/next-action.test.ts`, `agents/pseudonym.test.ts`, `agents/guard.test.ts` |
| **HANDOFF FORMAT** | TASK · STATUS · CHANGES · EVIDENCE · TESTS · CHECKS NOT RUN · RISKS · BLOCKERS · NEXT ACTION |

**Klasifikácia operácií:** dni od objednávky, RFM hodnoty, oprávnenosť, frekvenčný limit, generovanie kandidátov = `RULE`/`FUNCTION`; výber z oprávnených kandidátov = `RULE` (a voliteľne `LLM-REASONING`, nezapojené).

## E. AGENT SPEC — ONL-EXPERIMENT

| Pole | Hodnota |
|---|---|
| **AGENT-ID** | `ONL-EXPERIMENT` |
| **VERSION** | `0.1.0` |
| **MISSION** | Premeniť overené obchodné hypotézy na merateľné ohraničené experimenty a učiť sa z výsledkov. |
| **INPUTS** | príležitosť (`Opportunity`), hypotéza, oprávnená skupina (počet), schválená ponuka alebo akcia, **vopred definovaný** KPI (`KpiDefinition`), história experimentov (vstup). |
| **OUTPUTS** | Špecifikácia experimentu: `experiment_id, hypothesis, control, treatment, audience, primary_metric, secondary_metrics, success_threshold, stop_conditions, allocation, duration, result, decision`. |
| **TOOLS** | MCP nástroj `onlinovo_experiment_plan` (len čítanie, vracia `PROPOSED`). |
| **ALLOWED ACTIONS** | `onlinovo.experiment.propose` (T1), `onlinovo.experiment.evaluate` (T0) |
| **FORBIDDEN ACTIONS** | zmeniť primárny KPI po zobrazení výsledkov; vyhlásiť úspech bez vopred určeného prahu; manipulovať alokáciu vzorky; spustiť kampaň bez schválenia; rozšíriť rozsah; skryť negatívny výsledok; tvrdiť štatistickú istotu pri nedostatočnej vzorke. |
| **DECISION RIGHTS** | Navrhuje experiment (`PROPOSED`). Stav `APPROVED` smie nastaviť len človek. `KEEP`, `REJECT`, `ITERATE`, `BLOCKED` počíta deterministická funkcia z vopred určených pravidiel. |
| **ACTION TIER** | T0 vyhodnotenie, T1 návrh. Spustenie experimentu voči zákazníkom = T3, mimo rozsahu. |
| **MEMORY POLICY** | Bezstavový v P10. Stavový automat je čistá funkcia; trvalé uloženie je `BLOCKED` (žiadna overená cesta zápisu). |
| **APPROVAL POLICY** | `PROPOSED → APPROVED` len s `approval` objektom od človeka. Bez neho prechod padne (`APPROVAL_REQUIRED`). |
| **FAILURE POLICY** | Neplatný prechod stavu → chyba `INVALID_TRANSITION`. Zmena primárneho KPI po schválení → `KPI_LOCKED`. Duplicitné `experiment_id` → `DUPLICATE_EXPERIMENT`. Chýbajúci prah → `THRESHOLD_REQUIRED`. Malá vzorka → trieda `INDICATIVE`. |
| **ESCALATION CONDITIONS** | porušená stop podmienka; nevyvážené ramená (rozdiel nad 10 %); chýbajúci KPI vstup; výsledok `INDICATIVE` pri požiadavke na rozhodnutie. |
| **COST LIMIT** | LLM 0, externé volania 0. |
| **TIME LIMIT** | Trvanie experimentu je parameter špecifikácie (`duration_days`). Beh funkcie sa meria v audite. |
| **SUCCESS CRITERIA** | Experiment má predpísaný KPI, prah, stop podmienky a alokáciu pred štartom; výsledok je vždy zaznamenaný vrátane negatívneho; `INDICATIVE` sa nikdy nevydáva za istotu. |
| **EVAL SUITE** | `agents/experiment.test.ts`, `agents/kpi.test.ts`, `agents/allocation.test.ts`, `agents/guard.test.ts` |
| **HANDOFF FORMAT** | TASK · STATUS · CHANGES · EVIDENCE · TESTS · CHECKS NOT RUN · RISKS · BLOCKERS · NEXT ACTION |

**Klasifikácia operácií:** alokácia (hash) = `FUNCTION`; KPI a rozdiely = `FUNCTION`; klasifikácia vzorky = `RULE`; stavový automat = `RULE`; interpretácia výsledku pre človeka = `LLM-REASONING` (nezapojené).

## F. Spoločná matica akcií a tierov

Zdroj pravdy je `packages/control-contract/src/actions.ts`. Autorita sa počíta z `resolveAuthority`.

| Akcia | Capability | Tier | Vratná | Externe viditeľná | Stav |
|---|---|---|---|---|---|
| `onlinovo.data.observe` | OBSERVE | 0 | áno | nie | povolená, `AUTONOMOUS` |
| `onlinovo.opportunity.analyze` | ANALYZE | 0 | áno | nie | povolená, `AUTONOMOUS` |
| `onlinovo.experiment.evaluate` | ANALYZE | 0 | áno | nie | povolená, `AUTONOMOUS` |
| `onlinovo.opportunity.recommend` | RECOMMEND | 1 | áno | nie | povolená, `AUTONOMOUS` pri istote ≥ 0,6, inak `APPROVAL_REQUIRED` |
| `onlinovo.nextaction.recommend` | RECOMMEND | 1 | áno | nie | rovnako |
| `onlinovo.experiment.propose` | RECOMMEND | 1 | áno | nie | rovnako |
| `onlinovo.record.persist` | EXECUTE | 1 | áno | nie | **BLOCKED** (žiadna overená cesta zápisu) |
| `onlinovo.campaign.send` | EXECUTE | 3 | nie | áno | **BLOCKED** (kontrakt LeadHub neoverený) |
| `onlinovo.campaign.schedule` | EXECUTE | 3 | nie | áno | **BLOCKED** |
| `onlinovo.campaign.update` | EXECUTE | 3 | nie | áno | **BLOCKED** |
| `onlinovo.journey.write` | EXECUTE | 3 | nie | áno | **BLOCKED** |
| `onlinovo.price.change` | EXECUTE | 3 | nie | áno | **DENIED** (rozhodnutie majiteľa) |
| `onlinovo.customer.permission.change` | EXECUTE | 3 | nie | áno | **DENIED** |

Schopnosti P1 LeadHub (`contact.upsert`, `contact.tag`, `contact.variable`, `order.import`, `event.import`) **nie sú registrované**. Neregistrovaná akcia je pre `resolveAuthority` `FORBIDDEN` (fail-closed), kým `LeadHubProvider` a overený kontrakt neexistujú.

## G. Spoločná matica schvaľovania

| Tier | Kto schvaľuje | Mechanizmus dnes | Dôsledok dnes |
|---|---|---|---|
| 0 | nikto | `AUTONOMOUS` | beží |
| 1 | nikto pri istote ≥ 0,6, inak človek | `resolveAuthority` | beží alebo sa uzavrie ako `unknown{too_early}` |
| 3 | človek (founder) | trvalé schvaľovanie **neexistuje** (CP-P0-2) | akcia je `BLOCKED`, agent vráti len pripravený návrh |

## H. Spoločná pamäťová politika

Bezstavové. Nič sa nezapisuje. `memory/` repozitára nepíše agent, píše ho človek v rámci zápisu session. Odvodenia sú `INFERENCE`. Trvalé uloženie príležitostí a experimentov čaká na overenú cestu zápisu a samostatný P09.

## I. Spoločná politika zlyhania a eskalácie

| Situácia | Kód | Správanie | Eskalácia |
|---|---|---|---|
| zdroj nepripojený | `source: unconnected` | prázdny výstup, označený | nie je chyba |
| zastaraný snapshot | `STALE_SNAPSHOT` | žiadne príležitosti | áno |
| nepodporovaná schopnosť | `CAPABILITY_UNSUPPORTED` | odmietnutie | áno |
| akcia bez schválenia | `APPROVAL_REQUIRED` | nič sa nevykoná | áno |
| neznámy kontrakt API | `ACTION_BLOCKED_NO_VERIFIED_CONTRACT` | odmietnutie | áno (UNKNOWN) |
| prekročený rozpočet | `BUDGET_EXCEEDED` | stop, žiadny čiastočný výsledok | áno |
| kill switch | `KILL_SWITCH` | stop | áno |
| duplicitná požiadavka | rovnaké `opportunity_id` | zlúčené, nie zdvojené | nie |

## J. Matica evalov

Každý riadok je test; zakázané správanie sa testuje rovnako dôsledne ako žiaduce. Pre každý guard existuje aj sabotážny test (mutation proof v P10).

| Test | R-OPP | NEXT | EXP |
|---|---|---|---|
| žiaduce správanie na fixture | áno | áno | áno |
| zakázaná akcia sa odmietne | áno | áno | áno |
| chýbajúce povolenie | áno | áno | áno |
| chýbajúce dáta (`UNKNOWN`, nie vymyslené) | áno | áno | áno |
| neplatný stav | áno | áno | áno |
| duplicitná požiadavka | áno | áno | áno |
| zastaraný stav | áno | áno | – |
| nepodporovaná schopnosť | áno | áno | áno |
| akcia voči zákazníkovi bez schválenia | áno | áno | áno |
| neznámy kontrakt API (LeadHub) | áno | áno | áno |
| prekročený rozpočet | áno | – | – |
| PII neprejde | áno | áno | áno |
| zmena KPI po výsledkoch | – | – | áno |
| malá vzorka je `INDICATIVE` | – | – | áno |

## K. Otvorené otázky a UNKNOWN

| UNKNOWN | Prečo je dôležité | Čo by to overilo | Bezpečný ďalší krok |
|---|---|---|---|
| Cieľový repozitár `onlinovosk-bit/onlinovo` | kam patrí kód a PR | prístup k repozitáru alebo potvrdenie, že `packages/mcp-onlinovo` je správne miesto | práca prebieha vo vetve tejto relácie; presun je kopírovanie priečinka |
| Kontrakt LeadHub zápisu (kampane, journeys, kontakty) | bez neho sú akcie voči zákazníkom `BLOCKED` | oficiálna dokumentácia API alebo odpoveď podpory (koncept e-mailu je v Gmaile) | držať akcie `denied` |
| Živý zdroj objednávok a zákazníkov | agenti dnes bežia na fixture | overené mapovanie Shoptet alebo LeadHub čítania (`SHOP_MAPPING_BLOCKED`) | držať `RevenueDataPort` `fixture` a `unconnected` |
| Jednotkové náklady a marže | `BUNDLE` a hodnota príležitostí | export cenníka alebo nákupných cien | polia `unit_cost` sú `null` a výsledok `UNKNOWN` |
| Trvalé schvaľovanie (CP-P0-2) | bez neho nie je T3 možné | rozhodnutie a migrácia (denylist) | nič neposielať |
| Trvalé uloženie príležitostí a experimentov | učenie z minulých behov | overená cesta zápisu a migrácia | bezstavové |
| Zapojenie LLM a jeho náklad | mission obsahuje kontextové uvažovanie | rozhodnutie o modeli a meranie nákladov | náklad je 0 a LLM sa nevolá |
| CI pokrytie `mcp-onlinovo` | testy dnes nechránia merge | nový job v `.github/workflows` (denylist, vyžaduje foundera) | spúšťať lokálne a uviesť v odovzdaní |

## L. Presné súbory, ktoré má upraviť P09

Nové: `packages/mcp-onlinovo/src/agents/*` (typy, klasifikácia, pseudonym, guard, rozpočet, dátový port, tri agenti), `packages/mcp-onlinovo/src/tools/{revenue-opportunities,customer-next-action,experiment-plan}.ts`, ich testy, `packages/control-contract/tests/onlinovo-actions.test.ts`.

Upravené (aditívne): `packages/control-contract/src/actions.ts`, `packages/mcp-onlinovo/src/server.ts`, `packages/mcp-onlinovo/src/tools.test.ts`, `packages/mcp-onlinovo/package.json`, `apps/crm/src/lib/agents/agent-specs.ts` a jeho test.

Nemenia sa: `policy.ts` (len import), `resolve-adapter.ts`, `adapters/*`, `write-stub.ts`, `audit.ts` (len nová funkcia v novom súbore), všetko pod `.github/**`, migrácie, `.ai/**`.
