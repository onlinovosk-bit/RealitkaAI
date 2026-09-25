---
title: "Revolis System Spec v1.0 (Agentic System Blueprint §16 applied)"
system_id: REVOLIS
version: 1.0
status: canonical-draft
created: 2026-09-24
evidence_base: repo main @ 22bad1d (read-only inventory, 2026-09-24)
related:
  - "[[agentic-system-blueprint-v1.0]]"
  - "[[revolis-constitution-v2]]"
  - "[[engineering-constitution]]"
  - "[[founder-control-plane-cp-spec-v1]]"
  - "[[adr-2026-09-11b-software-factory-v1-minimum]]"
  - "[[adr-2026-07-28-memory-engine]]"
---

# REVOLIS SYSTEM SPEC v1.0

> **Čo tento dokument je:** šablóna Blueprintu §16 vyplnená tým, čo **reálne
> existuje v kóde** — s cestou ako dôkazom. Každá vrstva má stav:
> **LIVE** (beží v produkčnej ceste) · **DEFINED** (kód/testy existujú, nie je
> zapojené) · **MISSING** (neexistuje) · **UNVERIFIED** (nedá sa overiť z repa).
>
> **Čo NIE je:** plán novej infraštruktúry. Blueprint je kontrakt. Kde medzera
> existuje, rozhoduje Ústava v2 (§ Rozhodnutie nižšie), nie Blueprint.
> Cesty sú relatívne k `apps/crm/src/`, ak nie je uvedené inak.

---

## 0. Verdikt na jednu obrazovku

| Blueprint vrstva | Stav | Najväčšia medzera |
|---|---|---|
| L0 Mission | LIVE (Ústava v2) | — |
| L1 Agent Spec | **MISSING** | Žiadny agent nemá kontrakt; ~20 LLM call-sites bez vlastníka |
| L2 Prompt Stack | DEFINED | Prompty inline, **žiadny `prompt_version`** |
| L3 Skills | DEFINED (dev-only) | Produktové skills neexistujú (a netreba ich — pozri §Rozhodnutie) |
| L4 Tools / MCP | DEFINED, nezapojené | `packages/mcp-comm` má `send_*` bez approval gate |
| Memory | DEFINED (repo), MISSING (produkt) | Memory Engine ADR zaparkovaný (gate: 3 platiaci) |
| Orchestration | LIVE (Vercel cron) | Terminácia implicitná (cron = 1 beh), OK pre dnes |
| Events | ČIASTOČNE | `platform_events` live; correlation/causation (Spine v2) nemigrované |
| Governance | **ČIASTOČNE LIVE** (po #692) | Kontrakt stráži len inbound send. Kill switch cez env, ale vyžaduje redeploy |
| Human Approval | ČIASTOČNE | **Inbound auto-reply posiela AI e-mail bez schválenia (Tier 3)** |
| Evals | ČIASTOČNE | Golden test s mockom; žiadny behavior/adversarial eval v CI |
| Red Team | MISSING (produkt) | Len control-contract + bus-core majú adversariálne testy |
| Observability | ČIASTOČNE | `ai_action_audit` + cost stĺpce; chýba correlation_id, prompt_version |
| Runtime Adapter | ČIASTOČNE | `lib/ai/claude.ts` + `lib/ai/openai.ts` = de facto adapter |

**Jedna veta:** Revolis už má väčšinu stavebných blokov Blueprintu, ale
**governance vrstva nie je v produkčnej ceste** — tá istá trieda akcie
(odoslať AI text klientovi) je raz za draft bránou, raz za ľudským schválením
a raz úplne bez brány.

---

## 1. SYSTEM NAME / ID / VERSION

- **Name:** Revolis.AI — Agentic Real Estate CRM System
- **ID:** `REVOLIS`
- **Version:** 1.0 (tento dokument)

## 2. MISSION (L0)

Zdroj pravdy: `docs/architecture/revolis-constitution-v2.md`. Agentná vrstva
existuje, aby **skrátila cestu Lead → Telefonát → Obhliadka → Zmluva →
Provízia** pre slovenskú realitnú kanceláriu a **žiadny lead nevychladol bez
povšimnutia**.

**Success criteria:** zvyšuje pravdepodobnosť ďalšieho platiaceho klienta
alebo retenciu existujúceho (PRIME DIRECTIVE). Nič iné.

## 3. USERS

- Maklér (denná práca: Action Queue, leady, follow-up)
- Majiteľ / manažér RK (dashboard, morning brief, reporty)
- Founder / operátor (control plane, crony, PROD brány)
- **Nepriamo:** predávajúci / kupujúci — príjemca odoslaných správ. Nie je
  používateľ systému, ale je to **strana, ktorú Tier 3 chráni**.

## 4. BUSINESS OUTCOME

Merané cez `docs/architecture/lead-revenue-engine-v1.md` (C0/C1/C2 rebrík
dôkazov) a `growth-metrics-definitions-v0.md`. Blueprint nepridáva nové
metriky.

## 5. NON-GOALS

- Autonómne odosielanie správ klientom bez ľudskej brány (Tier 3 — §13).
- Scraping osobných údajov; vlastníci z katastra mimo zmluvy s ÚGKK
  (`master-data-sourcing-map.md`).
- Vlastný agent runtime, agent pool, model router, event bus pre produkt
  (ADR 2026-09-11b, AP-012, Engineering Constitution princíp 4).
- LLM ako rozhodca obchodnej pravdy — skóre a kvalifikácia sú deterministické
  (`lib/lead-rules/*`, `RULESET_VERSION`).

---

## 6. AGENTS (L1) — register reálnych agentov

Dnes **neexistuje** žiadny agent spec ani register. Toto je prvý úplný zoznam.
`Send` = posiela niečo mimo tenanta.

| AGENT-ID (návrh) | Kód | Model | Spúšťač | Zapisuje | Send | Tier | Stav |
|---|---|---|---|---|---|---|---|
| `REVOLIS-LEAD-TRIAGE` | `lib/ai/lead-triage-batch.ts` | Haiku | cron 05:00 | `leads.ai_triage_*` | nie | 1 | LIVE |
| `REVOLIS-FOLLOWUP-SWEEP` | `lib/ai/open-followup-generator.ts` | Haiku | cron 22:00 | `activities` (draft) | **áno, ak `FOLLOWUP_MODE≠draft`** | 3 | LIVE (default draft) |
| `REVOLIS-SELLER-RESCUE` | `lib/ai/rescue-message.ts` | Haiku | cron | `tasks` | nie | 1 | LIVE |
| `REVOLIS-DASHBOARD-INSIGHTS` | `lib/ai/dashboard-insights*.ts` | Haiku | cron 06/13 | insights | nie | 0 | LIVE |
| `REVOLIS-MORNING-BRIEF` | `lib/morning-brief/generators/ai-text.ts` | Haiku | cron | e-mail makléra | interný | 1 | LIVE |
| `REVOLIS-INBOUND-AUTOREPLY` | `lib/inbound/auto-reply.ts` ← `lib/inbound/process-lead.ts:92-122` | Haiku | webhook `/api/webhooks/inbound-lead`, `/api/ai/process-lead` | e-mail/WhatsApp **klientovi** | **áno, automaticky** | **3** | LIVE — **porušenie §13** |
| `REVOLIS-LISTING-CONTENT` | `lib/ai/listing-content.ts` | Sonnet | používateľ | `ai_generations` | nie | 1 | LIVE |
| `REVOLIS-CALL-COACH` | `lib/ai/call-coach.ts`, `call-analysis.ts` | Haiku | používateľ | — | nie | 0 | LIVE |
| `REVOLIS-DEAL-STRATEGY` | `lib/ai/deal-strategy.ts`, `sales-brain.ts` | Haiku | používateľ | — | nie | 0 | LIVE |
| `REVOLIS-DEAD-LEAD-CAMPAIGN` | `lib/ai/dead-lead-campaign.ts` | Haiku | používateľ | — | **áno (`sendMessage`)**, má `dry_run` | 3 | LIVE |
| `REVOLIS-OUTREACH` | `lib/ai-outreach.ts`, `lib/outreach-store.ts` | gpt-4.1-mini | používateľ | `outreach_log` | áno, **po `human_approved`** (`api/outreach/approve`) | 3 | LIVE — vzorová brána |
| `REVOLIS-AUTOPILOT` | `lib/ai/autopilot-runner.ts` → `action-executor.ts` | gpt-4o-mini | používateľ | `outreach_log` (`queued`) | nie priamo | 2 | LIVE |
| `REVOLIS-BRI` | `lib/l99/bri-engine.ts` | gpt-4o | — | skóre | nie | 1 | UNVERIFIED (vs. deterministický `lib/bri/engine.ts`) |
| `REVOLIS-RESEARCH` | `lib/research-agent/*` | gpt-4o-mini | — | — | — | — | DEFINED, nezapojené (`webFetchStub`) |
| `REVOLIS-FOLLOWUP-CONTROLLED` | `lib/agents/followup/controlled.ts` | — | len testy | — | — | — | DEFINED — **jediný agent za control-contractom** |

Ďalšie OpenAI call-sites bez agentnej identity: `lib/rescore-lead.ts`,
`lib/assistant-chat.ts`, `lib/valuation/commentary.ts`, `api/call-script`,
`api/ghostwriter/generate`, `lib/l99/shadow-inventory.ts`, `api/stealth-recruiter/*`
(grandfathered, AP-011), `whisper-1`, embeddings.

**Nález A1 (konzistencia):** jedna akcia *„AI text odchádza ku klientovi"* má
dnes štyri rôzne režimy: draft (`FOLLOWUP_MODE`), ľudské schválenie
(`api/outreach/approve`), `dry_run` flag, a **žiadnu bránu** (inbound
auto-reply). Blueprint Law 3 — *permissions are external to the agent's
reasoning* — to zakazuje: brána má byť vlastnosťou akcie, nie call-site.

## 7. SKILLS (L3)

- **Dev skills (LIVE):** `.claude/skills/{kontrolor,strategic-analysis,task-loop}`.
- **Produktové skills:** MISSING a **nestavajú sa**. Blueprint §3 L3 hovorí
  *„skills are reusable"*; Engineering Constitution princíp 4 hovorí *„nová
  abstrakcia potrebuje druhé použitie"*. Dnes by každá skill mala jedného
  konzumenta. Zaradenie: **BACKLOG**, odomkne sa pri druhom agentovi, ktorý
  zdieľa procedúru (napr. `lead_triage` použitý cronom aj inboundom).

## 8. TOOLS / MCP (L4)

- **LLM tool use v aplikácii:** žiadny (`tools:`/`tool_choice` = 0 výskytov
  v `apps/crm`). Agenti sú dnes *generátory textu*, akcie robí volajúci kód.
- **MCP servery** (`packages/mcp-*`): `mcp-crm`, `mcp-comm`, `mcp-calendar`,
  `mcp-telephony`, `mcp-onlinovo`. Zapojené len v príkladovom
  `packages/mcp-config.json`; CRM runtime ich **nevolá**.
- **Riziko:** `mcp-comm` vystavuje `send_email` / `send_sms` **bez approval
  gate**. Dnes neškodné (nezapojené). Pravidlo: **pred zapojením akéhokoľvek
  MCP servera s `send_*` musí akcia prejsť `resolveAuthority`**.
- **Tool deklarácia (Blueprint §L4):** najbližší ekvivalent je
  `packages/control-contract/src/actions.ts` — nesie `capability`,
  `reversible`, `externallyVisible`, `risk`, idempotenciu providera, a je
  **fail-closed** (akcia bez záznamu = FORBIDDEN). Toto je kanonický tool
  register Revolisu. Nový register sa nezavádza.

## 9. MEMORY

| Blueprint kategória | Revolis | Stav |
|---|---|---|
| Working | kontext jedného LLM volania | LIVE |
| Episodic | `activities`, `lead_events`, `ai_action_audit`, `platform_events` | LIVE |
| Semantic | `lead_signals` (confidence, evidence_span, `extraction_version`) | DEFINED, nezapojené |
| Policy | `packages/control-contract` policy-as-data, Ústava, `decisions.md` | DEFINED (kód), LIVE (proces) |

**Law 4 (memory ≠ truth):** Memory Engine ADR (`adr-2026-07-28`) už zakazuje
`origin=ai ∧ canonical=true` na úrovni DB. Je **zaparkovaný (gate: 3 platiaci
klienti)**; Blueprint gate neposúva. `lead_signals` oddeľuje extrakciu od
pravdy — správny vzor, zatiaľ bez konzumenta.

Repo pamäť (`brain/`, `memory/*.md`) je znalosť vývoja, nie produktová pamäť.

## 10. EVENTS

- **LIVE:** `platform_events` (realtime), `lead_events`, `ai_action_audit`,
  `scheduled_events`; idempotencia v credits, concierge, Realvia webhook.
- **DEFINED bez konzumenta:** `ai_jobs` (queue so statusom/retry).
- **Spec, nemigrované:** Spine v2 — correlation/causation stĺpce na
  `platform_events` (`founder-control-plane-cp-spec-v1.md` D-01). Toto **je**
  Blueprint §6 canonical event; nová tabuľka sa nezakladá.
- **Dev bus** (`.ai/bus/`, `packages/bus-core/`) je bus vývojových agentov,
  nie produktu. Blueprint §6 platí pre obe, ale sú to dva systémy (AP-006).

## 11. ORCHESTRATION

Vercel crony (`apps/crm/vercel.json`, 16 plánovaných) + používateľské routy.
Každý cron = jeden ohraničený beh → terminácia (Law 6) je daná runtime-om.
Limity: `FOLLOWUP_MAX_AI_PER_LEAD`, `FOLLOWUP_COOLDOWN_DAYS`, `OUTREACH_DAILY_LIMIT`,
cooldown v `lib/outreach-store.ts:213-237`, `lib/ai/rate-guard.ts` (20/min).
Žiadny viackrokový autonómny loop v produkte → Blueprint §5 loop je dnes
triviálne splnený. **Prvý loop, ktorý pribudne, musí mať explicitnú
terminačnú podmienku v spec-u.**

## 12. GOVERNANCE

**Existuje (DEFINED):** `packages/control-contract/` — `resolveAuthority`,
kill switch → FORBIDDEN (`authority.ts:134`), OD-9 floor (irreversible ⇒
APPROVAL_REQUIRED), DENY_LIST, fail-closed action registry, idempotencia,
identity. Testy vrátane adversariálnych.

**Nie je v produkčnej ceste:** jediný konzument je
`lib/agents/followup/controlled.ts`, volaný len z testov;
`lib/control-plane/run-context.ts:51` má `killSwitch: false` natvrdo.

**Aktualizácia 2026-09-24 (po merge PR #692):** prvá živá cesta je za kontraktom.
`lib/inbound/approve-draft.ts` pred odoslaním volá `resolveAuthority` a
`applyApproval` pre akciu `inbound.reply.email.send`. Akcia je v registri ako
irreversible a externally visible, takže padá na APPROVAL_REQUIRED a ako
schválenie sa započíta klik makléra.
Kill switch má skutočný zdroj, `AGENT_KILL_SWITCH`
(`lib/control-plane/system-state.ts`), a platí aj pre `run-context.ts`.
Zapnutý kill switch zablokuje odoslanie aj po schválení (I-007).
Verdikt (`policyRef`, `appliedRules`) sa zapisuje na návrh aj do auditu.
**Stále chýba:** kill switch bez redeployu. Zmena env na Vercel si redeploy
vyžaduje. Ostatné AI call-sites za kontraktom nie sú.

**LIVE mechanizmy mimo kontraktu:** feature flags (`lib/ai/decision-flags.ts`,
default OFF), plan gating (`lib/enterprise-sales-intelligence-gate.ts`,
`lib/feature-gating.ts`), rate guard, kontaktná garda W1
(`lib/acquire/email-adapter.ts:143`), RLS na audit/event tabuľkách.

**Chýba:** globálny cost ceiling (`CREDITS_ENFORCEMENT=off`), emergency stop
dosiahnuteľný bez deployu.

**Law 10 v Revolise:** žiadny agent nemá write prístup k `vercel.json`,
env, migráciám ani `packages/control-contract/src/policy*`. Zmena policy =
PR + founder merge (RRA pravidlo 3, AP-008).

## 13. HUMAN APPROVAL — klasifikácia akcií Revolisu

| Tier | Akcie v Revolise | Pravidlo |
|---|---|---|
| 0 Informational | insights, call coach, deal strategy, morning brief text | bez brány |
| 1 Reversible | triage polia, `tasks`, `activities` draft, `ai_generations`, skóre | agent koná v limitoch |
| 2 Material | zmena stavu leadu/pipeline, `outreach_log` queued, kalendárny návrh | podľa policy |
| 3 Irreversible | **akákoľvek správa mimo tenanta** (e-mail, SMS, WhatsApp, Telegram klientovi), publikovanie inzerátu, delete, billing, PROD config | **povinné ľudské schválenie** |

**Stav 2026-09-24:** porušenie 1 je opravené v PR #690 (draft + audit,
povinný secret, testy zakázaného správania). Schválenie je jednoklikové
(`POST /api/leads/:id/drafts/:activityId/approve`). Odošle presne text, ktorý
maklér videl, najviac raz, a zapíše audit `human_approved` → `sent`. Na `main`
až po merge.

**Porušenia dnes (merané na `main` @ 22bad1d):**
1. **`REVOLIS-INBOUND-AUTOREPLY`** — `lib/inbound/process-lead.ts:102-135`
   pošle AI e-mail cez Resend a WhatsApp **bez schválenia**. Obsah je
   čiastočne riadený vstupom `payload.message` (prompt injection → text
   odoslaný z našej domény). Webhook overuje Bearer **len ak je nastavený
   `INBOUND_WEBHOOK_SECRET`** (`app/api/webhooks/inbound-lead/route.ts:11-16`);
   inak je verejný a `profileId` berie z tela požiadavky.
   Či je secret na PROD nastavený: **UNVERIFIED** — výpis mien premenných
   z Vercelu bol orezaný, premenná v zobrazenej časti nebola.
2. `REVOLIS-FOLLOWUP-SWEEP` — Tier 3 za env prepínačom, nie za schválením.
   Default `draft` je bezpečný; prepnutie env = odstránenie brány bez PR.
   **Stav 2026-09-25:** opravené v PR (follow-up gate). Cron už iba zapisuje
   návrhy, `FOLLOWUP_MODE=send` sa ignoruje a v odpovedi sa hlási.
   Odosielanie ide cez ten istý approve path a kontrakt
   (`followup.email.send` / `followup.sms.send`). WhatsApp návrhy
   zostávajú ručné.
3. `REVOLIS-DEAD-LEAD-CAMPAIGN` — `dry_run` je voliteľný parameter, nie brána.
   **Stav 2026-09-25:** opravené v PR (dead-lead + outreach). POST píše iba návrhy
   a posiela sa cez approve path (`deadlead.email.send` / `deadlead.sms.send`).
   Opravené sú aj dve staré chyby: POST po náhľade generoval nový text a posielal
   na `phone ?? email` bez ohľadu na kanál.

**Stav celej triedy „AI text klientovi" (2026-09-25):** všetky 4 cesty sú za
ľudským schválením **a** za Control Contractom, cez jednu autoritu
`lib/control-plane/authorize-send.ts`.

| Cesta | Akcia v registri | Schválenie |
|---|---|---|
| inbound auto-reply | `inbound.reply.email.send` | návrh → klik |
| follow-up sweep | `followup.{email,sms}.send` | návrh → klik |
| dead-lead kampaň | `deadlead.{email,sms}.send` | návrh → klik |
| outreach | `outreach.email.send` | klik na send/approve; cron/skript odmietnutý |

Každý návrh aj každé odoslanie nesie `correlation_id` v `ai_action_audit.meta`.
Agent spec pre všetky 4 agenty je v `apps/crm/src/lib/agents/agent-specs.ts`
a test pri drifte zlyhá. **Stále neoverené na PROD** (runbook B/C).
Mimo tejto triedy zostáva `api/stealth-recruiter/*` (grandfathered, AP-011).

**Nie je porušenie (rozlíšenie, AP-006):** `lib/acquire/inbound-lead-auto-response.ts`
(valuation/submit, acquire/email) posiela **deterministickú SK šablónu**
(`send-inbound-auto-response.ts:86-94`), zapnutú per kancelária cez
`auto_response_enabled`. Človek schválil *text vopred* a kancelária zapla
*politiku* — to je Tier 3 schválené policy, nie agentom. Rozdiel voči §13.1:
tam text píše model zo vstupu útočníka.

**Vzorová brána:** `authorizeSend` (Control Contract + kill switch) +
`approve-draft` (návrh → klik → odoslanie presne schváleného textu, najviac raz).
Nový agent do nej pribudne ako 1 záznam v `SEND_ACTIONS`, 1 akcia v registri
a 1 `AgentSpec`.

## 14. SECURITY

LIVE: RLS (`agency_id`), PII maskovanie pred LLM (`lib/ai/sanitize.ts`),
secrets v env (nie v promptoch), rate limit, webhook secrets (Realvia IP +
shared secret, Stripe, Resend). Medzera: voliteľná autentifikácia inbound
webhooku (§13.1). Tool allowlist v zmysle Blueprintu = action registry
(§8), dnes mimo produkčnej cesty.

## 15. EVALS

| Blueprint úroveň | Revolis | Stav |
|---|---|---|
| Unit | vitest (1 499+ testov) | LIVE, CI |
| Behavior | `lib/ai/__tests__/listing-golden.test.ts` (mock `callClaude`) | ČIASTOČNE — testuje parsing, nie model |
| Tool | control-contract, bus-core | LIVE pre balíky, nie pre app |
| Adversarial | control-contract authority testy | len balík |
| Regression | `data/eval/smolko-outcomes-gold.jsonl` (4 riadky), `scripts/eval-triage-smolko-outcomes.ts` | DEFINED, mimo CI (UNVERIFIED) |
| Production monitoring | `ai_action_audit` + cost | ČIASTOČNE |

**Prohibited-behavior evals** (Blueprint §9: *test both desired and prohibited*)
neexistujú pre žiadneho produktového agenta.

## 16. RED TEAM

Produktový red team: MISSING. Prvé ciele podľa reálneho povrchu:
(1) prompt injection cez `payload.message` → odoslaný e-mail,
(2) cross-tenant čítanie cez `profileId` z tela webhooku,
(3) obídenie draft režimu cez env,
(4) únik PII cez `ai_generations.input`.

## 17. OBSERVABILITY

Existuje: `ai_action_audit` (agency, lead, profile, action_kind, channel,
body_hash, + `cost_eur`, `credits_spent`, `model`, `latency_ms` z
`20260924183806`), `lib/ai/persist-cost-telemetry.ts`, `lib/ai/llm-usage-cost.ts`,
`ai_generations`.

Chýba voči Blueprint §11 minimum: `agent_id`, `agent_version`,
`prompt_version`, `correlation_id`, `approval_state`. Sentry nie je.
`ai_cost_daily` view zámerne neaplikovaný.

## 18. RUNTIME

Vercel functions + crony; žiadne edge functions; GitHub Actions bez LLM
agentov. **Runtime adapter (Blueprint §13) = `lib/ai/claude.ts` +
`lib/ai/openai.ts`** — jediné miesta, ktoré poznajú vendora. Pravidlo:
**nové LLM volanie ide len cez tieto wrappery.** Anthropic Managed Agents
ako runtime: **BACKLOG** (§Rozhodnutie).

## 19. DEPLOYMENT

Vercel (app), GitHub Actions (CI), migrácie v repe, PROD DDL len founder GO.
Rollback = Vercel redeploy predošlého buildu; pre agentov navyše env flag
(draft/OFF). Reprodukovateľné.

## 20. SUCCESS METRICS (agentnej vrstvy)

1. **Tier-3 pokrytie:** % call-sites s odoslaním mimo tenanta, ktoré prejdú
   ľudským schválením. Dnes (merané vyššie): 1 z 4 tried (`outreach`).
   Cieľ: 100 %.
2. **Pripísateľnosť:** % riadkov `ai_action_audit` s `model` a `cost_eur`.
3. **Obchodné** metriky zostávajú v `lead-revenue-engine-v1.md` — agentná
   vrstva nemá vlastný North Star.

## 21. DEFINITION OF DONE — gap voči Blueprint §15

| Kritérium §15 | Revolis |
|---|---|
| Mission | ✅ |
| Agent Spec | ❌ (register v §6 je prvý krok) |
| Prompt Stack versioned | ❌ |
| Skills defined | ➖ zámerne BACKLOG |
| Tools permissioned | ⚠️ register existuje, nie je v ceste |
| Memory policy | ⚠️ ADR, zaparkované |
| Governance | ⚠️ 1 živá cesta (inbound send), zvyšok DEFINED |
| Approval boundaries | ❌ Tier 3 porušenie (§13.1) |
| Evals | ⚠️ |
| Red team | ❌ |
| Observability | ⚠️ |
| Failure behavior | ⚠️ AP-010 vzor známy, nie všade |
| Reproducible deploy | ✅ |
| Rollback | ✅ |
| Owner | ✅ founder |

**Žiadny produktový agent Revolisu dnes nespĺňa Blueprint DoD.**

---

## ROZHODNUTIE — Ústava v2 aplikovaná na Blueprint §21

Blueprint §21 predpisuje poradie *System Specs → Agent Factory → First Agent
→ Evals → Managed Runtime → Production*. Ústava má prednosť pred poradím.

| Krok | Verdikt | Dôvod |
|---|---|---|
| Revolis System Spec v1.0 | **HOTOVÉ** (tento dokument) | founder GO |
| Onlinovo / MIA Vellar / Phone Operator specs | **MIMO REPO** | iné produkty, iné repá; tu sa nepíšu |
| **Tier-3 brána na inbound auto-reply** | **BUILD** (P0) | Q1 áno — klient neplatí za systém, ktorý v jeho mene posiela nekontrolované e-maily; reputačné a GDPR riziko pre referenčného klienta. Q8 správny čas: kód je live. Malý diff. |
| Zapojenie `control-contract` do jednej živej Tier-3 cesty | **BUILD** (za P0) | kontrakt je postavený a otestovaný; bez konzumenta je to AP-007 (aktivita ≠ pokrok) |
| `agent_id` + `prompt_version` do `ai_action_audit.meta` | **BUILD** (malé) | Q6 nové vlastné dáta: ktorý prompt → ktorý výsledok; aditívne cez `meta`, bez migrácie |
| Agent Factory v1.0 | **BACKLOG — timing veto (Q8)** | ADR 2026-09-11b už zamietol 12-vrstvovú továreň; Engineering Constitution princíp 4. Odomkne sa pri **treťom** agentovi za control-contractom. |
| Produktové Skills | **BACKLOG** | 1 konzument na skill; odomkne druhé použitie |
| Managed Agents runtime | **BACKLOG — timing veto (Q8)** + Technology Bias | dnes žiadny multi-step loop, ktorý by runtime potreboval; crony stačia. Odomkne sa prvým agentom s tool use + viackrokovým loopom. |
| Produktové evals + red team pre inbound | **BUILD** spolu s P0 | brána bez testu zakázaného správania je dekorácia (AP-009) |

**Zapisuje sa do `memory/decisions.md`.**
