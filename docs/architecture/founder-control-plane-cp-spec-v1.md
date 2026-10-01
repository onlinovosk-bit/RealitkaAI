---
id: architecture.cp-spec-v1
title: "CP-SPEC v1 — Revolis Control Contract + Events Spine v2"
type: specification
status: hardened-draft
version: 1.1.0
owner: founder
created_at: 2026-09-18
review_by: 2026-10-18
confidentiality: internal
canonical: false
sources:
  - docs/reports/2026-09-18-CP-EVIDENCE-REPORT.md
  - docs/reports/2026-09-18-U1-lead-events-write-path-report.md
  - docs/architecture/founder-control-plane-v1-repo-confrontation.md
  - docs/architecture/revolis-constitution-v2.md
  - docs/architecture/antipatterns-log.md
depends_on: []
supersedes: []
---

# CP-SPEC v1 — Control Contract + Events Spine v2

**Brána:** `GO CP-SPEC` (founder, 2026-09-18) · **Scope LOCK:** iba `CP-P0-4` a `CP-P0-1`.
**Toto je špecifikácia.** Žiadna implementácia, migrácia, zmena schémy, oprava `lead_events`, UI ani refaktor konzumentov.
**Evidence base:** CP-EVIDENCE (PROD, 08:58–09:05 UTC) a U1 (PROD, 09:12–09:20 UTC), doplnené meraniami 09:32–09:38 UTC. Nič, čo tieto merania nepotvrdzujú, tu nie je označené ako `[EXISTING]`.

Nálepky: **[EXISTING]** beží na PROD · **[DESIGNED]** v repe, nenasadené/nepoužité · **[TARGET]** treba postaviť · **[UNKNOWN]** nezistené.

---

## 0. Hardening changelog (v1.0 → v1.1)

Brána `GO CP-SPEC-HARDEN`. Scope nezmenený. Rozhodnutia D-01, D-04, D-09, kontrakt, dynamický authority model, durable approval, anti-halucinačné nálepky, explicitné UNKNOWN a požiadavka na migrovaného agenta — **zachované**.

| Bod | Nález | Zmena |
|---|---|---|
| P0-1 | v1 nemalo transakčnú hranicu; „fail-closed" bolo nevykonateľné cez sieť | **nová §3.8** — štyri vrstvy, hranica záruky, exactly-once vyhlásené za nedosiahnuteľné |
| P0-2 | **„ADD COLUMN × 8" vs 11 stĺpcov v §4.2** — reálna nekonzistencia | **nová §4.2.1** kanonická tabuľka, **12** stĺpcov (11 + `scope` z P0-3); všetky výskyty zjednotené |
| P0-3 | sentinel agentúra bola zameniteľná so zákazníckym tenantom | **D-06 prepísané** — `scope` diskriminátor + CHECK; sentinel zrušený |
| P0-4 | `irreversible → FORBIDDEN` **zabíja produkt** (agent by nikdy nesmel odoslať e-mail ani so schválením) | **§3.4.1 / §3.4.2** — OD-9 a OD-10, nezvratnosť je podlaha, nie strop |
| P0-5 | idempotency nerozlišovala platformu od externého efektu | **§3.8.3** — `runId` vs `idempotencyKey` vs externý kľúč |
| P0-6 | outcome nepokrývalo `rejected` / `expired` / `cancelled` → slučka by ostala otvorená | **`OutcomeStatus`** rozšírené na 7 hodnôt + dôvod |
| P0-7 | `run_id` chýbal, `workflow_id` nebol zdôvodnený | **§4.5.1** — sémantika štyroch identít, `workflow_id` zámerne vynechaný |
| P0-8 | „v1 a v2 koexistujú natrvalo" bolo vyhýbanie sa rozhodnutiu | **§11.5** — čitateľnosť histórie ≠ kanonický kontrakt, horizont definovaný |
| P1-1 | tvrdenie o `activities` bolo silnejšie než dôkaz | preformulované na rozsah merania |
| P1-2 | miešala sa architektonická a implementačná pripravenosť | **§15.1** dvojosová matica |
| P1-3 | fail-closed pri serverless + externých providerov | **§3.8.2** hranica záruky; overené, že RPC idióm v repe to umožňuje |
| P1-4, P1-5 | invarianty bez vynútenia a detekcie | **§9.1 register I-001..I-015** |
| P1-6 | GO matica nerozlišovala typy pripravenosti | **§15.1** |

**Nové P0 neznáme nájdené hardeningom:** U-J (idempotency u Resend/Twilio), U-K (transakčná hranica `emit` + doménový zápis). Obe v §14 — **neprikryté návrhom**.

---

## 1. Architectural thesis

Predchádzajúca téza znela „postavme Control Plane". Po dvoch auditoch znie inak:

> **Revolis už má event spine, decision store aj cost audit. Nemá medzi nimi kontrakt.**
> Preto systém pozoruje bez toho, aby vedel, čo pozoruje; rozhoduje bez toho, aby vedel, ako to dopadlo; a účtuje bez toho, aby vedel, za čo.

Tri merania, ktoré tú vetu držia:

| Vrstva | PROD | Diera |
|---|---|---|
| OBSERVE | `platform_events` 1 417 riadkov | pokrýva len vznik a zmenu stavu leadu; reakcia makléra nikde |
| DECIDE | `decisions` 240 riadkov, všetky `open` | `exclusivity_outcomes` = 0 → slučka sa nikdy neuzavrela |
| ACT / COST | `ai_action_audit` 146 riadkov | 0× cost, 0× `lead_id` → akcia sa nedá spojiť s leadom ani s cenou |

Kontrakt `OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT OUTCOME → LEARN` nie je nová vrstva nad systémom. Je to **chýbajúce lepidlo medzi tromi vrstvami, ktoré už existujú**.

**Dôsledok pre poradie:** kontrakt musí byť hotový pred spine, lebo spine bez kontraktu je len tabuľka s viac stĺpcami. A spine musí byť hotový pred zachytením triggera, lebo inak sa do migrácie zakonzervuje dnešný tvar.

---

## 2. Current-state evidence map

### 2.1 `public.platform_events` — [EXISTING], kandidát na spine

**FAKT** (09:32 UTC):
```
id:uuid NOT NULL, agency_id:uuid (NULLABLE), event_type:text NOT NULL,
payload:jsonb NOT NULL, created_at:timestamptz NOT NULL
```
· 1 417 riadkov · 3 rozlíšené `agency_id` · **0 riadkov s `agency_id IS NULL`** · 2026-04-12 → 2026-09-15
· `event_type`: `lead.created` 970, `lead.status_changed` 444, `integration.activity` 3
· RLS zapnuté, **jediná policy**:
```sql
platform_events_select_tenant [SELECT]
qual = (agency_id IS NULL) OR (agency_id IN (
          SELECT p.agency_id FROM profiles p
          WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL))
```
**Žiadna INSERT / UPDATE / DELETE policy** → pre rolu `authenticated` je zápis a mazanie odmietnuté. Immutabilita je dnes de-facto vynútená, ale nie deklarovaná.

Chýba 7 z 13 povinných polí z founder tézy §4: `actor`, `source`, `entity_type`, `entity_id`, `correlation_id`, `causation_id`, `schema_version`.

### 2.2 Producent — [EXISTING] a mimo repa

**FAKT** (09:19 UTC):
```sql
CREATE TRIGGER trg_leads_platform_events
  AFTER INSERT OR UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION trg_leads_platform_events()
```
```sql
CREATE OR REPLACE FUNCTION public.emit_platform_event(p_agency uuid, p_type text, p_payload jsonb)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$ begin
  insert into public.platform_events (agency_id, event_type, payload)
  values (p_agency, p_type, coalesce(p_payload,'{}'::jsonb));
end; $function$
```
Trigger emituje `lead.created` s payloadom `{lead_id, name, status}` a `lead.status_changed` s `{lead_id, from, to}`.

**Ani trigger, ani `emit_platform_event`, ani samotná tabuľka nie sú v žiadnej repo migrácii.** Repo to priznáva: `20260509000000_rls_lead_scores.sql:9`.

Aplikačný producent existuje, ale je marginálny: `emitPlatformEventServer()` (`lib/platform-events-server.ts:16`) je volaný **jediný raz** — `lib/ai/matching-engine.ts:35`.

### 2.3 Konzumenti `platform_events` — [EXISTING]

| Konzument | Súbor | Väzba |
|---|---|---|
| SSE stream | `app/api/events/stream/route.ts:48` | poll `platform_events` |
| Realtime hook | `hooks/usePlatformRealtime.ts:37` | subscribe INSERT, filter `agency_id` |
| Health dashboard | `app/api/system/health-dashboard/route.ts:30` | agregát |

### 2.4 Čo spine dnes **nepokrýva** — [TARGET]

Reakcia makléra (`call`, `reply`, `email_open`, `click`, `note`) nie je v `platform_events` ani nikde inde.

**`lead_events`** — [DESIGNED], 0 riadkov, jediná write path bez volajúcich a za Enterprise bránou (U1, PROVEN).

**`activities`** — [EXISTING], ale ako zdroj reaction events **nepoužiteľné**. FAKT (09:36 UTC):

| `type` | n | s `lead_id` | s `profile_id` | najnovší |
|---|---:|---:|---:|---|
| Používateľ | 127 | 0 | 0 | 2026-04-29 |
| Sales Funnel | 22 | 0 | 0 | 2026-07-07 |
| Matching | 13 | 0 | 0 | 2026-09-06 |
| Nehnuteľnosť | 9 | 0 | 0 | 2026-04-13 |
| AI | 7 | 0 | 0 | 2026-03-27 |
| Lead | 5 | 0 | 0 | 2026-05-27 |
| AI Scoring | 2 | 0 | 0 | 2026-04-19 |
| **Telefonat** | **1** | 1 | 0 | 2026-08-23 |
| Pipeline | 1 | 1 | 0 | 2026-08-23 |
| Úloha | 1 | 0 | 0 | 2026-03-18 |

186 zo 188 riadkov nemá `lead_id`; **žiadny** nemá `profile_id` (teda žiadny actor). Tabuľka navyše **nemá `agency_id`** a napriek tomu má **štyri RLS policy**, z toho dva prekrývajúce sa páry (`activities_select_agency` + `activities_tenant_select`, `activities_insert_agency` + `activities_tenant_write`) — vzor AP-002.

**Záver (presne v rozsahu dôkazu):** `activities` **nie je použiteľné ako kanonický zdroj reaction events pri nameranej schéme a dátach** — chýba tenant identita (stĺpec `agency_id` neexistuje), actor (`profile_id` 0/188) aj väzba na lead (`lead_id` 2/188). Tvrdenie sa týka vhodnosti na túto rolu, nie celkového účelu tabuľky.

### 2.5 DECIDE / OUTCOME — [EXISTING], neuzavreté

`decisions`: `agency_id, lead_id, agent, decision, p_outcome, expected_value_eur, confidence, expected_outcome, status, created_at` · 240 riadkov, **všetky `status='open'`**, všetky `agent='followup_agent'`, najnovší 2026-06-25, 240× vyplnená `confidence`.
`exclusivity_outcomes`: `decision_id → decisions.id`, `outcome`, `outcome_value_eur`, `recorded_at` · **0 riadkov**.
`deal_outcomes`: 1 riadok. `lead_conversions`: **tabuľka na PROD neexistuje**.

Chýbajú 4 z 7 polí founder tézy §5: `alternatives`, `authority`, `approver`, `policy`.

### 2.6 ACT / COST — [EXISTING], odpojené

`ai_action_audit`: `id, agency_id, lead_id, profile_id, action_kind, channel, variant, subject_preview, body_hash, meta, created_at` · 146 riadkov · **0× cost** (stĺpce neexistujú, `meta->>'costEur'` prázdne) · **0× `lead_id`** (`persist-cost-telemetry.ts:66` píše `null` natvrdo) · jediný `action_kind` = `ai_suggested` · jediná feature = `dashboard_insights`.

### 2.7 AUTHORIZE — [TARGET] / [DESIGNED] nedurable

`lib/capabilities/_shared/human-approval.ts` drží approvals v `new Map()` v pamäti procesu. Na serverless neprežije cold start ani sa nezdieľa medzi inštanciami. `ai_action_audit` na PROD nemá **ani jeden** `human_approved` riadok.

---

## 3. Control Contract — CP-P0-4

### 3.1 Semantika pred typmi

Kontrakt definuje **šesť povinných fáz**, ktorými musí prejsť každá netriviálna akcia agenta. Nie je to workflow engine — je to **tvar záznamu**. Agent smie fázy vykonať v jednom procese, v jednom requeste, aj naprieč dňami; nesmie ich vynechať.

```
OBSERVE ──► DECIDE ──► AUTHORIZE ──► ACT ──► REPORT OUTCOME ──► LEARN
   │           │            │          │            │              │
 event      decision     authority   action      outcome        lesson
   └───────────┴────────────┴──────────┴────────────┴──────────────┘
                    spoločné correlation_id
```

**Invariant kontraktu (jediná veta, z ktorej vyplýva zvyšok):**
> Každá `action` musí byť dohľadateľná k práve jednej `decision`, každá `decision` k aspoň jednej `observation`, a každá `action` musí skončiť buď `outcome`, alebo explicitným `outcome_unknown` so zdôvodnením. Nedokončená slučka je chyba, nie ticho.

Dnešný stav (240 decisions / 0 outcomes) je porušením tohto invariantu — dnes nedetekovateľným, lebo invariant nikde nie je zapísaný.

### 3.2 Fázy — čo musí agent urobiť

| Fáza | Povinný vstup | Povinný výstup | Emituje event | Zlyhanie znamená |
|---|---|---|---|---|
| **OBSERVE** | `tenant_id`, zdroj | `Observation[]` s `evidence_ref` | `*.observed` (voliteľne) | agent nesmie rozhodovať |
| **DECIDE** | `Observation[]` | `Decision` s `confidence`, `expected_outcome`, `alternatives` | `DECISION_EVENT` **povinne** | akcia je zakázaná |
| **AUTHORIZE** | `Decision` + `AuthorityContext` | `AuthorityVerdict` | `APPROVAL_EVENT` ak `APPROVAL_REQUIRED` | akcia je zakázaná |
| **ACT** | `AuthorityVerdict = AUTONOMOUS` alebo schválený approval | `ActionResult` + `idempotency_key` | `AGENT_EVENT` **povinne** | retry podľa §3.7 |
| **REPORT OUTCOME** | `ActionResult` | `Outcome` alebo `OutcomeUnknown(reason)` | `OUTCOME_EVENT` **povinne** | slučka otvorená → alert |
| **LEARN** | `Decision` + `Outcome` | `Lesson` (delta expected vs actual) | `LEARNING_EVENT` | tichá strata učenia |

**Povinné metadáta na každej fáze:** `correlation_id`, `causation_id`, `tenant_id`, `actor`, `occurred_at`, `schema_version`, `provenance`.

### 3.3 TypeScript kontrakt — [TARGET]

Navrhované umiestnenie: `packages/control-contract/` (nie `apps/crm/src/lib/`) — kontrakt musí byť importovateľný aj mimo CRM appky (cron, budúce služby, `.ai/bus` agenti).

```ts
// ——— identity ———
export type TenantId       = string & { readonly __brand: "TenantId" };
/** Obchodné vlákno: jeden lead, jedna slučka OBSERVE→LEARN. Prežíva retry. */
export type CorrelationId  = string & { readonly __brand: "CorrelationId" };
/** Jeden pokus o vykonanie. Retry = nový RunId, rovnaký CorrelationId. */
export type RunId          = string & { readonly __brand: "RunId" };
/** Bezprostredná príčina — vždy id INÉHO EVENTU, nikdy doménovej entity. */
export type CausationId    = string & { readonly __brand: "CausationId" };

export type Actor =
  | { kind: "human";  profileId: string }
  | { kind: "agent";  agentId: string; version: string }
  | { kind: "system"; component: string }
  | { kind: "external"; source: string };

export type Provenance = {
  /** Odkiaľ dáta prišli. NIKDY obsah — vždy odkaz. */
  sourceSystem: string;
  sourceRef: string | null;
  derivedFrom: CorrelationId[];
  computedBy: string | null;
  measuredAt: string;
};

// ——— OBSERVE ———
export type Observation = {
  observationId: string;
  tenantId: TenantId;
  entityType: string;
  entityId: string;
  kind: string;
  /** Odkaz na dôkaz, nie dôkaz sám. Pravidlo z lib/alerts/types.ts. */
  evidenceRef: string;
  value: number | string | null;
  availability: "available" | "unavailable";
  observedAt: string;
  provenance: Provenance;
};

// ——— DECIDE ———
export type Decision = {
  decisionId: string;
  correlationId: CorrelationId;
  tenantId: TenantId;
  actor: Actor;
  observations: string[];
  decision: string;
  alternatives: { option: string; rejectedBecause: string }[];
  confidence: number;            // 0..1
  expectedOutcome: string;
  expectedValueEur: number | null;
  policyRef: string | null;
  decidedAt: string;
};

// ——— AUTHORIZE ———
export type Capability = "OBSERVE" | "ANALYZE" | "RECOMMEND" | "EXECUTE";
export type Authority  = "AUTONOMOUS" | "APPROVAL_REQUIRED" | "FORBIDDEN";

export type AuthorityContext = {
  agentId: string;
  action: string;
  capability: Capability;
  tenantId: TenantId;
  actorRole: string;
  risk: "low" | "medium" | "high" | "irreversible";
  confidence: number;
  reversible: boolean;
  externallyVisible: boolean;
  systemState: { degraded: boolean; killSwitch: boolean };
};

export type AuthorityVerdict = {
  authority: Authority;
  policyRef: string;
  /** Prečo — v ľudskej reči, pre audit. */
  rationale: string;
  approvalId: string | null;
  evaluatedAt: string;
};

// ——— ACT ———
export type ActionResult = {
  actionId: string;
  correlationId: CorrelationId;
  causationId: CausationId;      // = decisionId alebo approvalId
  tenantId: TenantId;
  actor: Actor;
  action: string;
  idempotencyKey: string;
  status: "succeeded" | "failed" | "partial";
  costEur: number | null;
  model: string | null;
  latencyMs: number | null;
  errorCode: string | null;
  actedAt: string;
};

// ——— REPORT OUTCOME ———
/** Terminálny stav slučky. Pokrýva aj beh, ktorý sa nikdy nedostal k ACT. */
export type OutcomeStatus =
  | "success"      // akcia prebehla a dosiahla zamýšľaný efekt
  | "failure"      // akcia prebehla, efekt nedosiahla
  | "partial"      // akcia prebehla čiastočne
  | "cancelled"    // beh zrušený pred vykonaním
  | "rejected"     // approval zamietnutý → akcia sa nevykonala
  | "expired"      // approval vypršal → akcia sa nevykonala
  | "unknown";     // výsledok sa nedá zistiť

export type OutcomeUnknownReason = "too_early" | "not_observable" | "source_missing";

export type Outcome = {
  status: OutcomeStatus;
  /** Povinné práve vtedy, keď status = "unknown"; inak null. */
  reason: OutcomeUnknownReason | null;
  valueEur: number | null;
  measuredAt: string;
  /** Len pre unknown/too_early. */
  recheckAfter: string | null;
};

export type OutcomeRecord = {
  outcomeId: string;
  correlationId: CorrelationId;
  causationId: CausationId;      // = actionId
  tenantId: TenantId;
  decisionId: string;
  outcome: Outcome;
};

// ——— LEARN ———
export type Lesson = {
  lessonId: string;
  correlationId: CorrelationId;
  decisionId: string;
  expected: string;
  actual: string;
  delta: number | null;
  confidenceWasCalibrated: boolean | null;
  status: "raw" | "evidence" | "validated" | "organizational";
};

// ——— kontrakt agenta ———
export interface ControlledAgent<TInput, TAction> {
  readonly agentId: string;
  readonly version: string;
  readonly capabilities: readonly Capability[];

  observe(input: TInput, ctx: RunContext): Promise<Observation[]>;
  decide(obs: Observation[], ctx: RunContext): Promise<Decision | null>;
  /** Implementuje platforma, nie agent. Agent ju nesmie prepísať. */
  act(decision: Decision, verdict: AuthorityVerdict, ctx: RunContext): Promise<ActionResult>;
  reportOutcome(action: ActionResult, ctx: RunContext): Promise<OutcomeRecord>;
  learn?(decision: Decision, outcome: OutcomeRecord): Promise<Lesson>;
}

export type RunContext = {
  correlationId: CorrelationId;
  runId: RunId;
  tenantId: TenantId;
  actor: Actor;
  now: () => Date;
  emit: (event: ControlEvent) => Promise<void>;
  resolveAuthority: (ctx: AuthorityContext) => Promise<AuthorityVerdict>;
};
```

**Zámerne mimo agenta:** `resolveAuthority` a `emit` prichádzajú v `RunContext`. Agent ich nesmie implementovať — inak by si agent sám udeľoval autoritu.

### 3.4 Authority model

**Authority nie je vlastnosť agenta.** Je to čistá funkcia nad kontextom:

```
resolveAuthority(AuthorityContext) → AuthorityVerdict
```

Rozhodovacia tabuľka (policy ako **dáta**, nie kód — verzované, auditovateľné):

| Podmienka | Verdikt |
|---|---|
| `killSwitch = true` | `FORBIDDEN` |
| `capability ∈ {OBSERVE, ANALYZE}` | `AUTONOMOUS` |
| `capability = RECOMMEND` ∧ `!externallyVisible` | `AUTONOMOUS` |
| `risk = irreversible` | **OPEN DECISION OD-9** — v1 uvádzalo `FORBIDDEN`; pozri §3.4.1 |
| `externallyVisible = true` (e-mail, SMS klientovi) | **OPEN DECISION OD-10** — v1 uvádzalo `APPROVAL_REQUIRED`; pozri §3.4.2 |
| `action` v zozname zakázaných (`billing.*`, `prod.delete`, `portal.scrape`, `auto_deploy`) | `FORBIDDEN` |
| `confidence < policy.minConfidence` | `APPROVAL_REQUIRED` |
| `systemState.degraded` ∧ `capability = EXECUTE` | `APPROVAL_REQUIRED` |
| inak | `AUTONOMOUS` |

Zoznam zakázaných akcií nie je nový — dnes existuje **ako text** v `CLAUDE.md` a `memory/decisions.md` („Zakázané: portal scrape · auto-deploy · prod DELETE"). Kontrakt ho robí **vymáhateľným**.

**Invariant (I-007):** `FORBIDDEN` nesmie byť prekonateľné approvalom. Approval mení `APPROVAL_REQUIRED → povolené`, nikdy `FORBIDDEN → povolené`.

#### 3.4.1 Re-audit: `irreversible → FORBIDDEN` — **OPEN DECISION OD-9**

**Nález hardeningu: pravidlo v1 je nesprávne a zabíja produkt.**

`FORBIDDEN` podľa I-007 znamená „ani s ľudským schválením". Odoslanie e-mailu klientovi je nezvratné — nedá sa odvolať. Pri pravidle v1 by teda **žiadny agent nikdy nesmel odoslať e-mail, ani keď to človek výslovne schváli.** To ruší `RÝCHLY KONTAKT` aj `RADAR MAKLÉRA` (`memory/offer.md`), teda jadro platenej ponuky.

Príčina chyby: v1 zlúčilo dva nezávislé pojmy — *nezvratnosť* (technická vlastnosť akcie) a *neprípustnosť* (rozhodnutie vlastníka produktu).

**Navrhovaná oprava (vyžaduje founder GO):**

| Vlastnosť | Verdikt | Dôvod |
|---|---|---|
| `reversible = false` | `APPROVAL_REQUIRED` ako **podlaha** — policy ju nesmie znížiť | človek nesie zodpovednosť za nezvratné |
| `action ∈ DENY_LIST` | `FORBIDDEN` | explicitné rozhodnutie vlastníka, nie vlastnosť akcie |

`DENY_LIST` zostáva: `billing.*`, `prod.delete`, `portal.scrape`, `auto_deploy`.

**Architectural consequence:** nezvratnosť je **podlaha** autority, nie strop. Policy smie sprísniť, nikdy uvoľniť pod podlahu. Slabšie než v1 — a jediná verzia, pri ktorej produkt funguje.

**Zvyškové riziko:** schválená nezvratná akcia môže byť chybná. Zmierňuje §3.8 a I-009.

#### 3.4.2 Re-audit: `externallyVisible → APPROVAL_REQUIRED` — **OPEN DECISION OD-10**

Pravidlo nie je chybné, ale má nevyslovený dôsledok: **žiadna autonómna komunikácia s klientom nie je nikdy možná.**

Dnes je to pravdepodobne správne (founder-GO kultúra, jeden platiaci zákazník, ADR-003 „Vrstva 4 smie navrhovať, nestavať"). Ale je to **strop na hodnotu produktu** — pri 20 zákazníkoch je ručné schvaľovanie každého e-mailu neudržateľné.

**Navrhovaná formulácia (vyžaduje founder GO):** default zostáva `APPROVAL_REQUIRED`, ale je **per-tenant policy override-ovateľný** na `AUTONOMOUS` pri splnení všetkých: `confidence ≥ policy.autonomousMinConfidence` ∧ `reversible` ∧ `!systemState.degraded` ∧ tenant má explicitný súhlas s autonómnym odosielaním.

**Architectural consequence:** policy prestáva byť globálna a stáva sa **per-tenant dátovou konfiguráciou**. To je návrhová požiadavka na `resolveAuthority` už v CP-P0-4, aj keď sa override zapne neskôr.

**Kým OD-10 nie je rozhodnuté**, implementácia použije default `APPROVAL_REQUIRED` bez override cesty — bezpečná voľba, ktorá CP-P0-4 nezablokuje.

### 3.5 Approval contract

```
REQUEST ──► PENDING ──┬──► APPROVED ──► EXECUTED ──► OUTCOME
                      ├──► REJECTED   (terminál)
                      ├──► EXPIRED    (terminál, TTL)
                      └──► CANCELLED  (terminál, žiadateľ stiahol)
```

Povinné polia: `approval_id, correlation_id, tenant_id, requested_by, action, payload_ref, authority_context_snapshot, state, requested_at, decided_at, decided_by, expires_at, reason`.

**Tri invarianty:**
1. **Durable.** Stav žije v DB, nie v pamäti procesu. (Priama oprava dnešného `new Map()`.)
2. **Snapshot.** `authority_context_snapshot` sa uloží pri requeste. Approval z včera sa nesmie vykonať podľa dnešnej policy bez re-evaluácie.
3. **Jednorazovosť.** `APPROVED` + `idempotency_key` ⇒ akcia sa vykoná najviac raz.

> **Pozn. k scope:** `CP-P0-2 Durable Approvals` je samostatná brána. Tu je špecifikovaný **kontrakt**, aby Control Contract bol úplný. Implementácia approvals nie je súčasťou `GO CP-SPEC`.

### 3.6 Provenance model

Každý odvodený údaj musí odpovedať na šesť otázok z founder tézy §24:

| Otázka | Pole |
|---|---|
| Odkiaľ? | `provenance.sourceSystem` + `sourceRef` |
| Kedy? | `provenance.measuredAt` |
| Kto/čo vyrobilo? | `actor` |
| Je odvodené? | `provenance.derivedFrom.length > 0` |
| Ako? | `provenance.computedBy` (identifikátor funkcie + verzia) |
| Reprodukovateľné? | `derivedFrom` + `computedBy` + `schema_version` |

**Pravidlo, ktoré má prednosť pred pohodlnosťou:** ak zdroj nie je pripojený, hodnota je `availability: "unavailable"`, nie odhad. To je AP-001 povýšené z UI pravidla na kontrakt. `/operator` to už dnes robí správne (`reaction24hStatus`) — kontrakt to robí povinným pre všetkých.

### 3.7 Error, retry, idempotency

| Vlastnosť | Pravidlo |
|---|---|
| **Idempotency key** | `sha256(agentId : action : tenantId : entityId : decisionId)` — deterministický, nie náhodný |
| **Retry** | len `ACT` a len pri `errorCode ∈ {TRANSIENT, TIMEOUT, RATE_LIMIT}`; exponenciálne 2/4/8/16 s, max 4 |
| **Nikdy neretryuj** | `DECIDE` (vyrobilo by druhé rozhodnutie na tú istú observáciu) a `AUTHORIZE` |
| **Retry ≠ nový korelačný beh** | rovnaké `correlation_id`, nové `action_id`, rovnaký `idempotency_key` |
| **Outcome timeout** | `ACT` bez `OUTCOME` do `policy.outcomeSla` → automaticky `outcome_unknown{too_early}` + `recheckAfter` |
| **Partial failure** | `status: "partial"` je platný stav, nie chyba; outcome je povinný aj preň |

### 3.8 Transakčná hranica — DECISION → INTENT → SIDE EFFECT → OUTCOME

**Nález hardeningu:** v1 hovorilo „fail-closed emit" bez rozlíšenia, čo sa dá vynútiť v transakcii a čo nie. Cez sieťovú hranicu sa fail-closed vynútiť **nedá**. Táto sekcia to naprávza.

#### 3.8.1 Štyri vrstvy a ich záruky

```
┌─ T1 ── jedna Postgres transakcia ──────────────────────────┐
│  decision row  +  DECISION_EVENT  +  action_intent row      │  ATOMICKÉ
│  +  AGENT_EVENT(action.intended)                            │
└─────────────────────────────────────────────────────────────┘
                  ↓  commit
┌─ E ─── externý side effect (Resend / Twilio / portál) ──────┐
│  HTTP volanie s idempotency kľúčom                           │  NEATOMICKÉ
└─────────────────────────────────────────────────────────────┘
                  ↓
┌─ T2 ── jedna Postgres transakcia ──────────────────────────┐
│  AGENT_EVENT(action.acted)  +  provider ref  +  status      │  ATOMICKÉ
└─────────────────────────────────────────────────────────────┘
                  ↓  (neskôr, iný beh)
┌─ T3 ── jedna Postgres transakcia ──────────────────────────┐
│  OUTCOME_EVENT  +  outcome row                              │  ATOMICKÉ
└─────────────────────────────────────────────────────────────┘
```

| Vrstva | Záruka | Mechanizmus |
|---|---|---|
| **DB atomicity** | **plná** | jedna transakcia v Postgres |
| **Event persistence** | **plná**, spolu s doménovým zápisom | rovnaká DB, rovnaká transakcia |
| **External side-effect delivery** | **at-least-once**, nikdy exactly-once | HTTP + retry |
| **Idempotency** | **plná na platforme**, *effectively-once* externe len ak provider podporuje kľúč | §3.8.3 |

#### 3.8.2 Hranica záruky — kde fail-closed platí a kde nie

> **Fail-closed je vynútiteľné len vnútri jednej DB transakcie.** Za sieťovou hranicou neexistuje.

**Platí (vynútiteľné):**
- `DECISION_EVENT` sa nezapíše ⇒ `decision` row sa nezapíše ⇒ `action_intent` nevznikne ⇒ akcia sa nevykoná.
- `lead.created` event zlyhá ⇒ insert leadu sa rollbackne (trigger je `AFTER ... FOR EACH ROW` v tej istej transakcii).

**Neplatí (nevynútiteľné, nutné priznať):**
- Nedá sa zaručiť, že externý e-mail odišiel **práve raz**.
- Nedá sa zaručiť, že `action.acted` event sa zapíše, keď proces spadne medzi E a T2. Ostane `action_intent` bez výsledku — **to je zámer**, lebo taký stav je detegovateľný; opačné poradie (zapísať výsledok pred volaním) by bolo neodhaliteľné klamstvo.

**Implementovateľnosť v tomto repe — overené, nie predpokladané:** atomický zápis viacerých riadkov z aplikačnej vrstvy sa v Revolise robí cez Postgres funkciu volanú `supabase.rpc(...)`. Idióm je zavedený — 12+ call sites (`lib/price-trail/engine.ts:24`, `lib/events/bri-score.ts:47`, `lib/valuation/tenant.ts:30`, …) a 27 migračných súborov s `plpgsql` funkciami. `T1`, `T2` aj `T3` sú teda po jednej RPC funkcii. **Supabase JS klient sám multi-statement transakciu neposkytuje** — preto je RPC povinné, nie odporúčané.

**Reconciler (povinný, [TARGET]):** periodický beh nájde `action_intent` bez `action.acted` staršie než `policy.intentSla` a buď zopakuje volanie s rovnakým idempotency kľúčom, alebo uzavrie slučku ako `outcome.status = "unknown", reason = "not_observable"`. Bez reconcilera je I-006 nevynútiteľné.

#### 3.8.3 Tri identity, tri rôzne úlohy

| Identita | Rozsah | Mení sa pri retry? | Účel |
|---|---|---|---|
| `correlationId` | celá slučka | **nie** | obchodné vlákno, trace |
| `runId` | jeden pokus | **áno** | audit pokusov, latencia, diagnostika |
| `idempotencyKey` | jeden zámer | **nie** | dedup **na platforme** |
| externý kľúč | jedno volanie providera | **nie** (= `idempotencyKey`) | dedup **u providera**, ak ho podporuje |

`idempotencyKey = sha256(agentId : action : tenantId : entityId : decisionId)` — deterministický, nie náhodný. `actionId` je unikátne na pokus, takže retry je v audite viditeľný, ale platforma vykoná zámer najviac raz.

**Idempotentné vykonanie na platforme** = garantované unique indexom, presne ako to repo už robí pri kreditoch: `credit_ledger.idempotency_key` s unique violation interpretovanou ako úspech (`lib/starter-pack/redemption.ts:148`, `lib/credits-billing.ts:264`). Vzor je overený v produkcii — nevymýšľame nový.

**Exactly-once externý side effect** = **nedosiahnuteľné**. Najlepšie, čo je možné, je *effectively-once*: poslať providerovi `idempotencyKey` a spoľahnúť sa na jeho dedup. Či to `resend@^6.12.2` a `twilio@^5.13.1` podporujú, **nebolo overené** — pozri **U-J**. Kým to overené nie je, každá externe viditeľná akcia musí byť deklarovaná ako **at-least-once**, a to je samostatný argument pre `APPROVAL_REQUIRED` (§3.4.2).

---

## 4. Events Spine v2 — CP-P0-1

### 4.1 Rozhodnutie o nosnej tabuľke

> **DECISION D-01:** Spine v2 je **`public.platform_events` rozšírené in-place**, aditívne, spätne kompatibilne. Nevzniká nová tabuľka.
>
> **WHY:** Je to jediná tabuľka na PROD s reálnou históriou (1 417 riadkov, 5 mesiacov), 100 % vyplneným `agency_id`, živým producentom a tromi existujúcimi konzumentmi. Nová tabuľka by znamenala dual-write alebo migráciu histórie — obe zvyšujú presne ten typ driftu, ktorý CP-EVIDENCE a U1 našli.
>
> **ALTERNATIVES:**
> (a) *Nová `control_events` + dual-write.* Zamietnuté — dva zdroje pravdy, tretia paralelná event tabuľka; presne vzor, ktorý spôsobil `lead_events`.
> (b) *Oživiť `public.events`.* Zamietnuté — 0 riadkov, bez `agency_id`, `ON DELETE CASCADE` na profil, `entity_type` CHECK na 9 hodnôt bez `agent`/`decision`/`approval`. Nemá čo priniesť.
> (c) *`lead_events` ako spine.* Zamietnuté — U1: 0 riadkov, Enterprise-gated, bez volajúcich, lead-špecifická schéma.
>
> **TRADE-OFFS:** Meno `platform_events` prestane presne vystihovať obsah (bude niesť aj agent/decision/outcome eventy). Prijímam — premenovanie tabuľky s tromi živými konzumentmi je drahšie než mierne nepresné meno. Semantické meno „Control Events" žije v kontrakte a dokumentácii.
>
> **CONSEQUENCES:** Všetky nové stĺpce musia byť `NULLABLE` s defaultom, inak sa rozbije trigger aj existujúce inserty.
>
> **REVERSIBILITY:** Vysoká. Aditívne stĺpce sa dajú zahodiť; žiadny existujúci stĺpec sa nemení ani nemaže.
>
> **DEPENDENCIES:** D-03 (vlastníctvo triggera), D-04 (PII).
>
> **MIGRATION IMPACT:** ADD COLUMN × **12** + 4 indexy (kanonický zoznam §4.2.1 — jediný záväzný počet v dokumente). **Žiadny backfill dát** — historické riadky dostanú `schema_version = 1` a `NULL` v nových poliach. Politika kompatibility je v §11.5 — nahrádza formuláciu „koexistujú natrvalo“ z v1.

### 4.2 Cieľová schéma — [TARGET]

```
public.platform_events
──────────────────────────────── v1, [EXISTING], nemenené ───────
  id            uuid        PK
  agency_id     uuid        -- pozri D-06: prechod na NOT NULL
  event_type    text        NOT NULL
  payload       jsonb       NOT NULL
  created_at    timestamptz NOT NULL
──────────────────────────────── v2, [TARGET], aditívne ─────────
  schema_version   smallint    NOT NULL DEFAULT 1
  occurred_at      timestamptz             -- kedy sa to stalo (≠ created_at = kedy sme to zapísali)
  actor_kind       text                    -- human | agent | system | external
  actor_id         text
  source           text                    -- db_trigger | app | cron | integration:<name>
  entity_type      text                    -- lead | property | agent | decision | approval | action | outcome
  entity_id        text
  correlation_id   uuid
  causation_id     uuid
  idempotency_key  text
  provenance       jsonb
```

#### 4.2.1 Kanonická schéma — **jediný záväzný zoznam v dokumente**

Každý iný výskyt počtu stĺpcov v tomto dokumente odkazuje sem. Pri rozpore platí táto tabuľka.

| # | Stĺpec | Typ | Nullable | Verzia | Povinné pre | Poznámka |
|---:|---|---|---|---|---|---|
| 1 | `id` | uuid PK | nie | v1 | všetko | [EXISTING] |
| 2 | `agency_id` | uuid | **podmienene** | v1 | `scope='tenant'` | [EXISTING], viď D-06 |
| 3 | `event_type` | text | nie | v1 | všetko | [EXISTING] |
| 4 | `payload` | jsonb | nie, default `{}` | v1 | všetko | [EXISTING] |
| 5 | `created_at` | timestamptz | nie, default now() | v1 | všetko | [EXISTING] = čas **zápisu** |
| 6 | `scope` | text | nie, default `'tenant'` | **v2** | všetko | `tenant` \| `platform` — D-06 |
| 7 | `schema_version` | smallint | nie, default `1` | **v2** | všetko | nové eventy `2` |
| 8 | `occurred_at` | timestamptz | áno | **v2** | v2 eventy | čas **udalosti**, D-02 |
| 9 | `actor_kind` | text | áno | **v2** | v2 eventy | human/agent/system/external |
| 10 | `actor_id` | text | áno | **v2** | ak `actor_kind ≠ system` | |
| 11 | `source` | text | áno | **v2** | v2 eventy | `db_trigger`/`app`/`cron`/`integration:<n>` |
| 12 | `entity_type` | text | áno | **v2** | CRM, BUSINESS | |
| 13 | `entity_id` | text | áno | **v2** | CRM, BUSINESS | |
| 14 | `correlation_id` | uuid | áno | **v2** | AGENT, DECISION, APPROVAL, OUTCOME, LEARNING | |
| 15 | `run_id` | uuid | áno | **v2** | AGENT, ACT | P0-7 |
| 16 | `causation_id` | uuid | áno | **v2** | nie koreňové eventy | id **iného eventu** |
| 17 | `idempotency_key` | text | áno | **v2** | akcie s externým efektom | |

**Počty:** v1 = 5 stĺpcov [EXISTING] · v2 pridáva **12** (č. 6–17) · spolu **17**.
Pozn.: `provenance` z v1 draftu **nie je samostatný stĺpec** — je to podobjekt v `payload` pod kľúčom `_provenance`, aby sa nezdvojoval JSON. To je zmena oproti v1.0.

**Indexy [TARGET] — 4:** `(agency_id, occurred_at DESC)` · `(correlation_id)` · `(entity_type, entity_id, occurred_at DESC)` · `UNIQUE (agency_id, event_type, idempotency_key) WHERE idempotency_key IS NOT NULL`.

> **DECISION D-02:** `occurred_at` je samostatné pole, nie prepoužité `created_at`.
> **WHY:** Replay, import histórie a oneskorené integračné eventy potrebujú rozlíšiť čas udalosti od času zápisu. Bez toho sa nedá odlíšiť „stalo sa to včera" od „zapísali sme to včera".
> **TRADE-OFFS:** Dve časové polia = riziko, že konzument použije nesprávne. Mitigácia: konzumenti čítajú `COALESCE(occurred_at, created_at)` cez view, nie priamo.
> **REVERSIBILITY:** Vysoká. **MIGRATION IMPACT:** ADD COLUMN, bez backfillu.

### 4.3 Event taxonomy

> **DECISION D-03:** Taxonómia je **dvojúrovňová**: `category` (uzavretá množina, 14 hodnôt) odvodená z prefixu, `event_type` (otvorená, `domain.thing.verb_past`).
> **WHY:** Uzavretý CHECK na `event_type` by opakoval chybu `public.events` (CHECK na 9 hodnôt, nezmestili sa doň agent/decision/approval). Uzavretá kategória dáva stabilné agregácie; otvorený typ dáva rast.
> **ALTERNATIVES:** (a) CHECK na `event_type` — zamietnuté, dôkaz vyššie. (b) Bez kategórie — zamietnuté, cross-cutting agregácie by nemali stabilnú os.
> **TRADE-OFFS:** Nekonzistentné pomenovanie sa nedá vynútiť DB constraintom. Mitigácia: kontrakt v `packages/control-contract` + CI lint na registri typov.
> **REVERSIBILITY:** Stredná — precedens v dátach.

Konvencia: `domain.thing.verb_past` — minulý čas, lebo event je fakt, nie príkaz.

| Kategória | Prefix | Producent | Konzument | Source of truth | PII | Stav |
|---|---|---|---|---|---|---|
| `CRM_EVENT` | `lead.*`, `property.*`, `contact.*` | DB trigger, app | /operator, Guardian, SSE | `leads`, `properties` | **áno** (§6) | `lead.created`, `lead.status_changed` **[EXISTING]**; zvyšok [TARGET] |
| `BUSINESS_EVENT` | `deal.*`, `revenue.*` | app | forecast, cost→outcome | `deal_outcomes` | nepriamo | [TARGET] |
| `AI_EVENT` | `ai.*` | AI vrstva | cost intelligence | `ai_action_audit` | nie (hash) | [TARGET] |
| `AGENT_EVENT` | `agent.*` | agenti | operator, audit | spine | nie | [TARGET] |
| `WORKFLOW_EVENT` | `workflow.*` | orchestrácia | observability | spine | nie | [TARGET] |
| `SYSTEM_EVENT` | `system.*`, `integration.*` | cron, integrácie | health dashboard | spine | nie | `integration.activity` **[EXISTING]** |
| `SECURITY_EVENT` | `security.*` | auth, RLS guard | audit | spine | pseudonym | [TARGET] |
| `COST_EVENT` | `cost.*` | AI vrstva, credits | unit economics | `credit_ledger` | nie | [TARGET] |
| `DECISION_EVENT` | `decision.*` | agenti | learning, audit | `decisions` | nie | [TARGET] |
| `APPROVAL_EVENT` | `approval.*` | authority engine | governance | approvals tabuľka | actor áno | [TARGET] |
| `OUTCOME_EVENT` | `outcome.*` | agenti | learning | `exclusivity_outcomes`, `deal_outcomes` | nie | [TARGET] |
| `RESEARCH_EVENT` | `research.*` | — | — | — | — | [TARGET], Strategic Backlog |
| `EXPERIMENT_EVENT` | `experiment.*` | — | — | — | — | [TARGET], Strategic Backlog |
| `LEARNING_EVENT` | `learning.*` | learn fáza | memory | spine | nie | [TARGET] |

**Povinné polia pre každý event:** `event_type, agency_id, occurred_at, actor_kind, source, schema_version`.
**Voliteľné:** `entity_type/entity_id` (povinné pre CRM/BUSINESS), `correlation_id` (**povinné** pre AGENT/DECISION/APPROVAL/OUTCOME/LEARNING), `causation_id`, `idempotency_key`, `provenance`.

**Failure behaviour (jednotné):** emit je *best-effort pre UI*, ale **fail-closed pre kontrakt** — ak sa nepodarí zapísať `DECISION_EVENT`, `APPROVAL_EVENT` alebo `OUTCOME_EVENT`, akcia sa **neuskutoční**. Pri `CRM_EVENT` z triggera je emit súčasťou transakcie leadu (dnes už je — `AFTER ... FOR EACH ROW`), takže zlyhanie eventu zruší zápis leadu. To je zámer, nie chyba: lead bez eventu je neviditeľný lead.

### 4.4 Reaction events

Zadanie: vyriešiť `call`, `reply`, `email_open`, `click`, `note` bez automatického predpokladu samostatnej tabuľky.

**Evidencia (§2.4):** `lead_events` je prázdna a zabetónovaná za Enterprise bránou. `activities` má 186/188 riadkov bez `lead_id`, 188/188 bez `profile_id`, nemá `agency_id` a má prekrývajúce sa RLS policy.

> **DECISION D-04:** Reaction events sú **prvotriedne eventy na spine**, nie samostatná tabuľka.
> `lead.contacted` · `lead.replied` · `lead.note_added` · `email.opened` · `link.clicked`
>
> **WHY:** Tri argumenty, každý sám dostačujúci.
> (1) Tretia paralelná event tabuľka je presne vzor, ktorý U1 identifikoval ako príčinu slepoty.
> (2) `reaction24h`, STALE aj `cost / qualified lead` potrebujú **jeden** časový rad na leade; join cez tri tabuľky s odlišnou tenant identitou je krehký.
> (3) Spine už má `entity_type`/`entity_id` — lead reaction je `entity_type='lead'`. Netreba nový tvar.
>
> **ALTERNATIVES:**
> (a) *Oživiť `lead_events`* (odstrániť gate, pridať volajúcich) — zamietnuté: rieši symptóm, konzervuje dve paralelné reality, a `lead_events` nemá `correlation_id` ani provenance.
> (b) *Derived events z `activities`* — zamietnuté meraním: chýba `lead_id` (186/188), `profile_id` (188/188) aj `agency_id` (stĺpec neexistuje). Nedá sa z toho odvodiť ani tenant, ani actor.
> (c) *Externé integračné eventy zvlášť* (e-mail tracking od providera) — **čiastočne prijaté**: `email.opened` a `link.clicked` prichádzajú z externého systému, preto dostanú `actor_kind='external'`, `source='integration:<provider>'` a `provenance.sourceRef` = ID u providera. Ale žijú **na tom istom spine**.
>
> **TRADE-OFFS:** Spine porastie rýchlejšie (open/click sú vysokofrekvenčné). Pri dnešnom objeme (≈9 riadkov/deň) je to bezvýznamné; pri raste sa rieši partitioningom, nie druhou tabuľkou.
>
> **CONSEQUENCES:** `lead_events` sa stáva deprecated. **Nezahadzuje sa** — má 6 konzumentov (U1 §2). Deprecation path v §11.
>
> **REVERSIBILITY:** Stredná. Po nazbieraní dát by presun do zvláštnej tabuľky znamenal migráciu histórie.
>
> **DEPENDENCIES:** D-01, D-05 (PII — `email.opened` nesie e-mailovú adresu u providera).
>
> **MIGRATION IMPACT:** Žiadny na dáta. Producenti sú [TARGET] — reaction events dnes **nikto negeneruje**, takže nie je čo migrovať. Toto je nová schopnosť, nie oprava.

**Dôležité priznanie rozsahu:** samotný spine reaction events **nevyrobí**. Potrebujú producenta (inbound e-mail hook, telefónny log, UI akcia makléra). Ten producent je [TARGET] a **nie je súčasťou CP-P0-1**. Spine ich len musí vedieť reprezentovať. Kým producent nie je, `reaction24h` a STALE zostávajú `unavailable` — čestne.

### 4.5 Correlation / causation model

```
correlation_id  = identita celého behu (jeden agent run, jedna slučka OBSERVE→LEARN)
causation_id    = identita bezprostrednej príčiny tohto eventu
```

Príklad jednej slučky:

| # | event_type | correlation_id | causation_id | entity |
|---|---|---|---|---|
| 1 | `lead.created` | `C1` | — | lead/L1 |
| 2 | `agent.observed` | `C1` | event#1 | lead/L1 |
| 3 | `decision.made` | `C1` | event#2 | decision/D1 |
| 4 | `approval.requested` | `C1` | event#3 | approval/A1 |
| 5 | `approval.granted` | `C1` | event#4 | approval/A1 |
| 6 | `agent.acted` | `C1` | event#5 | action/X1 |
| 7 | `outcome.measured` | `C1` | event#6 | decision/D1 |
| 8 | `learning.recorded` | `C1` | event#7 | decision/D1 |

**Pravidlá:**
- `correlation_id` vzniká na prvom OBSERVE a **nikdy sa nemení**, ani pri retry.
- `causation_id` ukazuje na **event**, nie na doménovú entitu.
- Externý event bez behu (`lead.created` z triggera) má `correlation_id = id` samotného eventu — je koreňom, nie sirotou.

> **DECISION D-05:** `correlation_id` generuje **producent**, nie databáza.
> **WHY:** Agent musí vedieť korelačné ID skôr, než zapíše prvý event — inak nevie skorelovať vlastné volania.
> **TRADE-OFFS:** Producent môže poslať duplikát. Mitigácia: UUIDv7 (časovo usporiadané) + `idempotency_key` unique index.
> **REVERSIBILITY:** Vysoká.

#### 4.5.1 Štyri identity — presná sémantika a jedna zámerná absencia

| Identita | Definícia | Rozsah | Prežíva retry | Povinné pre |
|---|---|---|---|---|
| `correlation_id` | **obchodné vlákno** — jedna slučka OBSERVE→LEARN nad jednou entitou | od prvého OBSERVE po LEARN | **áno** | AGENT, DECISION, APPROVAL, OUTCOME, LEARNING |
| `run_id` | **jeden pokus o vykonanie** agenta | jedno spustenie | **nie** — retry = nový | AGENT, ACT |
| `causation_id` | **bezprostredná príčina** — id **iného eventu** | jeden krok | n/a | všetko okrem koreňových eventov |
| `idempotency_key` | **identita zámeru**, nie pokusu | jeden zámer | **áno** | akcie s externým efektom |

**Prečo `run_id` musí existovať (nález P0-7):** v1 nemalo ako odlíšiť „agent to skúsil trikrát" od „agent to spravil trikrát". Pri rovnakom `correlation_id` a rovnakom `idempotency_key` sú tri pokusy nerozlíšiteľné bez `run_id`. To znemožňuje merať spoľahlivosť agenta (`success rate`, `retries` z founder tézy §11).

**`workflow_id` — zámerne vynechaný.**
Dôvod nie je „nepotrebujeme identity", ale **neexistuje orchestrátor, ktorý by ho vydával**. `memory/decisions.md` ADR-001 (2026-08-03) hovorí: *„Piaty uzol = orchestrátor. Do štyroch sa reporty čítajú jednotlivo."* Dnes žiadny beh nezahŕňa viac agentov pod jedným zámerom. Pridať `workflow_id` teraz by znamenalo stĺpec, ktorý by bol 100 % NULL a nikto by ho neplnil — presne vzor, ktorý U1 našiel pri `lead_events`.

**Odomykacia podmienka:** akonáhle vznikne orchestrátor (ADR-001, piaty uzol), `workflow_id` sa pridá ako ďalší aditívny stĺpec. Je to jeden `ADD COLUMN`, nie refaktor — `correlation_id` zostane vnoreným vláknom pod ním.

### 4.6 Lead → Value trace

Povinné: dopredu aj spätne. Stav každého článku **podľa merania**, nie podľa priania.

| # | Článok | Stav | Zdroj / prečo nie |
|---|---|---|---|
| 1 | SIGNAL | **[UNKNOWN]** | pôvod leadu nie je v `platform_events.payload`; `leads` má zdroj, ale nebol v rozsahu merania |
| 2 | LEAD | **[EXISTING]** | `lead.created` 970 eventov |
| 3 | UNDERSTANDING | **[TARGET]** | `client_dna` = 0 riadkov |
| 4 | SCORE | **[TARGET]** | `lead_scores` = 0 riadkov |
| 5 | RECOMMENDATION | **[TARGET]** | `ai_recommendations` = 0 riadkov |
| 6 | STRATEGY | **[EXISTING]**, čiastočne | `decisions` 240 riadkov (len `followup_agent`) |
| 7 | APPROVAL | **[DESIGNED]** nedurable | in-memory `Map`; 0 `human_approved` v audite |
| 8 | ACTION | **[EXISTING]**, odpojená | `ai_action_audit` 146, ale `lead_id` 0× |
| 9 | MESSAGE | **[EXISTING]** | `subject_preview` + `body_hash` |
| 10 | RESPONSE | **[TARGET]** | reaction events neexistujú (D-04) |
| 11 | APPOINTMENT | **[UNKNOWN]** | `scheduled_events` na PROD **neexistuje** |
| 12 | OPPORTUNITY | **[UNKNOWN]** | `lead_conversions` na PROD **neexistuje** |
| 13 | DEAL | **[EXISTING]**, 1 riadok | `deal_outcomes` |
| 14 | REVENUE | **[EXISTING]** | `deal_outcomes.price`, `credit_ledger` |
| 15 | LEARNING | **[TARGET]** | `exclusivity_outcomes` = 0 |

**Čestný záver:** z 15 článkov je dnes 5 `[EXISTING]`, 3 `[UNKNOWN]`, 7 `[TARGET]`. **Reťaz je prerušená na článkoch 10, 11 a 12** — po odoslaní správy systém nevie, či prišla odpoveď, či vzniklo stretnutie a či vznikla príležitosť. Spätná trasa z REVENUE sa dnes zastaví na článku 13.

Spine v2 tú reťaz **nesplní sám**. Dáva jej tvar (`correlation_id` naprieč všetkými článkami) a odstraňuje technickú prekážku. Články 10–12 potrebujú producentov, ktorí sú mimo CP-P0-1.

### 4.7 Consumer contract

| Pravidlo | Dôvod |
|---|---|
| Konzument **musí** ignorovať neznámy `event_type` | nové typy nesmú rozbiť staré konzumenty |
| Konzument **musí** ignorovať neznáme polia v `payload` | forward compatibility |
| Konzument **musí** vetviť podľa `schema_version` alebo čítať cez kompatibilný view | politika kompatibility §11.5 — história ostáva čitateľná, v2 je jediný kanonický kontrakt |
| Konzument **nesmie** predpokladať poradie doručenia | §8 (reordering) |
| Konzument **musí** byť idempotentný voči `id` | at-least-once |
| Konzument **nesmie** písať do spine v reakcii na čítanie zo spine bez `causation_id` | inak nedohľadateľné slučky |

**Kompatibilný view [TARGET]:**
```sql
CREATE VIEW control_events_v2 AS
SELECT id, agency_id, event_type,
       COALESCE(occurred_at, created_at) AS occurred_at,
       created_at AS recorded_at,
       COALESCE(actor_kind, 'system')    AS actor_kind,
       COALESCE(source, 'legacy')        AS source,
       COALESCE(schema_version, 1)       AS schema_version,
       entity_type, entity_id, correlation_id, causation_id, payload, provenance
FROM public.platform_events;
```
Traja existujúci konzumenti (§2.3) sa prepnú na view. To je implementácia, nie súčasť tejto špecifikácie.

### 4.8 Immutability, idempotency, replay, ordering

| Vlastnosť | Pravidlo | Dnešný stav |
|---|---|---|
| **Immutability** | žiadny UPDATE/DELETE; explicitné `REVOKE` + guard trigger | **de-facto splnené** pre `authenticated` (žiadna policy), **nesplnené** pre `service_role` (obchádza RLS) |
| **Idempotency** | `UNIQUE (agency_id, event_type, idempotency_key)`; duplikát = no-op, nie chyba | [TARGET] |
| **Ordering** | poradie **len** v rámci `(entity_type, entity_id)` podľa `occurred_at`; globálne poradie sa negarantuje | [TARGET] |
| **Replay** | čítanie histórie podľa `correlation_id` je vždy povolené; **re-emitovanie je zakázané** — replay rekonštruuje, negeneruje | [TARGET] |
| **Retention** | **[UNKNOWN — REQUIRES VERIFICATION]**, viď §6 | žiadny mechanizmus nenájdený |

> **DECISION D-06 (prepísané v v1.1 — P0-3):** Zaviesť stĺpec `scope` ako **diskriminátor tenant vs platforma** a viazať `agency_id` naň CHECK-om. **Sentinel agentúra sa nepoužije.**
>
> ```sql
> scope text NOT NULL DEFAULT 'tenant' CHECK (scope IN ('tenant','platform'))
> CHECK ( (scope = 'tenant'   AND agency_id IS NOT NULL)
>      OR (scope = 'platform' AND agency_id IS NULL) )
> ```
>
> **WHY (nález hardeningu):** v1 navrhovalo vyhradenú sentinel agentúru `SYSTEM_USAGE_AGENCY_ID`. To je **zameniteľné so zákazníckym tenantom** — je to riadok v `agencies` ako každý iný. Systém ho dnes odlišuje len tým, že ho `parseOperatorAgencyExcludeList()` (`lib/operator/config.ts`) vylučuje z metrík. **Jedna chyba v exclusion liste a platformové eventy sa počítajú ako zákaznícke.** Diskriminátor v schéme túto triedu chýb odstraňuje úplne — nie je na čo zabudnúť.
>
> **ALTERNATIVES:** (a) Sentinel agentúra (v1.0) — zamietnuté, dôvod vyššie. (b) Nechať `agency_id` nullable bez `scope` a len opraviť policy — zamietnuté, NULL by naďalej znamenal dve rôzne veci („platformový" vs „zabudli sme vyplniť"). (c) Dve tabuľky, tenant a platform zvlášť — zamietnuté, rozbíja jeden spine a korelácia naprieč nimi by potrebovala union.
>
> **TRADE-OFFS:** `agency_id` zostáva nullable v type, ale CHECK robí NULL **významovým**, nie náhodným. Cena: zložený CHECK sa musí udržiavať pri každej zmene.
>
> **CONSEQUENCES:**
> 1. RLS policy znie `scope = 'tenant' AND agency_id IN (profile_agencies_for_auth())` — vetva `agency_id IS NULL` **zaniká**, a s ňou aj latentná diera z §2.1. Platformové eventy nie sú pre nájomcu viditeľné vôbec.
> 2. `emit_platform_event` musí prijať `scope` a odmietnuť nekonzistentnú kombináciu.
> 3. `/operator` a platformové agregácie čítajú `scope='platform'` cez `service_role`.
>
> **REVERSIBILITY:** Vysoká — `scope` sa dá zahodiť, CHECK zrušiť.
> **DEPENDENCIES:** D-07 (resolver), U-C.
> **MIGRATION IMPACT:** ADD COLUMN `scope` DEFAULT `'tenant'` (všetkých 1 417 existujúcich riadkov je tenant — overené: 0 riadkov s NULL `agency_id`), potom pridať CHECK, potom vymeniť policy. **Žiadny backfill.** Bez `SET NOT NULL` na `agency_id` — CHECK ho nahrádza a je presnejší.

---

## 5. Multi-tenant, security, RLS

### 5.1 Dnešný stav — [EXISTING]

| Vrstva | Stav |
|---|---|
| RLS na `platform_events` | zapnuté |
| SELECT policy | `platform_events_select_tenant` — `agency_id IS NULL OR agency_id IN (SELECT p.agency_id FROM profiles p WHERE p.auth_user_id = auth.uid() AND p.agency_id IS NOT NULL)` |
| INSERT / UPDATE / DELETE policy | **žiadna** → pre `authenticated` odmietnuté |
| Zápis | výhradne cez `SECURITY DEFINER` funkciu `emit_platform_event` alebo `service_role` |

**Dva nálezy v dnešnej policy:**

1. **`agency_id IS NULL` vetva** — riadok bez tenanta vidí každý prihlásený. Dnes 0 riadkov, latentné. Rieši D-06.
2. **Nekonzistentný tenant resolver.** Táto policy používa inline `profiles p WHERE p.auth_user_id = auth.uid()`. `lead_events` a ostatné Wave-A tabuľky používajú funkciu `profile_agencies_for_auth()`. Dva rôzne výrazy pre tú istú otázku = dve miesta, kde sa dá spraviť chyba. CP-EVIDENCE navyše pripomína (`decisions.md`, 2026-09-02), že na PROD `profiles.id ≠ auth.uid()`, takže resolver **musí** riešiť aj `id`-variant. Táto policy to nerobí.

> **DECISION D-07:** Spine používa `profile_agencies_for_auth()`, nie inline výraz.
> **WHY:** Jeden resolver = jedno miesto na opravu. Vzor je už zavedený vo Wave A (`20260616123000_rls_wave_a_hardening.sql`).
> **TRADE-OFFS:** Funkcia v policy má cenu za výkon oproti inline výrazu. Pri dnešnom objeme irelevantné.
> **REVERSIBILITY:** Vysoká. **MIGRATION IMPACT:** DROP + CREATE policy, bez dopadu na dáta. **[UNKNOWN]:** či `profile_agencies_for_auth()` na PROD pokrýva `id`-variant — vyžaduje overenie pred zmenou.

### 5.2 Founder cross-tenant prístup

Founder číta naprieč nájomníkmi. To je **zámer Control Plane**, a zároveň najcitlivejšia časť.

> **DECISION D-08:** Cross-tenant čítanie ide výhradne cez `service_role` v serverovom kóde za `canAccessOperatorDashboard()`, **nie cez rozšírenú RLS policy pre platform-admina**.
> **WHY:** Rozšírenie policy by dalo cross-tenant SELECT každému klientovi s JWT platform-admina — vrátane prehliadača. Dnešný `/operator` už robí správnu vec: gate najprv, `createAdminClient()` až potom (`app/operator/page.tsx`).
> **ALTERNATIVES:** (a) Policy `OR is_platform_admin` — zamietnuté, rozširuje plochu útoku na klienta. (b) Samostatná read-replica — zamietnuté ako predčasné.
> **CONSEQUENCES:** Každý cross-tenant prístup musí byť **auditovaný ako `SECURITY_EVENT`** (`security.cross_tenant_read`). Dnes sa neaudituje.
> **REVERSIBILITY:** Vysoká. **DEPENDENCIES:** §6 (GDPR — cross-tenant čítanie PII má vlastný právny základ).

### 5.3 Izolačné invarianty

| Invariant | Vynucuje |
|---|---|
| Event bez tenanta nesmie vzniknúť | D-06, guard v `emit_platform_event` |
| Konzument s JWT nesmie vidieť cudzí tenant | RLS + D-07 |
| Cross-tenant čítanie musí zanechať stopu | D-08 + `SECURITY_EVENT` |
| `correlation_id` nesmie spájať dva tenanty | guard: všetky eventy s rovnakým `correlation_id` musia mať rovnaký `agency_id` |

Posledný invariant je netriviálny a **dnes nevynútený** — je to cesta, ako by sa cez korelačný graf dali spojiť dvaja klienti. Vynútenie: partial unique / check trigger, alebo periodický audit dotaz. Rozhodnutie odložené do implementácie.

---

## 6. PII a GDPR — architektonická hranica

### 6.1 Dokázaný fakt

U1 (09:19 UTC): trigger `trg_leads_platform_events` zapisuje do payloadu `'name', new.name`.

> **`public.platform_events.payload` obsahuje osobné údaje** — meno leadu, t. j. fyzickej osoby (predávajúci/kupujúci).

To **opravuje** môj vlastný záver v CP-EVIDENCE, kde som napísal, že `platform_events` PII neobsahuje, s poznámkou, že payload nebol vzorkovaný.

### 6.2 Klasifikácia citlivosti

Každý `event_type` v registri nesie `sensitivity`:

| Trieda | Význam | Príklad | Retencia |
|---|---|---|---|
| `NONE` | bez osobných údajov | `system.cron_ran`, `cost.incurred` | dlhá |
| `PSEUDONYM` | identifikátory bez obsahu | `lead_id`, `profile_id`, `body_hash` | dlhá |
| `PERSONAL` | osobné údaje | meno, e-mail, telefón | **krátka, [UNKNOWN]** |
| `SENSITIVE` | osobitná kategória | — (Revolis by nemal mať) | zakázané v spine |

### 6.3 Payload vs reference

> **DECISION D-09:** Payload nesie **odkazy, nie obsah**. `lead_id` áno, `name` nie.
>
> **WHY:** Tri dôvody. (1) Event store je *append-only* — osobný údaj v ňom sa nedá opraviť ani vymazať bez porušenia immutability. (2) Právo na výmaz (čl. 17 GDPR) sa na immutable log aplikuje ťažko; ak je tam len `lead_id`, výmaz leadu spraví event automaticky bezobsažným. (3) Data minimization (čl. 5(1)(c)) je požiadavka, nie odporúčanie.
>
> **ALTERNATIVES:** (a) Ponechať meno a riešiť výmaz crypto-shreddingom — zamietnuté ako neprimerane zložité na dnešný objem. (b) Ponechať meno a spoľahnúť sa na RLS — zamietnuté, nerieši výmaz ani cross-tenant čítanie founderom.
>
> **CONSEQUENCES:** Dvojaké.
> (1) Trigger sa musí zmeniť — prestane emitovať `name`. To je zmena správania existujúceho producenta a patrí do D-10.
> (2) **1 417 historických riadkov obsahuje mená.** Ich scrub je **zápis do PROD dát** a preto **nie je súčasťou žiadnej dnešnej brány** — potrebuje vlastné `GO PII-SCRUB-BACKFILL` s rozhodnutím, či sa `payload - 'name'` aplikuje na históriu, alebo sa história ponechá s kratšou retenciou.
>
> **REVERSIBILITY:** Dopredu vysoká, spätne nulová (scrub je nezvratný).
> **DEPENDENCIES:** D-10, právny základ (§6.5).
> **MIGRATION IMPACT:** Žiadny na schému. Zmena triggera + samostatná brána na históriu.

### 6.4 Prístupová hranica

| Aktér | Rozsah | Mechanizmus |
|---|---|---|
| Používateľ nájomcu | vlastný `agency_id` | RLS (D-07) |
| Founder / platform admin | naprieč | `service_role` za gate (D-08) + `SECURITY_EVENT` audit |
| Agent | vlastný `agency_id` behu | `RunContext.tenantId`, žiadny globálny klient |
| Externá integrácia | zápis do vlastného `source` | dedikovaná rola, žiadny SELECT |

### 6.5 Právny základ — **[UNKNOWN — REQUIRES VERIFICATION]**

| Otázka | Stav | Blokuje | Priorita |
|---|---|---|---|
| Právny základ pre cross-tenant čítanie PII founderom (6(1)(f) + balancing test) | **[UNKNOWN]** | D-08, zapnutie `/operator` | **P0** |
| Retenčná lehota pre `PERSONAL` eventy | **[UNKNOWN]** | retention policy, D-09 | **P0** |
| Či zmluvy s nájomcami pokrývajú spracovanie v event store | **[UNKNOWN]** | celý spine | **P1** |
| Postup pri žiadosti o výmaz (čl. 17) voči append-only logu | **[UNKNOWN]** | D-09 | **P1** |

**Nevymýšľam právny záver.** CLAUDE.md §5 vyžaduje beh skillu `gdpr-advisor` proti zvolenému zdroju pred implementáciou. Ten beh **neprebehol** a je **tvrdou podmienkou** pre `GO CP-P0-1-IMPL`.

---

## 7. Vlastníctvo DB triggera

### 7.1 Problém

`trg_leads_platform_events`, `emit_platform_event()` aj samotná tabuľka `platform_events` existujú na PROD a **nie sú v žiadnej repo migrácii**. Migračná história: **49 riadkov vs 102 súborov** v repe (15. 8. bolo 47 vs 94 — medzera rastie).

Dôsledok: obnova DB z migrácií by vytvorila systém **bez event streamu**, a nikto by si to nevšimol, kým by sa niekto nepozrel na `/operator`.

### 7.2 Rozhodnutie

> **DECISION D-10:** Zachytenie triggera prebehne **až po schválení tejto špecifikácie** a zachytí **cieľový tvar (v2)**, nie dnešný.
>
> **WHY:** Zachytenie dnešného tvaru by zabetónovalo `name` v payloade (v rozpore s D-09) a chýbajúce `correlation_id`/`actor`/`source` (v rozpore s D-01). Vznikla by migrácia, ktorú treba hneď nahradiť ďalšou.
>
> **ALTERNATIVES:** (a) Zachytiť teraz „ako-je", potom upraviť — zamietnuté: dve migrácie namiesto jednej a medzičas, keď je v repe zafixované PII. (b) Nezachytávať a spravovať trigger ručne — zamietnuté: to je dnešný stav a je to hlavné riziko.
>
> **TRADE-OFFS:** Medzi dnes a implementáciou zostáva trigger nezálohovaný v repe. Riziko: obnova DB v tomto okne. Akceptované ako krátkodobé; ak sa implementácia posunie o týždne, `GO EVT-TRIGGER-CAPTURE` v „ako-je" podobe sa stáva rozumnou poistkou — to je founder rozhodnutie, nie technické.
>
> **CONSEQUENCES:** Capture migrácia musí byť **idempotentná** (`CREATE OR REPLACE FUNCTION`, `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`), aby prešla aj na DB, kde objekt už existuje.
>
> **REVERSIBILITY:** Vysoká.
> **DEPENDENCIES:** D-09 (payload bez PII), D-01 (nové stĺpce musia existovať skôr, než ich trigger začne plniť).
> **MIGRATION IMPACT:** Poradie je záväzné: **(1)** ADD COLUMN → **(2)** capture `emit_platform_event` v2 → **(3)** capture trigger v2. Opačné poradie zlyhá na neexistujúcich stĺpcoch.

### 7.3 Drift detection — [TARGET]

Zachytenie samo drift nezastaví; U1 dokázal, že drift vzniká ticho. Preto kontrakt vyžaduje **detekciu**:

CI krok (read-only, proti PROD alebo proti ephemeral DB po `db reset`), ktorý porovná `pg_get_functiondef()` a `pg_get_triggerdef()` s očakávaným tvarom z repa a **zlyhá pri rozdiele**. Existuje precedens — repo už má `schema-governance-guard.yml` a `code-contract-guard.yml`.

**[UNKNOWN]:** či má CI prístup k PROD na read-only porovnanie, alebo sa drift kontroluje len proti lokálnej DB. Prvé je silnejšie a rizikovejšie; rozhodnutie patrí founderovi.

---

## 8. Adversarial architecture tests

Formát: **PROBLEM → IMPACT → MITIGATION → RESIDUAL RISK**. Invariant je uvedený tam, kde je netriviálny.

| # | Problém | Dopad | Mitigácia | Zvyškové riziko |
|---|---|---|---|---|
| 1 | **Duplicate event** (retry producenta) | dvojité počítanie v `reaction24h`, cost | `UNIQUE (agency_id, event_type, idempotency_key)`; duplikát = no-op | Eventy bez `idempotency_key` (napr. z triggera) sa deduplikovať nedajú — **stredné** |
| 2 | **Missing event** (emit zlyhal) | slepé miesto, decision bez observácie | fail-closed pre DECISION/APPROVAL/OUTCOME (§4.3); CRM eventy v transakcii leadu | Best-effort kategórie môžu ticho chýbať — **stredné** |
| 3 | **Reordered event** | konzument vidí `outcome` pred `action` | poradie garantované len v rámci `(entity_type, entity_id)` podľa `occurred_at`; konzument musí byť order-agnostický (§4.7) | Konzument, ktorý pravidlo poruší — **nízke**, chytí code review |
| 4 | **Concurrent agents** na tom istom leade | dve akcie, jeden zámer | `idempotency_key` obsahuje `decisionId`; advisory lock na `(tenant, entity)` počas ACT | Dvaja agenti s odlišným `decisionId` legitímne konajú súbežne — **návrhové, nie chybové** |
| 5 | **Retry** | duplikát akcie | rovnaký `idempotency_key`, nové `action_id`, rovnaký `correlation_id` | Externý systém (e-mail) môže odoslať 2× pri timeout — **stredné**, viď #6 |
| 6 | **Timeout** pri ACT | neznámy stav u externého systému | `status: "partial"` + `outcome_unknown{not_observable}`; reconciliácia cez `provenance.sourceRef` | Nedá sa vylúčiť dvojité odoslanie e-mailu — **vysoké** pre `externallyVisible` akcie → argument pre `APPROVAL_REQUIRED` |
| 7 | **Partial failure** | polovičný stav | `partial` je platný stav; outcome povinný aj preň | Definícia „partial" je per-akcia — **nízke** |
| 8 | **Replay** | duplicitné side-effecty | replay **iba číta** (§4.8); re-emit zakázaný | Omyl v implementácii — **stredné**, chytí test |
| 9 | **Stale event** (oneskorený integračný) | výpočet za staré okno | `occurred_at` ≠ `created_at` (D-02); agregácie podľa `occurred_at` | Event starší než retenčné okno — **nízke** |
| 10 | **Malformed payload** | konzument spadne | `payload jsonb NOT NULL DEFAULT '{}'`; konzument ignoruje neznáme polia | Chýbajúce očakávané pole = `unavailable`, nie pád — **nízke** |
| 11 | **Schema version mismatch** | v1 konzument číta v2 | `schema_version` + kompatibilný view (§4.7) | Konzument čítajúci tabuľku priamo — **stredné** |
| 12 | **Tenant leakage cez correlation_id** | spojenie dvoch klientov | invariant §5.3: rovnaké `correlation_id` ⇒ rovnaký `agency_id` | **Dnes nevynútené** — **vysoké**, kým nie je guard |
| 13 | **NULL tenant** | riadok viditeľný všetkým (dnešná policy) | D-06: sentinel namiesto NULL, odstrániť `IS NULL` vetvu | Latentné (0 riadkov dnes), ale reálne — **vysoké**, kým sa policy neopraví |
| 14 | **PII exposure** | meno v payloade, cross-tenant čítanie | D-09 (referencie), D-08 (gate + audit) | **1 417 historických riadkov s menami** — **vysoké**, kým nebude `GO PII-SCRUB-BACKFILL` |
| 15 | **Deleted lead** | event ukazuje na neexistujúci lead | spine **nemá** FK na `leads`; event prežije lead zámerne | Payload `lead_id` je sirota — **nízke**, zámer |
| 16 | **Deleted profile** | strata histórie | spine neviaže `ON DELETE CASCADE` na profil | `public.events` túto chybu **má** (CASCADE) — ďalší argument ju nepoužiť — **nízke** |
| 17 | **Trigger failure** | lead sa nezapíše (fail-closed) | zámer: lead bez eventu je neviditeľný lead | Chyba v triggeri zastaví príjem leadov — **vysoké**, vyžaduje test pokrytie a alert |
| 18 | **Migration rollback** | stĺpce zmiznú, trigger v2 padne | poradie D-10; rollback opačne: trigger v1 → stĺpce | Rollback triggera bez rollbacku stĺpcov = nekonzistencia — **stredné** |
| 19 | **Schema drift** | opakovanie dnešného stavu | drift-detection CI (§7.3) | Objekty vytvorené ručne mimo migrácií medzi behmi — **stredné** |
| 20 | **Multiple Vercel instances** | approval v pamäti jednej inštancie | durable approvals (CP-P0-2) | **Dnes aktívne riziko** — `new Map()` — **vysoké**, mimo scope tejto brány |
| 21 | **Serverless cold start** | strata in-flight stavu | žiadny stav mimo DB; `correlation_id` v requeste | Nedokončená slučka po cold starte → `outcome_unknown` — **nízke** |
| 22 | **Duplicate action** | dvojitý e-mail | #1 + #5 | viď #6 — **stredné** |
| 23 | **Approval race** (dvaja schvaľovatelia) | dve `APPROVED` | `UPDATE ... WHERE state='PENDING'` s optimistickým zámkom; víťaz jeden | — **nízke** |
| 24 | **Expired approval** | akcia po expirácii | kontrola `expires_at` **pri ACT**, nie pri APPROVE | Hodiny medzi inštanciami — **nízke** |
| 25 | **Rejected approval** | agent koná napriek zamietnutiu | `act()` implementuje platforma, nie agent (§3.3) | Agent obchádzajúci `RunContext` — **stredné**, chytí review |
| 26 | **Action succeeded, outcome missing** | **dnešný stav: 240 decisions / 0 outcomes** | SLA timeout → `outcome_unknown{too_early}` + `recheckAfter`; otvorená slučka je alert | Bez alertu sa to opakuje — **vysoké**, je to práve dnešná diera |
| 27 | **Outcome pred potvrdením akcie** | outcome bez príčiny | `causation_id` musí ukazovať na existujúci `action_id`; inak event odmietnutý | Externý outcome (odpoveď klienta) môže dôjsť skôr než audit akcie — **stredné**, riešiť `occurred_at` |

**Tri riziká s hodnotením „vysoké", ktoré sú dnes aktívne a nie hypotetické:** #14 (PII v histórii), #20 (in-memory approvals), #26 (neuzavretá slučka). Prvé dve majú vlastné brány, tretie je dôvod existencie tohto kontraktu.

---

## 9. Observability, failure a recovery

| Vrstva | Signál | Zdroj | Stav |
|---|---|---|---|
| Emit health | pomer úspešných emitov | aplikačná metrika | [TARGET] |
| **Otvorené slučky** | decisions bez outcome starších než SLA | dotaz nad `decisions` ⋈ outcome eventy | [TARGET] — **najdôležitejší signál celého kontraktu** |
| Authority | podiel `FORBIDDEN` / `APPROVAL_REQUIRED` | approval eventy | [TARGET] |
| Drift | rozdiel PROD vs repo pre trigger/funkciu | CI (§7.3) | [TARGET] |
| Tenant integrita | `correlation_id` cez viac tenantov | periodický audit | [TARGET] |
| PII | eventy triedy `PERSONAL` s obsahom namiesto odkazu | lint nad registrom + audit dotaz | [TARGET] |

**Signál „otvorená slučka" existuje presne preto, aby sa dnešný stav (240 open / 0 outcomes) nedal zopakovať ticho.** Bez neho je kontrakt len dokument.

Recovery model:

| Scenár | Postup |
|---|---|
| Emit zlyhal pri fail-closed kategórii | transakcia sa rollbackne, akcia sa nevykoná, chyba ide hore |
| Emit zlyhal pri best-effort | zaloguje sa, beh pokračuje, chýbajúci event je viditeľný ako medzera v korelácii |
| Slučka otvorená nad SLA | `outcome_unknown{too_early}` + `recheckAfter`; po druhom uplynutí alert |
| Drift detegovaný | CI zlyhá, PROD sa **nemení automaticky**; rozdiel rieši človek |

### 9.1 FINAL INVARIANT REGISTER

Každý invariant má vlastníka, miesto vynútenia, spôsob detekcie, test a dôsledok pri porušení. Invariant bez detekcie je želanie — to je poučenie z `lead_events`.

| ID | Invariant | Owner | Enforcement | Detection | Test | Failure mode |
|---|---|---|---|---|---|---|
| **I-001** | Nájomca vidí len vlastné eventy | DB | RLS policy `scope='tenant' AND agency_id IN profile_agencies_for_auth()` | cross-tenant SELECT test v CI | `rls-tenant-isolation.test.ts` rozšírený | **kritické** — únik dát medzi klientmi |
| **I-002** | Tenant event nesmie mať NULL tenanta | DB | CHECK z D-06 | CHECK odmietne insert | migračný test | insert zlyhá — hlučné, správne |
| **I-003** | Jedno `correlation_id` nesmie spájať dvoch tenantov | DB + audit | **[TARGET]** — dnes nevynútené | periodický dotaz `HAVING count(DISTINCT agency_id) > 1` | adversariálny test #12 | **kritické** — korelačný graf spojí klientov |
| **I-004** | Každá akcia mapuje na práve jedno rozhodnutie | platforma | `act()` prijíma `Decision`, typ to vyžaduje | akcia s `causation_id` bez decision eventu | kontraktový test | agent koná bez zámeru |
| **I-005** | Každé rozhodnutie mapuje na ≥1 observáciu | platforma | `decide()` prijíma `Observation[]` | `decision.observations = []` | kontraktový test | rozhodnutie bez dôkazu |
| **I-006** | Akcia končí outcome alebo explicitným `unknown` | reconciler | §3.8.2 reconciler + SLA | **dotaz „otvorené slučky"** (§9) | regresný test na dnešných 240/0 | **dnes porušené** — 240 open / 0 outcomes |
| **I-007** | `FORBIDDEN` nie je prekonateľné approvalom | platforma | `resolveAuthority` beží **pred** approvalom aj **pri** ACT | approval pre `FORBIDDEN` akciu | unit test | obídenie zákazu |
| **I-008** | Approval je durable | DB | tabuľka namiesto `new Map()` | approval prežije restart procesu | integračný test | **dnes porušené** — in-memory |
| **I-009** | Schválená akcia sa vykoná najviac raz **na platforme** | DB | `UNIQUE (agency_id, event_type, idempotency_key)` | duplicitný insert = no-op | property test | dvojitá akcia |
| **I-010** | Replay nevytvára side-effecty | platforma | replay je **read-only** cesta, iná funkcia než emit | code review + test, že replay nevolá provider | integračný test | duplicitné e-maily z auditu |
| **I-011** | Payload nesie odkazy, nie osobné údaje | producent + lint | trigger v2 bez `name` (D-09) | audit dotaz na `PERSONAL` typy s obsahom | test triggera | **dnes porušené** — 1 417 riadkov s menami |
| **I-012** | Neznáme dáta sú `unavailable`, nikdy vymyslené | konzument | `availability` v `Observation`, `MetricAvailability` | GUARD test na zakázané reťazce (AP-001) | existujúci GUARD rozšírený | fake metriky |
| **I-013** | Neznámy `event_type` nesmie rozbiť konzumenta | konzument | default vetva povinná | konzument s neznámym typom | integračný test | kaskádový výpadok |
| **I-014** | Nekompatibilita schémy je detegovateľná | observability | `schema_version` + cutover dotaz (§11.5) | `count WHERE schema_version=1 AND created_at > cutover` | monitoring | tichý návrat k v1 |
| **I-015** | Provenance je rekonštruovateľná | producent | `payload._provenance` povinné pre odvodené | audit na chýbajúce `_provenance` | kontraktový test | číslo bez pôvodu |

**Tri invarianty sú dnes porušené a nie sú hypotézou:** I-006 (240/0), I-008 (`new Map()`), I-011 (mená v payloade). I-003 nie je porušený, ale **nie je ani vynútený**.

---

## 10. Testing strategy

| Úroveň | Čo overuje | Poznámka |
|---|---|---|
| Kontraktové unit testy | `resolveAuthority` — tabuľka §3.4, vrátane „FORBIDDEN sa nedá prekonať approvalom" | čistá funkcia, ľahko testovateľná |
| Kontraktové property testy | idempotency: dvojitý emit s rovnakým kľúčom = 1 riadok | |
| Integračné (ephemeral DB) | trigger v2 emituje bez `name`; RLS cross-tenant test | repo už má `rls-tenant-isolation.test.ts` — rozšíriť |
| Migračné | poradie D-10 prejde na čistej DB **aj** na DB s existujúcimi objektmi | idempotencia |
| Drift | `pg_get_functiondef` vs repo | §7.3 |
| Adversariálne | minimálne testy #1, #12, #13, #23, #26 z §8 | ostatné podľa uváženia |
| **Zakázané** | skipovanie, disabling alebo karanténa testu kvôli zelenému CI | pravidlo repa |

**Jeden test, ktorý musí existovať a dnes neexistuje:** „decision bez outcome po SLA je detegovaná". To je regresný test na dnešnú dieru.

---

## 11. Migračná stratégia, kompatibilita, rollback

### 11.1 Poradie (záväzné)

```
1. packages/control-contract        typy + resolveAuthority, žiadna DB zmena
2. ADD COLUMN × 12 + 4 indexy       aditívne; kanonický zoznam §4.2.1
3. control_events_v2 view           kompatibilná vrstva
4. capture emit_platform_event v2   idempotentné, bez PII v payloade (D-09)
5. capture trg_leads_platform_events v2
6. RLS: profile_agencies_for_auth() (D-07)
7. jeden agent migrovaný na kontrakt ako dôkaz
```

Kroky 1–3 sú **bez zmeny správania**. Krok 4 mení payload (prestane niesť `name`) — prvá zmena, ktorá je viditeľná navonok.

### 11.2 Backward compatibility

| Konzument | Dopad krokov 2–3 | Dopad kroku 4 |
|---|---|---|
| `app/api/events/stream/route.ts` | žiadny (nové stĺpce ignoruje) | žiadny (nečíta `name`) |
| `hooks/usePlatformRealtime.ts` | žiadny | **[UNKNOWN]** — či UI zobrazuje `payload.name`; treba overiť pred krokom 4 |
| `app/api/system/health-dashboard/route.ts` | žiadny (agregát) | žiadny |

**[UNKNOWN — REQUIRES VERIFICATION], P1:** či niektorý UI komponent renderuje `payload.name` z realtime eventu. Blokuje krok 4, nie kroky 1–3.

### 11.3 Rollback

| Krok | Rollback | Strata dát |
|---|---|---|
| 1 | odstrániť balík | žiadna |
| 2 | `DROP COLUMN` | dáta v nových stĺpcoch (v čase rollbacku prázdne) |
| 3 | `DROP VIEW` | žiadna |
| 4–5 | `CREATE OR REPLACE` späť na v1 tvar | žiadna; payload sa vráti k `name` |
| 6 | obnoviť pôvodnú policy | žiadna |
| 7 | revert agenta | žiadna |

**Nezvratné nie je nič** v krokoch 1–7. Nezvratný je len `GO PII-SCRUB-BACKFILL`, ktorý **nie je súčasťou tohto poradia**.

### 11.5 Politika kompatibility — nahrádza „koexistujú natrvalo"

v1.0 tvrdilo, že „riadky v1 a v2 koexistujú natrvalo". To nebolo rozhodnutie, ale vyhnutie sa mu. Presná politika má tri oddelené záväzky:

| Záväzok | Obsah | Horizont |
|---|---|---|
| **A — čitateľnosť histórie** | 1 417 v1 riadkov ostáva **čitateľných navždy** cez `control_events_v2` view s definovanými defaultmi. Nikdy sa neprepisujú ani nemažú kvôli schéme. | trvalý |
| **B — kanonický kontrakt** | **v2 je jediný kontrakt, ktorý smie nový producent emitovať.** Po dni cutoveru je emisia v1 chybou, nie voľbou. | od cutoveru |
| **C — horizont kompatibility konzumenta** | Konzument smie čítať cez view a nemusí poznať v1. Priame čítanie tabuľky bez vetvenia na `schema_version` je po cutovere zakázané. | od cutoveru |

**Čo je cutover:** deň, keď `emit_platform_event` v2 a trigger v2 idú na PROD (kroky 4–5 v §11.1). Od toho okamihu žiadny nový riadok nesmie mať `schema_version = 1`.

**Vynútenie (I-014):** CHECK nie — rozbil by historické riadky. Namiesto toho **detekčný dotaz** v observability: `count(*) WHERE schema_version = 1 AND created_at > <cutover>` musí byť trvalo 0. Nenulová hodnota = producent obchádza kontrakt, alert.

**Čo sa NEsľubuje:** že v1 riadky niekedy dostanú `correlation_id`, `actor` alebo `entity_type`. Nedostanú — tie informácie v čase ich vzniku neexistovali a **domyslieť ich by bola fabrikácia** (AP-001). Historické riadky sú `unavailable` v tých poliach, a je to správne.

### 11.4 Deprecation `lead_events`

Netýka sa CP-P0-1 implementácie, ale kontrakt ju musí pomenovať:

```
FÁZA 1  označiť deprecated v kóde + dokumentácii, ponechať
FÁZA 2  konzumenti (gather.ts, guardian/runner.ts, enterprise-intelligence-store.ts,
        realtime, prod audit skript) prepnutí na spine
FÁZA 3  endpoint POST /api/ai/lead-events vráti 410 Gone
FÁZA 4  tabuľka ponechaná (0 riadkov, nulová cena) alebo zahodená samostatným GO
```
**Nikdy sa nemaže tabuľka, kým existuje čo i len jeden konzument.** Dnes ich je šesť.

---

## 12. Acceptance criteria a Definition of Done

### CP-P0-4 — Control Contract

**Acceptance:**
1. `packages/control-contract` exportuje všetky typy z §3.3 a kompiluje bez chýb.
2. `resolveAuthority` je čistá funkcia; tabuľka §3.4 je pokrytá testami vrátane „FORBIDDEN nie je prekonateľné approvalom".
3. Policy je dáta (JSON/TS konštanta), nie vetvenie roztrúsené v kóde.
4. Aspoň **jeden existujúci agent** je migrovaný a end-to-end na jednom leade emituje: observation → decision → authority → action → outcome, všetko s jedným `correlation_id`.
5. Ten beh je dohľadateľný jedným dotazom nad spine podľa `correlation_id`.
6. Agent **nemôže** obísť `resolveAuthority` — typy to znemožňujú (`act()` prijíma `AuthorityVerdict`, ktorý nevie vyrobiť sám).

**DoD:** acceptance 1–6 splnené · testy zelené lokálne aj v CI · `memory/decisions.md` zápis · žiadna zmena správania existujúcich agentov okrem migrovaného · dokumentácia kontraktu v repe.

**Kandidát na migrovaného agenta:** `lib/agents/followup` — už dnes píše do `decisions` (240 riadkov), takže má DECIDE fázu; chýba mu AUTHORIZE, OUTCOME a LEARN. Je to najkratšia cesta k uzavretiu prvej slučky.

### CP-P0-1 — Events Spine v2

**Acceptance:**
1. Osem stĺpcov pridaných; existujúcich 1 417 riadkov nedotknutých a čitateľných.
2. `control_events_v2` view vracia v1 aj v2 riadky s korektnými defaultmi.
3. Traja existujúci konzumenti fungujú bez zmeny správania.
4. Trigger a `emit_platform_event` sú v migrácii, idempotentnej na čistej aj existujúcej DB.
5. Trigger v2 **neemituje `name`**; nový event má `actor_kind`, `source`, `entity_type`, `entity_id`, `schema_version=2`.
6. RLS: cross-tenant SELECT test prejde; `agency_id IS NULL` vetva odstránená.
7. Drift-detection krok v CI existuje a pri umelo zavedenom rozdiele zlyhá.
8. Registri event typov pre aspoň `CRM_EVENT` a `AGENT_EVENT` sú vyplnené vrátane `sensitivity`.

**DoD:** acceptance 1–8 · `gdpr-advisor` prebehol a jeho záver je zapísaný · právny základ zodpovedaný alebo explicitne odložený founder rozhodnutím · rollback overený na ephemeral DB · `memory/decisions.md` zápis.

---

## 13. Open decisions — vyžadujú Founder GO

| # | Rozhodnutie | Prečo founder, nie agent |
|---|---|---|
| OD-1 | Prijať D-01 (spine = rozšírené `platform_events`, nie nová tabuľka) | určuje tvar systému na roky |
| OD-2 | Prijať D-04 (reaction events na spine, `lead_events` deprecated) | ruší investíciu do Enterprise vetvy |
| OD-3 | Prijať D-09 (payload = odkazy, trigger prestane emitovať `name`) | mení existujúce produkčné správanie |
| OD-4 | Kedy `GO PII-SCRUB-BACKFILL` na 1 417 historických riadkov | **nezvratné**, právny aj produktový rozmer |
| OD-5 | Či `GO EVT-TRIGGER-CAPTURE` v „ako-je" podobe ako poistka, ak sa implementácia posunie | trade-off riziko vs. dvojitá práca |
| OD-6 | Či drift-detection CI smie čítať PROD read-only | bezpečnostné rozhodnutie |
| OD-7 | Prijať D-06 (`agency_id` → `NOT NULL` v dvoch krokoch) | zmena constraintu na živej tabuľke |
| OD-8 | Ktorý agent sa migruje ako prvý (návrh: `followup`) | dotýka sa zákazníckej funkcie |
| **OD-9** | **`irreversible` → `APPROVAL_REQUIRED` ako podlaha, nie `FORBIDDEN`** (§3.4.1) | v1 pravidlo by zakázalo agentom odosielať e-maily aj so schválením — rušilo by platenú ponuku |
| **OD-10** | Či `externallyVisible` smie byť per-tenant override-nuteľné na `AUTONOMOUS` (§3.4.2) | strop na automatizáciu vs. kontrola; produktové, nie technické rozhodnutie |

---

## 14. UNKNOWN — REQUIRES VERIFICATION

| # | Čo chýba | Prečo blokuje | Evidence check | Priorita |
|---|---|---|---|---|
| U-A | Právny základ pre cross-tenant čítanie PII founderom | blokuje D-08 aj zapnutie `/operator` | beh `gdpr-advisor` + zápis 6(1)(f) balancing testu | **P0** |
| U-B | Retenčné lehoty pre `PERSONAL` eventy | bez nich sa nedá definovať retention ani scrub | právne rozhodnutie + zápis | **P0** |
| U-C | Či `profile_agencies_for_auth()` pokrýva `profiles.id ≠ auth.uid()` variant | blokuje D-07; chybná policy = alebo zamknutý prístup, alebo diera | `pg_get_functiondef('profile_agencies_for_auth')` na PROD | **P0** |
| U-D | Či UI renderuje `payload.name` z realtime eventu | blokuje krok 4 migrácie | grep konzumentov `usePlatformRealtime` | **P1** |
| U-E | Či CI má read-only prístup k PROD | určuje silu drift detekcie | overiť secrets a sieťovú cestu | **P1** |
| U-F | Ktorých 53 repo migrácií nie je v `schema_migrations` | neznámy rozsah driftu mimo `platform_events` | porovnať 102 súborov vs 49 riadkov | **P1** |
| U-G | Pôvod leadu (článok SIGNAL v §4.6) | neúplná lead→value trasa | preskúmať `leads` zdrojové stĺpce | **P2** |
| U-H | Či `scheduled_events` a `lead_conversions` majú vzniknúť, alebo sú opustené | články 11 a 12 trasy | founder rozhodnutie + repo audit | **P2** |
| U-I | Zámer pôvodných autorov Enterprise vetvy | ovplyvňuje OD-2 | žiadny ADR neexistuje; pravdepodobne nezistiteľné | **P3** |
| **U-J** | **Či `resend@^6.12.2` a `twilio@^5.13.1` podporujú idempotency kľúč** | bez neho je každá externe viditeľná akcia **at-least-once** a hrozí dvojitý e-mail klientovi (§3.8.3, test #6) | prečítať dokumentáciu oboch providerov — **nie z pamäte** (AP-005) | **P0** |
| **U-K** | **Či `T1` (decision + event + intent) reálne prejde ako jedna transakcia cez existujúci RPC idióm** pri Supabase service-role klientovi | ak nie, fail-closed z §3.8.2 nie je vynútiteľné a I-004/I-005 padajú | napísať jednu plpgsql funkciu a overiť rollback pri úmyselnej chybe na ephemeral DB | **P0** |
| **U-L** | Či existuje spoľahlivý zdroj pre `reversible` príznak akcie | `resolveAuthority` bez neho nevie aplikovať podlahu z OD-9 | inventúra akcií agentov + klasifikácia | **P1** |

---

## 15. GO / NO-GO matrix

| Brána | Verdikt | Podmienky / blokéry |
|---|---|---|
| **CP-P0-4 implementation** (Control Contract) | **GO možné** | Nemá dátové ani právne blokéry. Je to nový balík typov + jeden migrovaný agent. Vyžaduje OD-8. |
| **CP-P0-1 implementation** (Events Spine v2) | **NO-GO zatiaľ** | Blokujú **U-A** a **U-B** (GDPR, P0) a **U-C** (RLS resolver, P0). Kroky 1–3 poradia (§11.1) sú bez PII dopadu a **dali by sa odblokovať samostatne**, ak founder rozdelí bránu. |
| **EVT-TRIGGER-CAPTURE** | **NO-GO teraz** (per D-10) | Až po CP-P0-1 krokoch 1–3, aby sa zachytil v2 tvar. Výnimka: OD-5, ak sa implementácia posunie o týždne. |
| **OPERATOR-HONESTY** | **GO možné, nízka priorita** | Bez blokérov. Malá, izolovaná zmena. Neodporúčam pred kontraktom — je to symptóm, nie príčina. |
| **COST → OUTCOME** | **NO-GO** | Nezmenené od CP-EVIDENCE: 0× cost, 0× `lead_id`, `lead_conversions` neexistuje, `deal_outcomes` = 1 riadok. Predchodca `CP-P0-3a` (inštrumentácia) je GO možné a nezávislé. |
| **DURABLE APPROVALS** (CP-P0-2) | **GO možné** | Kontrakt approvalu je špecifikovaný (§3.5). Žiadne dáta na migráciu (0 `human_approved` riadkov). Rieši aktívne riziko #20. |
| **PII-SCRUB-BACKFILL** | **NO-GO** | Nezvratné. Blokuje U-A, U-B a OD-4. |
| Čokoľvek zo Strategic Backlogu (UI, KPI registry, Research, Experiments, System Map, Attention Queue) | **NO-GO** | ADR-004 prah 5 platiacich. Nezmenené. |

### 15.1 FINAL GO MATRIX — dve osi

**P1-2:** architektonická pripravenosť a implementačná pripravenosť sú **rôzne veci**. Spec môže byť hotová a implementácia napriek tomu blokovaná — a naopak.

| Brána | ARCHITECTURALLY READY | IMPLEMENTATION READY | Blokéry | Verdikt |
|---|---|---|---|---|
| **CP-P0-4** Control Contract | **ÁNO** — kontrakt, authority, approval, outcome, identity, transakčná hranica sú definované | **ÁNO, s výhradou** | OD-9 a OD-10 nie sú rozhodnuté, ale implementácia môže použiť bezpečné defaulty (`APPROVAL_REQUIRED` bez override) | **GO možné** |
| **CP-P0-1** Events Spine v2 — kroky 1–3 (stĺpce + view) | **ÁNO** | **ÁNO** | žiadne — aditívne, bez PII dopadu, bez zmeny správania | **GO možné, ak sa brána rozdelí** |
| **CP-P0-1** kroky 4–6 (trigger v2, RLS) | **ÁNO** | **NIE** | **U-A** (právny základ), **U-B** (retencia), **U-C** (RLS resolver), **U-D** (`payload.name` v UI) | **BLOCKED** |
| **EVT-TRIGGER-CAPTURE** | **ÁNO** — D-10 určuje poradie a tvar | **NIE** | závisí na CP-P0-1 krokoch 1–3 | **BLOCKED (poradím, nie neznámou)** |
| **PII-SCRUB-BACKFILL** | **ÁNO** — D-09 definuje cieľový stav | **NIE** | U-A, U-B, OD-4; **nezvratné** | **BLOCKED** |
| **CP-P0-2** Durable Approvals | **ÁNO** — §3.5 | **ÁNO** | žiadne; 0 dát na migráciu; rieši I-008 | **GO možné** |
| **CP-P0-3a** inštrumentácia cost | **ÁNO** | **ÁNO** | žiadne | **GO možné** |
| **COST → OUTCOME** | **ÁNO** | **NIE** | chýbajú dáta (0× cost, 0× `lead_id`) | **BLOCKED dátami** |
| Reconciler (§3.8.2) | **ÁNO** | **NIE** | závisí na CP-P0-4 | **BLOCKED (poradím)** |
| I-003 guard (tenant leakage cez korelácie) | **ÁNO** | **ÁNO** | žiadne — je to jeden audit dotaz | **GO možné**, odporúčam spolu s krokmi 1–3 |
| Strategic Backlog (UI, KPI, Research, Experiments, System Map, Attention Queue) | n/a | n/a | ADR-004 prah 5 platiacich | **NO-GO** |

**Čítanie matice:** `ARCHITECTURALLY READY = ÁNO` znamená „implementátor nemusí robiť vlastné architektonické rozhodnutia". `IMPLEMENTATION READY = NIE` znamená „aj tak nezačínaj, chýba fakt alebo GO".

**Dve brány, ktoré sa dnes dajú otvoriť bez akejkoľvek ďalšej neznámej:** `CP-P0-4` a `CP-P0-2`. Obe riešia invarianty, ktoré sú **dnes porušené** (I-006, I-008).

---

## 16. Čo je pripravené na implementáciu a čo nie

**Pripravené (bez blokérov)** — plná matica v §15.1:
- `CP-P0-4` Control Contract — typy, authority model, approval kontrakt, transakčná hranica, akceptačné kritériá. Bezpečné defaulty pokryjú OD-9/OD-10.
- `CP-P0-2` Durable Approvals — kontrakt hotový, dáta žiadne. Rieši dnes porušený I-008.
- `CP-P0-3a` inštrumentácia cost cesty — nezávislá od spine.
- `CP-P0-1` **kroky 1–3** (stĺpce + view) — aditívne, bez PII dopadu, ak sa brána rozdelí.
- I-003 guard — jeden audit dotaz, uzatvára nevynútený invariant.

**Blokované:**
- `CP-P0-1` Events Spine v2 — tri P0 neznáme (U-A, U-B, U-C). Kroky 1–3 sa dajú oddeliť.
- `EVT-TRIGGER-CAPTURE` — poradie D-10.
- `PII-SCRUB-BACKFILL` — nezvratné, právne blokované.

**Tri invarianty sú dnes porušené, nie hypoteticky:** I-006 (240 decisions / 0 outcomes) · I-008 (approvals v `new Map()`) · I-011 (1 417 riadkov s menami v payloade). Dva z nich zatvárajú brány, ktoré sú `GO možné` už dnes.

**Čo tento dokument zámerne nerieši:** UI, navigáciu, KPI registry, Research Engine, Experiments, Change Intelligence, System Map, Founder Attention Queue a celý zvyšok Strategic Backlogu. Scope lock dodržaný.

---

## 17. Odporúčané poradie implementácie

```
1. CP-P0-4 Control Contract          GO možné dnes, bez DB zmien
       ↓  (kontrakt existuje → spine má podľa čoho vyzerať)
2. U-A / U-B / U-C evidence          GDPR + RLS resolver, P0, read-only
       ↓
3. CP-P0-1 kroky 1–3                 aditívne stĺpce + view, bez zmeny správania
       ↓
4. CP-P0-1 kroky 4–6                 trigger v2 bez PII, RLS oprava
       ↓
5. jeden agent migrovaný             dôkaz uzavretej slučky (acceptance CP-P0-4 #4)
       ↓
6. CP-P0-2 Durable Approvals         rieši aktívne riziko #20
       ↓
7. CP-P0-3a inštrumentácia cost      ~30 dní zberu
       ↓
8. COST → OUTCOME                    až keď sú dáta
```

Kroky 1 a 2 sa dajú robiť **paralelne** — kontrakt nemá dátové závislosti, evidence je read-only.

---

## 18. Riziká a architektonické trade-offs

| Riziko | Pravdepodobnosť | Dopad | Zmiernenie |
|---|---|---|---|
| Kontrakt sa napíše a nikto ho nepoužije (ďalší mŕtvy `lead_events`) | **stredná** | vysoký | Acceptance #4 vyžaduje **migrovaného agenta**, nie len typy. Kontrakt bez použitia = nesplnené DoD |
| Spine narastie do „druhého CRM" | nízka | vysoký | Pravidlo: doménová DB je autoritatívna pre entity, spine pre históriu a väzby. Payload = odkazy (D-09) |
| Fail-closed emit zastaví príjem leadov (#17) | nízka | **veľmi vysoký** | Test pokrytie + alert; trigger musí byť triviálny a bez externých volaní |
| GDPR odpoveď príde neskoro a zablokuje spine | **stredná** | stredný | Kroky 1–3 sú bez PII dopadu a dajú sa oddeliť |
| Drift vznikne znova | stredná | vysoký | Drift-detection CI (§7.3); bez nej je zachytenie triggera jednorazová záplata |
| Špecifikácia je príliš veľká na jedného implementátora | **stredná** | stredný | Poradie §17 je rezané na kroky, každý samostatne akceptovateľný |

**Najväčší trade-off tejto špecifikácie:** volí **evolúciu existujúceho** (`platform_events`) pred čistým návrhom na zelenej lúke. Čistý návrh by bol elegantnejší; evolúcia zachováva 1 417 riadkov reálnej histórie a troch živých konzumentov. Pri jednom platiacom zákazníkovi je zachovanie histórie cennejšie než elegancia.

---

**Vykonané:** špecifikácia + adversariálny hardening pass (v1.1). **Nevykonané:** implementácia, migrácia, zmena schémy, oprava `lead_events`, UI, refaktor konzumentov, merge, deployment, GDPR rozhodnutie.

**Hardening nezmenil scope.** Zachoval D-01, D-04, D-09, kontrakt, dynamickú autoritu, durable approval, nálepky, explicitné UNKNOWN aj požiadavku na migrovaného agenta. Prepísal D-06, opravil dve chyby v authority pravidlách, doplnil transakčnú hranicu, kanonickú schému, register invariantov a dvojosovú GO maticu. Našiel tri nové neznáme (U-J, U-K, U-L) a **neprikryl ich návrhom**.

**STOP po hardening review.** Ďalší krok je founder rozhodnutie o OD-1..OD-10 a o rozdelení brány CP-P0-1, nie kód.
