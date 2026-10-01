---
id: architecture.founder-control-plane-confrontation
title: "Founder Control Plane — konfrontácia tézy s repozitárom"
type: architecture
status: draft
version: 1.0.0
owner: founder
created_at: 2026-09-18
review_by: 2026-10-18
confidentiality: internal
canonical: false
sources:
  - docs/architecture/revolis-constitution-v2.md
  - docs/architecture/antipatterns-log.md
  - docs/architecture/engineering-os-revolis-rightsized.md
  - docs/architecture/agent-os-plan-2026-08-31.md
  - brain/ENGINE.md
  - memory/decisions.md
depends_on: []
supersedes: []
---

# Founder Control Plane — konfrontácia tézy s repozitárom

> Vstup: *REVOLIS.AI FOUNDER CONTROL CENTER / BUSINESS CONTROL PLANE —
> Architecture Discovery & North Star v1.0* (founder, 2026-09-18), §0–§29.
>
> Tento dokument **nie je** ARCHITECTURE SPEC v1.0. Je to krok, ktorý musí ísť
> pred ním: zistenie, čo z tézy už v repozitári existuje, čo je navrhnuté a čo
> je skutočne nové. Spec písaný pred touto konfrontáciou by navrhol nanovo
> minimálne šesť komponentov, ktoré už bežia.

Nálepky podľa AP-005: **FAKT** = overené v súbore/migrácii, cesta uvedená.
**PREDPOKLAD** = odvodené z kódu, nemerané na PROD. **NEZNÁME** = nezistené.

---

## 1. Verdikt Ústavy (povinná brána, CLAUDE.md §7)

Téza sa neposudzuje ako celok — to by bolo jedno áno/nie na 29 komponentov.
Rozdeľuje sa na dve veci s odlišným verdiktom.

### 1a. Control Plane ako **produktová plocha** (§21 navigácia, §8 UI, 6 fáz)

| # | Otázka | Odpoveď |
|---|---|---|
| 1 | Zaplatil by za to dnešný klient? | **NIE** — je to interná plocha pre foundera |
| 2 | Zarobí klient viac do 90 dní? | Nie priamo |
| 3 | Skracuje Lead → Provízia? | Nie priamo |
| 4 | Moat? | Áno — provenance a decision memory sú ťažko kopírovateľné |
| 5 | Flywheel? | Áno — §15 Learning Flywheel je presne on |
| 6 | Nové unikátne dáta? | Áno — cross-tenant správanie maklérov |
| 7 | Vyššie ROI než backlog? | **NIE** — v `memory/open-tasks.md` je 5× P0 vrátane Smolko Gmail dual-run |
| 8 | Správny čas? | **PRÍLIŠ SKORO** |
| 9 | MVP do 2 týždňov? | Nie — 6 fáz |
| 10 | Founder Trap? | **Technology Bias + Customer Avoidance** |
| 11 | Najlepšie využitie času? | Nie, kým nie je podpísaný 2. platiaci |
| 12 | Jediná vec tento kvartál? | Nie |

**Skóre 4/12 + dve vetá → STRATEGIC BACKLOG.**

Nie je to môj názor proti tvojmu — repo to už raz rozhodlo. `memory/decisions.md:464`
(ADR-004, 2026-08-03, tvoje GO): *„Predvolené prahy (4. uzol: +10 oslovených;
orchestrátor: 3. platiaci; **Center: 5 platiacich**)."* A `brain/ENGINE.md` §2 má
*„vytvoriť founder dashboard"* explicitne v zozname toho, čo dané GO **neznamená**.

Stav dnes: **1 platiaci** (Smolko). Molnár ako 2. platiaci je stále hypotéza
(`memory/decisions.md:395`). Do piatich chýbajú štyria.

ADR-004 zároveň hovorí, že odchýlka od prahu **je povolená** so zapísaným dôvodom
a dátumom revízie. Ak chceš prah prepísať, je to legitímne — ale musí to byť
vedomý zápis do `decisions.md`, nie ticho.

### 1b. Control Plane **substrát** (§3 event layer, §5 decision memory, §6 authority, §12 cost)

| # | Otázka | Odpoveď |
|---|---|---|
| 1 | Zaplatil by klient? | Nepriamo — bez neho nevieš dokázať, že Revolis funguje |
| 2 | Zarobí klient viac do 90 dní? | Áno, cez vymáhateľné SLA na reakčný čas |
| 7 | Vyššie ROI než backlog? | Čiastočne — tri položky áno, zvyšok nie |
| 8 | Správny čas? | **ÁNO** pre tri konkrétne kusy, nie pre zvyšok |
| 9 | MVP do 2 týždňov? | Áno, ak sa berie po kusoch |
| 10 | Founder Trap? | Nie, ak sa drží rozsah zo §6 |

**Verdikt: BUILD** pre tri konkrétne položky (§6 nižšie), zvyšok BACKLOG.

Dôvod, prečo substrát nedostáva timing veto: nie je to Center. Je to dlh, ktorý
už dnes blokuje vec, ktorú **si už postavil** — `/operator` beží, ale čísla v ňom
nie sú dôveryhodné (§4, nález 1 a 3).

---

## 2. Tri vrstvy — komponent po komponente

Legenda: **[E]** existuje v kóde · **[D]** navrhnuté v docs, neimplementované ·
**[T]** target, neexistuje nikde · **[E/Č]** existuje čiastočne.

### Business Control

| Téza | Stav | Dôkaz |
|---|---|---|
| Cross-tenant prehľad zákazníkov (§1, §23) | **[E]** | `apps/crm/src/app/operator/page.tsx`, `lib/operator/gather.ts` (332 r.) — za flagom `OPERATOR_DASHBOARD_ENABLED`, default false → PROD vracia 404 |
| Founder global scope vs tenant scope (§23) | **[E]** | `lib/operator/access.ts` `canAccessOperatorDashboard()`, `profiles.is_platform_admin`, migrácia `20260728140000`, `lib/tenant-scope.ts` |
| Customer health composite (§10) | **[E/Č]** | `lib/customer-health/{evaluate,scan,thresholds,persist}.ts`, tabuľka `customer_health_daily`, `lib/operator/health-score.ts`. **Ale:** 4 signály (`LEAD_SILENCE`, `OWNER_LOGIN_STALE`, `NEVER_LOGGED_IN_SHARE`, `TEAM_LOGIN_SILENCE`), nie 10 komponentov z §10. Chýba Commercial, Support, Reliability, Engagement |
| MRR / ARR / revenue | **[E/Č]** | `lib/metrics/types.ts` → `MrrBreakdown` (seat + cockpit + smolkoManual), `AgencyBillingRow`. Nie je napojené na `/operator` |
| Retention / adoption | **[T]** | žiadny kód |
| Business anomalies (§7) | **[E/Č]** | `strategic_alerts`, `integrity_alerts`, `guardian_findings` — tri nezávislé zdroje, bez spoločného modelu |

### Sales / CRM

| Téza | Stav | Dôkaz |
|---|---|---|
| Lead → deal entity | **[E]** | `leads`, `activities`, `tasks`, `properties`, `deal_outcomes`, `lead_conversions`, `deal_moments`, `deal_risk` |
| Response time / leakage / velocity | **[E/Č]** | `lib/operator/gather.ts` počíta `reaction24hPct` s explicitným `MetricAvailability: available \| unavailable` — **to je už implementácia princípu z §9** („radšej čestne neznáme než vymyslené číslo"), dôsledok AP-001 |
| Lead-to-value trace (§13) | **[E/Č]** | články reťaze existujú (`lead_events` → `lead_scores` → `ai_actions` → `lead_conversions` → `deal_outcomes`), **ale neexistuje jeden traversal ani `correlation_id`, ktorý by ich spojil** |

### AI / Agent

| Téza | Stav | Dôkaz |
|---|---|---|
| AI actions + outcomes + confidence (§1, §11) | **[E]** | `ai_action_audit` (cesta `lib/ai-action-audit.ts`) nesie `model`, `latency_ms`, `cost_eur`, `credits_spent`, `action_kind ∈ {ai_suggested, human_approved, sent, send_failed, frequency_blocked}`. Plus `ai_actions`, `ai_generations`, `ai_recommendations` |
| Agent decisions s confidence a expected outcome (§5) | **[E]** | tabuľka `public.decisions` (`20260817120000_rename_genome_layer2.sql`): `agent`, `decision`, `p_outcome`, `expected_value_eur`, `confidence`, `expected_outcome`, `status`; + `exclusivity_outcomes` s `decision_id` a `outcome_value_eur` = **actual outcome** |
| Agent health (§11) | **[T]** | najbližšie `platformHealth.guardianLastRunAt` + `/api/healthz`. Žiadna availability/latency/failure-rate per agent |
| Inter-agent bus | **[E]** | `.ai/bus/` — file-based (`inbox`, `outbox`, `ledger`, `handoffs`, `state`, `message.schema.md`, `AGENT_PROTOCOL.md`) |
| Agent registry | **[T]** | grep na `AGENT_REGISTRY \| ACTION_REGISTRY` = 0 zásahov |

### Operations

| Téza | Stav | Dôkaz |
|---|---|---|
| Automations / queues / jobs | **[E]** | `app/api/cron/*`, `lib/scheduler.ts`, `lib/async`, `scheduled_events` |
| Integrations | **[E]** | `lib/{realvia,realsoft,hubspot,inbound,integrations-store}.ts`, `profile_integrations` |
| Incidents (§19) | **[E/Č]** | `integrity_alerts`, `lib/auto-error-capture.ts`, `lib/error-log-reader.ts`, `docs/premortems/*`. **Žiadna `incidents` tabuľka**, žiadny lifecycle DETECT→…→PREVENTION, žiadny postmortem záznam v DB |
| Retries / latency / throughput / backlog | **[T]** | `latency_ms` je len na AI akciách, nie na jobs |

### Governance

| Téza | Stav | Dôkaz |
|---|---|---|
| Approvals (§6, §7) | **[E/Č] — najslabší článok** | `lib/capabilities/_shared/human-approval.ts` drží stav v **`new Map()` v pamäti procesu**. Serverless restart = approval zmizne. Plus `/api/outreach/approve` a `ai_action_audit.action_kind='human_approved'` |
| Policies | **[E/Č]** | RLS policies (`20260320_rls.sql`), `lib/permissions.ts`, `lib/role-config.ts`, `lib/alerts/policy.ts` (severity routing). Nie policy engine |
| Authority engine (§6) | **[T]** | neexistuje v žiadnej forme. Dnešný ekvivalent = hardcoded vetvy v kóde + feature flagy |
| Audit trail | **[E/Č]** | `ai_action_audit`, `api_usage_logs`, `enrichment_log`, `realsoft_import_logs`, `.ai/bus/ledger`, `memory/decisions.md` — päť nespojených auditov |
| Forbidden actions | **[E/Č]** | existuje ako **text** v `CLAUDE.md`, `decisions.md` („Zakázané: portal scrape · auto-deploy · prod DELETE"), `docs/AUTOMERGE-POLICY.md`. Nie ako vymáhateľný runtime kontrakt |

### Economics

| Téza | Stav | Dôkaz |
|---|---|---|
| cost / AI action | **[E]** | `ai_action_audit.cost_eur` + `credit_ledger` + `lib/credits/{credit-rates,spend-for-action}.ts` |
| cost / customer, margin | **[E]** | `lib/metrics/types.ts` → `AiCostDailyRow { credits_spent, cost_eur, revenue_eur_retail, margin_eur }` |
| cost / lead → qualified lead → appointment → deal → revenue (§12) | **[E/Č]** | **chýba len join.** `ai_action_audit` už má `lead_id`; `lead_conversions` a `deal_outcomes` majú výsledok. Reťaz cost→outcome je jeden view, nie Phase 6 |

### Learning

| Téza | Stav | Dôkaz |
|---|---|---|
| Decision memory — founder vrstva (§5) | **[E]** | `memory/decisions.md` (~750 riadkov), `brain/decisions/index.json`, `brain/src/catalog.ts`, `npm run brain:ingest` |
| Experiments (§16) | **[T]** | žiadna tabuľka, žiadny kód. Jediné A/B: `lib/landing-cta-ab.ts` (marketing CTA) |
| Research engine (§14) | **[E/Č] — pozor na zámenu pojmov** | `lib/research-agent/` **nie je** research lifecycle z §14. Je to *lead dossier builder* (`build-dossier.ts`). Rovnaké slovo, iný pojem — AP-006 |
| Organizational memory (§17) | **[E/Č]** | `memory/`, `brain/learning`, `brain/lessons`, `brain/audits`. Markdown. **Chýba status taxonómia** RAW → EVIDENCE → INTERPRETATION → VALIDATED FINDING → LEARNING |
| Improvement engine (§15) | **[E/Č]** | `.claude/skills/task-loop/SKILL.md` je closed-loop next-task engine s GO bránou — človekom riadený ekvivalent. Nie systémový |

### Cross-cutting z tézy

| Téza | Stav | Dôkaz |
|---|---|---|
| Unified event layer (§3, §4) | **[E/Č] — pozri nález 1** | `events` + 7 ďalších event tabuliek |
| Founder Attention Queue (§7) | **[E/Č]** | `lib/operator/types.ts` → `OperatorAttentionItem { signalType, priority: 1\|2\|3, detectedAt }` — 4 typy signálov, priorita je konštanta, **nie** IMPACT × URGENCY × CONFIDENCE × REVERSIBILITY × DEPENDENCY |
| Alert routing s vysvetliteľnosťou | **[E]** | `lib/alerts/{router,policy,types}.ts` — `SEVERITIES = [INFO, EVENT, WARNING, CRITICAL, GOVERNANCE]`, `evidenceRef` namiesto vloženého obsahu. Návrh: `docs/architecture/founder-alert-adapter-v0.1.md` |
| Change intelligence (§8) | **[T]** | žiadny last-known-state snapshot ani diff |
| „Why am I seeing this?" (§9) | **[E/Č]** | zárodok existuje: `reaction24hStatus`, `excludedFromScoring`, `healthScore: null` = „—", a `lib/operator/health-score.ts` má váhy zdokumentované v komentári pre founder review. Nie je z toho UI vrstva OBSERVATION→…→RECOMMENDATION |
| KPI systém s metadátami (§20) | **[D]** | `docs/architecture/growth-metrics-definitions-v0.md`, `lib/metrics/compute.ts`, `lib/metrics/guardrails.ts`. Žiadny KPI registry s `lineage`, `owner`, `confidence`, `status` |
| System map (§18) | **[T]** | `docs/architecture/MAPA.md` je statický dokument, nie traversovateľný graf |
| Trust architecture / provenance (§24) | **[E/Č]** | `docs/architecture/master-data-sourcing-map.md` + CLAUDE.md §4 je **procesná** provenance (pred stavaním). Runtime provenance na dátovom riadku neexistuje |
| Control contract OBSERVE→…→LEARN (§27) | **[T]** | **najdôležitejší chýbajúci kus** — pozri nález 5 |

### [D] — čo je navrhnuté a nepostavené

`docs/architecture/agent-os-plan-2026-08-31.md` (orchestrátori, tímy, vault) ·
`adr-2026-09-11b-software-factory-v1-minimum.md` ·
`2026-08-03-night-operations-center.md` ·
`ultrathink-closed-loop-revolis.md` ·
`memory-engine-canonical-model.md` + `brain-retrieval-contract.md` ·
`growth-metrics-definitions-v0.md` · `founder-alert-adapter-v0.1.md`

Poznámka: `agent-os-plan` §1 diagnostikuje, že úzke hrdlo **nie je výroba, ale
priepustnosť review** — merge robí výhradne founder. To je priamo relevantné pre
§7 tézy: Attention Queue by mala prioritizovať **rozhodnutia foundera**, nie
generovať ďalšie signály do fronty, ktorá už pretína.

---

## 3. Čo z tézy repozitár potvrdzuje

Tri veci si navrhol a repo ich už nezávisle validovalo:

1. **§9 „Why am I seeing this"** — `MetricAvailability: available | unavailable`
   v operator gather je presne to. Vzniklo ako fix na AP-001 (fake metriky).
   Princíp je overený v praxi, nie hypotetický.
2. **§5 decision s expected vs actual outcome** — `decisions` + `exclusivity_outcomes`
   majú presne ten tvar. Nemusíš ho navrhovať, musíš ho rozšíriť.
3. **§24 provenance** — `master-data-sourcing-map.md` už je povinná brána v CLAUDE.md §4.

---

## 4. Päť štrukturálnych nálezov

### Nález 1 — Nie je jeden event spine, je ich osem (a ten hlavný je pre Control Plane nepoužiteľný)

**FAKT.** `20260425231407_event_pipeline.sql`:

```sql
CREATE TABLE IF NOT EXISTS public.events (
  id, profile_id, entity_type, entity_id, event_type,
  payload JSONB, session_id, user_agent, ip_hash, created_at
);
```

Chýba **`agency_id`**, `correlation_id`, `causation_id`, `actor`, `source`,
`schema_version` — teda šesť z trinástich povinných polí zo §4 tézy.

Dôsledok, ktorý nie je kozmetický: bez `agency_id` sa `events` **nedá agregovať
per tenant**. Cross-tenant pohľad je pritom celý zmysel Control Plane. Dnes je
tabuľka viazaná na `profile_id` s `ON DELETE CASCADE` — zmazaním profilu zmizne
história. To je v priamom rozpore so §3 („unified layer je autoritatívna pre
históriu udalostí").

Navyše `entity_type` je `CHECK IN ('lead','property','contact','message','call',
'import','export','session','system')` — žiadna z deviatich hodnôt nie je
`agent`, `workflow`, `decision`, `approval`, `experiment`. Control objekty zo §2
sa do dnešnej tabuľky **nezmestia**.

Paralelne existujú: `platform_events`, `lead_events`, `broker_events`,
`buyer_events`, `acquisition_events`, `kataster_events`, `scheduled_events`.

**NEZNÁME:** koľko riadkov je v ktorej na PROD a do ktorých sa dnes reálne píše.

### Nález 2 — Decision memory je rozseknutá na dve polovice, ktoré o sebe nevedia

Founder vrstva: `memory/decisions.md` + `brain/decisions` — markdown, ručná,
bohatá na kontext a alternatívy.
Runtime vrstva: `public.decisions` + `exclusivity_outcomes` — typovaná, má
confidence a expected/actual outcome, ale je **lead-scoped** (`agency_id` +
`lead_id` NOT NULL) a `agent` má default `'followup_agent'`.

Zo siedmich polí §5 chýbajú štyri: `alternatives`, `authority`, `approver`, `policy`.

Otázka zo §5 („Prečo sme toto urobili?") sa dnes dá zodpovedať pre **founder
rozhodnutia** (markdown) aj pre **followup agent rozhodnutia** (DB), ale nie
naprieč — a nie pre nič medzi tým.

### Nález 3 — Approval nie je durable

**FAKT.** `lib/capabilities/_shared/human-approval.ts`:

```ts
const approvals = new Map<string, HumanApprovalRecord>();
```

Modul, ktorý strážia funkcie `assertPublishAllowed()` a `approveForPublish()`,
drží stav v pamäti Node procesu. Na Verceli (serverless) to znamená, že approval
neprežije cold start a nie je zdieľaný medzi inštanciami.

**PREDPOKLAD** (nemerané na PROD): v produkcii sa to prejaví buď ako stratený
approval, alebo — horšie — ako publish, ktorý prejde na inštancii, čo o zamietnutí
nevie. Governance vrstva zo §6 sa na tomto postaviť nedá.

Toto je zároveň najlacnejší fix v celej téze a platí sa dnes, bez ohľadu na Control Plane.

### Nález 4 — Cost vrstva je najsilnejšia existujúca časť a chýba jej jeden join

§12 pôsobí ako najambicióznejšia sekcia (12 cost metrík). Reálne je najbližšie
k hotovu. `ai_action_audit` už nesie `cost_eur`, `model`, `latency_ms`,
`credits_spent` **a `lead_id`**. `lead_conversions` a `deal_outcomes` nesú výsledok.
`AiCostDailyRow` už počíta `margin_eur`.

`cost / qualified lead` a `cost / deal` je teda dnes **jeden SQL view**, nie fáza.
To je pravdepodobne najvyššie ROI z celej tézy — a je to jediná metrika, ktorá
zároveň odpovedá na otázku, ktorú ti položí investor aj piaty zákazník.

### Nález 5 — Kontrakt zo §27 je jediný komponent, ktorý sa nedá dorobiť neskôr

Všetko ostatné v téze je aditívne: tabuľku pridáš, view dopočítaš, UI dokreslíš.
Kontrakt `OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT OUTCOME → LEARN` je jediný,
ktorý definuje **tvar každého budúceho agenta**. Ak sa zavedie po tom, ako
vznikne ďalších desať agentov, je to refaktor desiatich agentov.

Súhlasím s tvojou vetou zo §27, že je dôležitejší než konkrétny framework — a
dodávam: je dôležitejší aj než zvyšok Phase 0, ktorý si navrhol.

Dnešný stav: agenti v `lib/agents/`, `lib/workflows/`, `lib/capabilities/`
a `.ai/bus/` majú **štyri rôzne konvencie** a žiadny spoločný typ.

---

## 5. Kde si téza a repo protirečia

| Téza hovorí | Repo hovorí | Rozhodnutie |
|---|---|---|
| §26 Phase 0 = 7 položiek (entities, events, identities, tenant boundaries, provenance, decision records, authority) | Ústava Q9: MVP ≤ 2 týždne. Sedem substrátových položiek naraz je 6–10 týždňov | Phase 0 sa reže na 4 nezávislé kusy, každý samostatne užitočný |
| §1 „founder musí vedieť prejsť cez" ~70 objektov | `memory/open-tasks.md` má 5× P0, `agent-os-plan` §1: úzke hrdlo je **priepustnosť rozhodnutí foundera** | Viac objektov = horšie hrdlo. Attention Queue musí *uberať* rozhodnutia, nie pridávať |
| §20 KPI systém, 13 kategórií | AP-001: fake metriky vydávané za live dáta. CLAUDE.md §4: zdroj musí byť v `master-data-sourcing-map.md` | Každé KPI potrebuje riadok v sourcing mape **pred** implementáciou, inak je to AP-001 v priemyselnom meradle |
| §29 „Control Plane je systém, ktorý…" | `brain/ENGINE.md` §3: veľký Knowledge Brain = *„môže sa stať formou customer avoidance"* | Substrát áno, plocha až pri 5 platiacich (ADR-004) |
| §14 Research Engine | `lib/research-agent/` už existuje pod tým menom a je to niečo iné | Premenovať jedno z dvoch **pred** špecifikáciou (AP-006) |

Jedna vec, kde má téza pravdu proti môjmu inštinktu: §25 („čo by som teraz
nerobil" — UI mockupy, 40 grafov, AI chat pre foundera). To je správne a je to
presne opak toho, čo by default spravil agent, keby dostal §21 ako zadanie.

---

## 6. Návrh — right-sized Phase 0 (P0-CP)

Štyri kusy. Každý samostatne užitočný aj keby sa Control Plane nikdy nepostavil.
Žiadny nevyžaduje UI. Spolu ~2 týždne, ale **nemusia ísť naraz**.

### P0-CP-1 — `events` spine v2
Pridať `agency_id` (+ backfill cez `profile_id → profiles.agency_id`),
`correlation_id`, `causation_id`, `actor_type`, `actor_id`, `source`,
`schema_version`. Rozšíriť `entity_type` CHECK o `agent`, `workflow`, `decision`,
`approval`. Tenant RLS podľa vzoru `profile_agencies_for_auth()` (AP-002).
Zmeniť `ON DELETE CASCADE` na `SET NULL` — história nesmie zmiznúť so zmazaním profilu.
**Prínos dnes:** `/operator` dostane dôveryhodný základ; `logEvent()` sa nemení.
**Akceptačné kritérium:** cross-tenant test prejde; jeden event sa dá dohľadať cez `correlation_id` naprieč tromi tabuľkami.

### P0-CP-2 — durable approvals
Nahradiť in-memory `Map` tabuľkou `approvals` (`capability`, `draft_id`,
`agency_id`, `state`, `reviewed_by`, `reviewed_at`, `policy`, `authority`).
Napojiť `assertPublishAllowed()` a `/api/outreach/approve`.
**Prínos dnes:** odstraňuje reálnu governance dieru (nález 3), nezávisle od tézy.
**Akceptačné kritérium:** approval prežije restart; zamietnutie platí naprieč inštanciami.

### P0-CP-3 — cost → outcome view
View `ai_cost_to_outcome`: `ai_action_audit.lead_id` → `lead_conversions` /
`deal_outcomes`. Vracia `cost / qualified lead` a `cost / deal` per tenant.
**Prínos dnes:** prvé číslo, ktoré dokazuje unit economics Revolisu — použiteľné
v predaji aj pri rozhovore o cene.
**Akceptačné kritérium:** jedno reálne číslo pre Smolka, s `unavailable` stavom,
ak dáta chýbajú (nikdy vymyslené číslo — AP-001).

### P0-CP-4 — control contract ako typ
`packages/` alebo `lib/control/contract.ts`: TypeScript typ
`OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT → LEARN` + **jeden existujúci agent
migrovaný ako dôkaz** (kandidát: `lib/routines/seller-rescue.ts` alebo
`lib/agents/followup`, lebo ten už píše do `decisions`).
**Prínos dnes:** každý ďalší agent sa pripája na kontrakt, nie na konvenciu.
**Akceptačné kritérium:** migrovaný agent emituje event s `correlation_id`,
zapíše decision a reportuje outcome — end-to-end na jednom leade.

### Čo P0-CP **nie je**
Žiadna nová route. Žiadna navigácia zo §21. Žiadne grafy. Žiadny KPI registry.
Žiadne experimenty, incidents, system map, change intelligence, research lifecycle.
Tie sú v Strategic Backlogu s odomykacou podmienkou **5 platiacich zákazníkov**
(ADR-004) — alebo so zapísanou odchýlkou.

### Prvá viditeľná plocha (až po P0-CP, nie súčasť)
Nie navigačný strom. **Jeden riadok v existujúcom `/operator`**: `cost / deal`
per tenant s drilldownom WHY → evidence → lead → event. Ak tento jeden riadok
funguje a čítaš ho, má zmysel stavať druhý. To je test zo §22 v najmenšej
možnej dávke.

---

## 7. Otvorené neznáme (musia sa zodpovedať pred spec v1.0)

1. **NEZNÁME:** koľko riadkov má `public.events` na PROD, do ktorých z ôsmich
   event tabuliek sa reálne píše a aká je retencia.
2. **NEZNÁME:** či `leads.last_contact_at` na PROD existuje. Audit 17. 8. našiel
   len `last_contact` (text); `lib/operator/gather.ts` číta `last_contact_at`.
   Otvorené P0 z `docs/reports/2026-08-26-operator-dashboard-audit.md`.
3. **NEZNÁME:** či je `20260728140000` v `schema_migrations`.
4. **GDPR brána (CLAUDE.md §5):** `events` nesie `ip_hash` a `user_agent`.
   Cross-tenant čítanie founderom potrebuje zdokumentovaný právny základ
   (6(1)(f) + balancing test) a beh `gdpr-advisor` **pred** P0-CP-1.
   Dnešný `/operator` sa tomu vyhol tým, že je agregát bez PII — spine v2 to mení.
5. **Otvorená otázka na teba:** je `Center: 5 platiacich` (ADR-004) stále platný
   prah, alebo ho prepisuješ? Ak áno, potrebuje to zápis do `decisions.md`
   s dôvodom a dátumom revízie — ADR-004 to explicitne povoľuje, ale nie ticho.

---

## 8. GO brány

| Fráza | Odomkne |
|---|---|
| `GO CP-EVIDENCE` | read-only meranie PROD: 4 SELECTy k neznámym 1–3. Žiadny zápis |
| `GO CP-SPEC` | ARCHITECTURE SPEC v1.0 — ale len pre 4 komponenty z P0-CP, v tvare Component → Responsibility → Inputs → Outputs → Events → Data → APIs → Permissions → Failure modes → Observability → Dependencies → Acceptance |
| `GO CP-P0-1` … `GO CP-P0-4` | implementácia jednotlivých kusov, každý samostatne |
| `GO CP-FULL-SPEC` | spec pre všetkých 29 sekcií — **v rozpore s ADR-004**, vyžaduje zapísanú odchýlku |

Bez frázy sa nestavia nič. Toto je dokument, nie implementácia.
