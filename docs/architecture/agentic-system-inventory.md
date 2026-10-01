# Agentic System Inventory — REVOLIS Inter-Agent Bus + Runner + CP + Model Routing

**Wave:** 0 (DISCOVERY ONLY — no implementation in this artifact’s producing change set beyond this file)  
**Date:** 2026-09-29  
**Repo tip inventoried:** `b898322ee` (`origin/main`)  
**Worktree:** `C:\RealitkaAI-l99-w2\.worktrees\docs-agentic-system-inventory` (`docs/agentic-system-inventory`)  
**Method:** read-only search of packages, scripts, docs, `.ai/bus`, CI, memory; no destructive changes; no invented infra.

> **Prime rule for later waves:** Existing BUS / Runner / Control Contract / governance are authoritative. Extend; do not rebuild in parallel.

---

## 0. Top-level map (evidence)

| Path | Role |
|---|---|
| `packages/bus-core/` | Inter-Agent Bus transport + envelope + consumer policy + execution state/cap |
| `scripts/bus/` | CLI, HTTP serve, handshake, consume (runner loop) |
| `.ai/bus/` | Git-backed message store (inbox/outbox/tasks/…) — ~69 files |
| `packages/control-contract/` | CP-P0-4 Control Contract (authority + closed loop) |
| `apps/crm/src/lib/control-plane/` | CRM adapters around Control Contract |
| `apps/crm/src/lib/agents/` | Product-agent L1 specs + controlled followup |
| `docs/architecture/adr-2026-09-18-inter-agent-bus-transport-v1.md` | Bus transport ADR (IMPLEMENTED L0+L1 code) |
| `docs/architecture/adr-2026-09-21-bus-runner-v2.md` | Runner V2 semantics (NÁVRH / stepwise GO) |
| `docs/architecture/adr-2026-09-21-bus-auth-identity.md` | Auth identity ADR (status text stale vs code — see Risks) |
| `docs/architecture/runner-contract-2d.md` | Always-on poll contract (not implementation) |
| `docs/architecture/founder-control-plane-cp-spec-v1.md` | CP-SPEC v1 |
| `docs/architecture/cp-p0-1a-persistence-definition.md` | Durable persistence definition |
| `docs/architecture/agentic/agentic-system-blueprint-v1.0.md` | Product-agent blueprint |
| `docs/architecture/agentic/revolis-system-spec-v1.0.md` | Revolis system spec vs blueprint |
| `docs/prompts/multi-agent-protocol-v0/` | Handoff / Human Decision Gate / Grok boundary pack |
| `docs/prompts/revolis-inter-agent-bus-v1.md` + `revolis-bus-openapi.yaml` | Protocol + OpenAPI for GPT Action |
| `.github/workflows/saas-grade-pipeline.yml` | CI: `bus:test` + `control-contract` jobs |
| `docs/architecture/revolis-constitution-v2.md` | Founder Reality Check |
| `docs/architecture/engineering-constitution.md` | Engineering constitution |
| `apps/crm/docs/L99-intelligent-model-routing-caching-skill.md` | LLM routing/caching skill (CRM-oriented) |

**Not present as first-class dirs:** root `runner/`, `bus/`, `cp/`, `orchestration/` packages beyond the above.  
**Note:** `capital-rules.json` lives in sibling repo `uptm-runner`, not in RealitkaAI (per `memory/open-tasks.md`).

---

## 1. Existing

### 1.1 BUS / Inter-Agent Bus — **REUSE (core)**

| Component | Path | Evidence of capability |
|---|---|---|
| Envelope v1 types | `packages/bus-core/src/types.ts` | `BusEnvelope`, boxes, agents (`sol-gpt`, `claude-code`, `founder`, `runner`, `cursor`), types, statuses, gates (`AUTO-SAFE` / `GO REQUIRED` / `STOP`), modes, scope, evidence |
| Parse / validate / serialize | `packages/bus-core/src/envelope.ts` | ID rules, credential detection, lost-text refusal |
| File store | `packages/bus-core/src/store.ts` | Local checkout `.ai/bus` |
| GitHub store | `packages/bus-core/src/github-store.ts` | Contents API commits as transport |
| HTTP transport | `packages/bus-core/src/http.ts` | Bearer auth; `shared` vs `per-agent`; `from` binding when credentials set |
| Client | `packages/bus-core/src/client.ts` | post / ack / read |
| Consumer policy | `packages/bus-core/src/consumer.ts` | AUTO-SAFE + READ_ONLY + capability allowlist |
| Digest | `packages/bus-core/src/digest.ts` | Compression for strategic agents |
| CLI | `scripts/bus/cli.ts` | `send\|pull\|read\|digest\|ack\|validate` |
| Serve | `scripts/bus/serve.ts` | Standalone HTTP |
| Handshake | `scripts/bus/handshake.ts` | BUS-001… gate survival tests |
| Protocol docs | `.ai/bus/AGENT_PROTOCOL.md`, `message.schema.md`, `README.md` | Human + machine contract |
| Tests | `packages/bus-core/tests/*`, `scripts/bus/__tests__/*` | Wired via `npm run bus:test` |
| CI | `.github/workflows/saas-grade-pipeline.yml` | `bus:test` + bus-core typecheck |

**Bus supports (mapped to build-script verbs):**

| Verb | Status |
|---|---|
| publish | YES — `send` / HTTP POST |
| subscribe / pull | YES — `pull` / consumer poll |
| acknowledge | YES — `ack` |
| retry | PARTIAL — persistence retries only (`MAX_PERSISTENCE_ATTEMPTS`); execution never retried blindly |
| dead-letter | PARTIAL — `archive/` + `FAILED_PERSISTENT` / blockers; not a named DLQ product |
| correlation | PARTIAL — `task_id` / `thread`; Control Contract has branded `correlationId` |
| handoff | YES — protocol + `.ai/bus/handoffs/` + multi-agent pack |
| cancellation | PARTIAL — statuses `blocked`/`archived`; no first-class CANCELLED message type |
| status | YES — `BusStatus` + digests |
| audit | YES — git history of `.ai/bus` + envelopes |

### 1.2 Runner — **EXTEND (do not replace)**

| Component | Path | Notes |
|---|---|---|
| Consume / poll runner | `scripts/bus/consume.ts` | Claim → execute (Claude CLI) → post → ack; default model `"sonnet"`; daily count cap |
| Execution state machine | `packages/bus-core/src/execution-state.ts` | `CLAIMED → EXECUTING → EXECUTED → RESULT_POSTED → DONE` (+ `FAILED_PERSISTENT`, `NEEDS_FOUNDER`) |
| Execution cap | `packages/bus-core/src/execution-cap.ts` | `DAILY_EXECUTION_CAP = 100` (count, not USD) |
| Runner V2 ADR | `docs/architecture/adr-2026-09-21-bus-runner-v2.md` | Semantics before always-on; capability policy B |
| Runner 2D contract | `docs/architecture/runner-contract-2d.md` | Poll 60s; no public endpoint; GO-gated hosting/token |
| Control-contract “runner” | `packages/control-contract/src/runner.ts` | **Different meaning:** OBSERVE→…→LEARN phase runner for product agents |

**Safety envelope (enforced in bus consumer):** only `AUTO-SAFE` + `READ_ONLY` + allowlisted capabilities; founder decisions block execution; GO REQUIRED survives ack (handshake BUS-003).

### 1.3 Control Plane — **EXTEND**

| Component | Path | Notes |
|---|---|---|
| Control Contract package | `packages/control-contract/` | Zero deps; authority pure function; action registry truth |
| Phases | `packages/control-contract/src/phases.ts` | Observation / Decision / Action / Outcome / Lesson |
| Authority | `packages/control-contract/src/authority.ts` | OBSERVE/ANALYZE/RECOMMEND/EXECUTE × AUTONOMOUS/APPROVAL_REQUIRED/FORBIDDEN |
| Identity brands | `packages/control-contract/src/identity.ts` | tenantId, correlationId, runId, causationId, Actor |
| Idempotency | `packages/control-contract/src/idempotency.ts` | Platform-derived keys |
| CRM wiring | `apps/crm/src/lib/control-plane/*`, `followup/controlled.ts` | Live product path |
| CP-SPEC | `docs/architecture/founder-control-plane-cp-spec-v1.md` | Authority + Events Spine v2 target |
| Persistence def | `docs/architecture/cp-p0-1a-persistence-definition.md` | Durable loop incomplete on PROD |

### 1.4 Agent protocols / identity — **REUSE + ALIGN**

| Layer | Path | What exists |
|---|---|---|
| Bus agents | `BusAgent` in `types.ts` | Closed enum for transport peers |
| Product agents | `apps/crm/src/lib/agents/agent-specs.ts` | L1 specs (mission, model, approval, evals) |
| Multi-agent pack | `docs/prompts/multi-agent-protocol-v0/` | Handoff schema, Human Decision Gate, Grok boundary |
| Agentic blueprint | `docs/architecture/agentic/*` | Product-agent factory / governance tiers |
| HTTP identity | `BusCredential` in `http.ts` | Per-agent binding of `envelope.from` (code present; ADR header still says SPECIFICATION) |

### 1.5 Governance — **REUSE (do not weaken)**

| Artifact | Path |
|---|---|
| Constitution v2 | `docs/architecture/revolis-constitution-v2.md` |
| Engineering constitution | `docs/architecture/engineering-constitution.md` |
| Cursor / L99 rules | `.cursor/rules/l99-*.mdc`, `CLAUDE.md` |
| Automerge policy | `docs/AUTOMERGE-POLICY.md`, `.github/workflows/auto-merge-policy.yml` |
| Schema governance CI | `.github/workflows/schema-governance-guard.yml` |
| Bus gates | `AUTO-SAFE` / `GO REQUIRED` / `STOP` |
| Kill switch | Control Contract `SystemState.killSwitch` + CRM agent policies |

### 1.6 Model routing / cost — **PARTIAL**

| What | Path | Gap vs target |
|---|---|---|
| Default bus executor model | `scripts/bus/consume.ts` `DEFAULT_MODEL = "sonnet"` | Hard-coded; not policy engine |
| CRM model routing skill | `apps/crm/docs/L99-intelligent-model-routing-caching-skill.md` | Docs/skill; not bus router |
| Memory mention of `config/model-routing.yaml` | `memory/session-summary.md` | **File not found in this repo tip** — treat as missing or external |
| AI cost telemetry (CRM) | migrations / `ai_action_audit` cost columns (session notes #688) | Product cost, not bus task budget |
| Bus execution cap | `execution-cap.ts` | Count/day, not USD model budget |
| ADR explicitly deferred cost governor | transport ADR §5 | “Cost governor — after real volume data” |

### 1.7 CI / GitHub

| Job | Workflow | Command |
|---|---|---|
| Control Contract | `saas-grade-pipeline.yml` | zero-deps guard + `node --test` + tsc |
| Bus | same | `npm run bus:test` + bus-core tsc |
| Other | memory-engine, schema-governance, playwright, code-contract-guard | Orthogonal |

### 1.8 Cursor integration

| Fact | Evidence |
|---|---|
| `cursor` is a first-class `BusAgent` | `packages/bus-core/src/types.ts` |
| No dedicated Cursor task-envelope adapter package | Search: no `packages/cursor-*` |
| Cursor rules enforce L99 gates | `.cursor/rules/*` |
| MCP packages exist for CRM/comm/… | `packages/mcp-*` — product MCP, not bus MCP (ADR deferred bus MCP) |

---

## 2. Missing (relative to build-script target architecture)

Explicitly **not found** as a complete, integrated system:

1. **Unified `AgentIdentity` schema** spanning bus peers + product agents + model provider/version/trustLevel (three partial models exist).
2. **First-class `AgentTask` contract** separate from `BusEnvelope` (task cards are envelopes / markdown; no shared TS Zod/JSON schema package for the build-script shape).
3. **Expanded message type enum** (`TASK_ACCEPTED`, `APPROVAL_REQUIRED`, `APPROVED`, …) — bus uses a smaller closed set.
4. **Policy-driven Model Router** (Sol / Sonnet / Grok / Opus) as configuration + tests — only hard-coded `"sonnet"` on consumer + CRM skill docs.
5. **USD Cost Governor** for agentic engineering tasks (`ALLOW/WARN/DOWNGRADE/ESCALATE/BLOCK`) — only count cap + CRM telemetry.
6. **Central Control Plane task lifecycle** (`CREATED→PLANNED→AUTHORIZED→…→COMPLETED`) for *engineering* tasks — CP today is product closed-loop; bus has separate status + execution state.
7. **Dependency-aware multi-agent orchestrator** (DAG parallelism, synthesis) — explicitly out of bus MVP; blueprint describes orchestration conceptually.
8. **Cursor execution protocol package** that injects OBJECTIVE/SCOPE/MODEL POLICY/EVIDENCE into Cursor runs via bus.
9. **Artifact registry** unifying tasks/messages/runs/PRs/costs — git + DB fragments, not one registry.
10. **`capital-rules.json` in this repo** — lives in `uptm-runner`.
11. **Always-on production runner host + machine identity** — contracted; Gate C-0 remote evidence historically BLOCKED; hosting GO open.
12. **Durable CP Events Spine v2 on PROD** — designed; persistence gate CONDITIONAL.

---

## 3. Duplicates / overlaps

| Overlap | Why it matters |
|---|---|
| **“Runner” names** | Bus consume runner ≠ Control Contract `runner.ts` ≠ UPTM `uptm-runner` repo |
| **Identity models** | `BusAgent` vs `Actor` vs `AgentSpec.agentId` vs HTTP `BusCredential.agent` |
| **Governance engines** | Bus gates vs `resolveAuthority` vs Cursor/L99 rules vs automerge policy |
| **Agentic docs vs bus** | `docs/architecture/agentic/*` targets product agents; `.ai/bus` targets engineering agents — related but not the same runtime |
| **Model routing mentions** | Skill doc + memory claim of yaml vs actual consume hard-code |
| **ADR auth status vs code** | ADR header still “SPECIFICATION — no code” while `http.ts` + `auth-identity.test.ts` implement per-agent binding |

---

## 4. Risks

| ID | Risk | Severity |
|---|---|---|
| R1 | **Building a second bus/CP** alongside `bus-core` / `control-contract` | CRITICAL — forks truth |
| R2 | Shared-token DEGRADED mode still usable; provenance unverified unless per-agent credentials configured | HIGH |
| R3 | Always-on runner + PAT/hosting not closed — “orchestrator live” claims would be false | HIGH |
| R4 | CP durable closed loop incomplete — “CP operational” incomplete without CP-P0-1A decisions | HIGH |
| R5 | Silent model escalation if Wave 3 hard-codes provider switches inside workers | HIGH (INV-012) |
| R6 | Confusing product Control Plane with engineering Control Plane without adapters | MEDIUM |
| R7 | Cost governor in USD without measured bus volume may invent budgets | MEDIUM |
| R8 | Stale ADR status text causes false “missing” conclusions | MEDIUM |
| R9 | Gate C-0 remote handshake evidence historically blocked by environment secrets/network | MEDIUM |

---

## 5. Reuse plan (target → decision)

| Target component (build script) | Decision | Anchor |
|---|---|---|
| Agent Identity | **EXTEND** | Unify on top of `BusAgent` + `BusCredential` + `Actor` + `AgentSpec`; do not invent parallel enums |
| AgentTask / Message contracts | **EXTEND** | Evolve `BusEnvelope` / schemas; add fields or a thin adapter — avoid second envelope format |
| Message Bus | **REUSE** | `packages/bus-core` + `.ai/bus` + `scripts/bus` |
| Evidence | **EXTEND** | Strengthen `BusEvidence` + Control Contract `evidenceRef`; require paths/PR/CI refs |
| Model Router | **CREATE** (thin) on **EXTEND** consumer | New policy config consumed by `consume.ts` / CP; reuse CRM skill concepts carefully |
| Cost Governor | **CREATE** (thin) beside **REUSE** `execution-cap` | Count cap remains; USD layer needs measured inputs — founder GO for budgets |
| Failure escalation | **EXTEND** | Build on `planFor` / NEEDS_FOUNDER / blockers; no blind retries |
| Runner | **EXTEND** | `consume.ts` + execution-state; follow Runner V2 / 2D contracts |
| Cursor integration | **CREATE** (protocol docs + adapter) | Cursor already a `BusAgent`; add envelope templates + rules |
| Control Plane (engineering) | **EXTEND** / **ADAPTER** | Do not fork product CP; adapter from bus tasks → CP phases or shared authority helpers |
| State machine | **REUSE+ALIGN** | Keep execution-state + BusStatus; document mapping to target lifecycle; reject invalid transitions in one module |
| Risk engine | **EXTEND** | Map to `ActionRisk` + bus gates + capability policy B |
| Governance | **REUSE** | Constitution + gates + approval; never bypass |
| Artifact registry | **REUSE** git first | Delay new DB until CP-P0-1A locked |
| Multi-agent orchestration | **CREATE** later (Wave 8) | Only after contracts + router + runner evidence |
| MCP-on-bus | **DEPRECATE for now** | ADR deferred; CLI+HTTP sufficient |
| Parallel “new bus” rewrite | **DEPRECATE** | Forbidden |

---

## 6. Architecture / delta map (current → target)

```text
TODAY (evidence)
  Founder / Cursor rules
       │
       ▼
  .ai/bus  ◄── bus-core (envelope, store, http, consumer, exec-state)
       │
       ├── scripts/bus/cli | serve | handshake
       └── scripts/bus/consume  ──► Claude CLI (model=sonnet hard-coded)
                                      │
                                      └─ AUTO-SAFE / READ_ONLY / cap / founder gates

  Product path (separate but related):
  CRM agents ──► control-contract (authority + phases) ──► approvals / ai_action_audit

TARGET (delta — incremental)
  Founder Gate
       │
       ▼
  Control Plane (adapter over control-contract + bus task lifecycle)
       │
       ▼
  Model Router (NEW config) ──► Bus (EXISTING) ──► Cursor / Sonnet / Grok / Opus workers
       │                                              │
       └──────── Cost Governor (NEW, GO budgets) ─────┘
                                                      ▼
                                                   Runner (EXTEND consume)
                                                      ▼
                                                   Git / CI / Evidence (EXISTING patterns)
```

**Non-goals for early waves:** replace `.ai/bus` store; weaken AUTO-SAFE; autonomous governance edits; invent PROD Events Spine without CP-P0-1A GO.

---

## 7. Wave 0 exit criteria

- [x] Repository inventory written from evidence
- [x] Existing BUS / Runner / CP / governance located
- [x] Missing / duplicates / risks explicit
- [x] Reuse plan per target component
- [ ] Founder acknowledgement of Wave 1 scope (GO)

---

## 8. Proposed Wave 1 — CONTRACTS ONLY (proposal; not started)

**Goal:** Align schemas without changing runtime authority or adding orchestration.

### In scope (proposed)

1. Document mapping table: build-script types ↔ existing `BusEnvelope` / `Actor` / `ExecutionState` / Control Contract phases (this inventory §5–6).
2. Optionally add **non-breaking** TypeScript types + validators under `packages/bus-core` or a tiny `packages/agentic-contracts` that **re-exports / wraps** existing types (Founder picks REUSE vs new package).
3. Sync ADR `adr-2026-09-21-bus-auth-identity.md` status line with implemented code (docs-only correction) — or leave for same PR as Wave 1.
4. Tests: schema validation only; no consume/serve behaviour change.

### Explicitly out of Wave 1

- Model router implementation  
- Cost governor USD  
- Always-on runner hosting  
- CP-P0-1A DB  
- Cursor protocol automation  
- Multi-agent DAG  
- Any governance weakening  

### Suggested branch / PR name

`feat/agentic-bus-contracts` (or `docs/agentic-wave1-contracts` if types deferred)

### GO gate

**GO REQUIRED** before Wave 1 code: Founder chooses  
**(A)** extend `bus-core` types in-place, or  
**(B)** new zero-dep `packages/agentic-contracts` that only adapts existing types.

---

## 9. Evidence commands used (reproducible)

```bash
git rev-parse HEAD   # b898322eeddaa4c6ba7387685000715fb43740fb
rg -l -i "inter-agent|bus-core|control-contract|model.?rout" docs packages scripts .github
Get-ChildItem packages/bus-core, packages/control-contract, scripts/bus -Recurse -File
# key reads: types.ts, execution-state.ts, http.ts, control-contract README, ADRs, agentic specs
```

---

## 10. Status

```text
WAVE 0 — DISCOVERY COMPLETE
IMPLEMENTATION — NOT STARTED
NEXT — Founder GO on Wave 1 package choice (A|B), then contracts only
```
