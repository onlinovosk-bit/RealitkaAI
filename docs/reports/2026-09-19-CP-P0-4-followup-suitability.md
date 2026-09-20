---
title: CP-P0-4 — read-only suitability check: `lib/agents/followup` as the first migrated agent
gate: GO CP-P0-4 (OD-8 — "kandidát, nie definitívny; implementačná úloha musí urobiť read-only suitability check")
date: 2026-09-19
method: repo read + 1 read-only SELECT on PROD `ypgajkhqtbriqqmyawyv`
writes_to_prod: none
status: verdict SUITABLE — with four conditions
---

## 0. Why this document exists

Founder verdict **OD-8** accepted "one migrated agent" as the Definition of Done for
the Control Contract, and named `lib/agents/followup` as a **candidate, not a
decision** — conditional on a read-only suitability check. This is that check.

Everything below is either quoted from the repository or measured. Where neither is
possible it is labelled **UNKNOWN — REQUIRES VERIFICATION**.

## 1. Measurement (PROD, read-only, 2026-09-19)

One `SELECT`. No write of any kind.

| Measure | Value |
|---|---|
| `public.decisions` total | **240** |
| distinct `lead_id` among them | **48** |
| rows per lead | **exactly 5** |
| decisions whose lead still exists | 240 (no orphans) |
| decisions whose lead is in a terminal status | **0** |
| `public.exclusivity_outcomes` | **0** |

Combined with the CP-EVIDENCE audit of 18 September (all 240 rows
`status='open'`, all `agent='followup_agent'`, newest `2026-06-25`).

## 2. What the 240/0 actually is

The CP-SPEC listed **I-006** (240 decisions / 0 outcomes) as a violated invariant
but did not say *why*. The measurement settles it, and the answer is not what a
"broken outcome writer" hypothesis would predict.

`resolveOpenDecisionsForLead` (`lib/agents/followup/outcomeWriter.ts:84`) is called
from exactly one place — `app/api/leads/[id]/route.ts:150` — and only when
`isTerminalLeadStatus(lead.status)` is true. Not one of the 48 leads carrying a
decision has ever reached `Uzavretý` / `Stratený` / `Neaktívny` / `Archivovaný`.

**FACT:** the outcome writer is not broken. It has never been reachable.

Two structural findings follow, and both are the contract's business:

- **F-1 — the loop has no terminal state of its own.** The only way a follow-up
  decision can be closed is for a *human* to move the lead to a terminal status.
  A decision that never gets an answer stays `open` forever, indistinguishable
  from one that is still being worked. The Control Contract's seven-state
  `OutcomeStatus` exists precisely for this: `cancelled`, `rejected`, `expired`
  and `unknown{reason}` close a loop that never reached ACT.
- **F-2 — the agent has no idempotency.** 240 rows over 48 leads is five identical
  decisions per lead: the cron re-decided the same leads on five runs and inserted
  a new row each time. Nothing in `writeOpenPrediction` deduplicates. The
  contract's platform-derived `idempotencyKey`
  (`sha256(agentId:action:tenantId:entityId:decisionId)`) makes the repeat a no-op.

## 3. Phase-by-phase mapping

| Contract phase | Today in `lib/agents/followup` | Gap |
|---|---|---|
| **OBSERVE** | `evaluateFollowupLead` reads `status`, `last_contact`/`updated_at`, `email`, `phone`, `source` off a row | no `Observation` record, no `evidenceRef`, no provenance, no `availability` — a missing timestamp silently falls back to `updated_at` |
| **DECIDE** | `estimatePrediction` → `writeOpenPrediction` → `public.decisions` | has `confidence`, `expected_outcome`, `expected_value_eur`; **missing** `correlation_id`, `alternatives`, `actor`, `policyRef` |
| **AUTHORIZE** | — | **absent entirely** |
| **ACT** | none — the agent is draft-only ("DRAFT only, no outbound send", `engine.ts:61`) | nothing to migrate, which is what makes it a safe first agent |
| **REPORT OUTCOME** | `resolveOpenDecisionsForLead` → `exclusivity_outcomes` | exists, unreachable (§2) |
| **LEARN** | — | **absent entirely** |

`guardianReview.ts` is the nearest thing to an authority check, but it is a content
gate (invented price, invented area, missing channel), not an authority decision —
it never asks *may this agent do this at all*.

## 4. Findings that are not gaps but risks

- **F-3 — the prediction numbers are constants, not measurements.**
  `estimatePrediction` returns `p_outcome` 0.22/0.18, `expected_value_eur` 420/310
  and `confidence` 0.62/0.55 as literals. All 240 production rows carry those
  literals. This is not itself AP-001 — a rule-based engine is allowed to have
  rule-based constants — but it becomes AP-001 the moment any surface presents
  `expected_value_eur` as a forecast. The migration carries the values through
  **unchanged** and attaches `computedBy: "followup.engine@…"` so the provenance
  says what they are. It does not invent better ones.
- **F-4 — the cron path is single-tenant by constant.**
  `POST /api/followup` filters `.eq("agency_id", FOLLOWUP_AGENCY_ID)`, and
  `FOLLOWUP_AGENCY_ID = DEMO_AGENCY_ID` (`constants.ts:4`). The GET preview path
  resolves the caller's agency properly; the writing path does not. Out of scope
  for CP-P0-4, recorded here because the contract makes `tenantId` mandatory and
  will expose it.
- **F-5 — the draft body hardcodes the reference client's name.**
  `buildDraftBody` (`engine.ts:35,37,137`) writes the client's brand into every draft
  for every tenant. Out of scope here; flagged because it is both a
  multi-tenancy bug and a Stealth-Mode exposure.
- **F-6 — a second in-memory durability hole.** `capabilities/_shared/audit-log.ts`
  keeps the capability audit in `const entries: CapabilityAuditEntry[] = []`, the
  same shape of problem as I-008's `new Map()` for approvals. On serverless it does
  not survive the process. Not this gate's to fix; CP-P0-2's neighbourhood.

## 5. Verdict

**SUITABLE — with four conditions.**

1. The agent is migrated **as RECOMMEND**, not EXECUTE. Its only registered action
   is `followup.draft`. Nothing in this change can send an e-mail or an SMS.
2. The existing code path is **not rewired**. `POST /api/followup` behaves exactly
   as before; the migrated agent is additive and covered by its own tests. This
   satisfies the DoD clause "no behaviour change to existing agents except the
   migrated one" in the strictest possible reading.
3. Record ids derive from `correlationId`, never from `runId`, so a retry
   recomputes the same idempotency key (§3.7).
4. The outcome of a draft is reported as `unknown{not_observable}` — whether a
   broker sends it is not visible from here. It is never reported as success.

## 6. What this gate did NOT do, and why

Acceptance criteria **#4 and #5** ask for the migrated run to be traceable "by one
query over the spine". The spine's v2 columns do not exist on production — that is
**CP-P0-1A**, and CP-SPEC §17 orders it *before* the migrated agent for exactly this
reason.

So the closed loop is proven **in process and in tests**, against
`createInMemorySink`, with one `correlation_id` across all nine events. It is **not**
persisted anywhere. Writing control events into today's `platform_events` without the
v2 columns would have produced precisely the silent-v1 condition I-014 exists to
detect, and would have been a worse outcome than waiting.

**Acceptance status:** #1 ✅ · #2 ✅ · #3 ✅ · #6 ✅ · #4 ⚠️ proven in-process,
persistence blocked on CP-P0-1A · #5 ⚠️ same.

## 7. UNKNOWN — REQUIRES VERIFICATION

- **U-M** — why the follow-up cron produced exactly five runs and then stopped on
  2026-06-25. Not answerable from the repository: it needs the Vercel cron
  execution history, which this session cannot read.
- **U-N** — whether any of the 48 leads *should* have reached a terminal status and
  did not, i.e. whether the missing outcomes are a CRM-usage fact or a data fact.
  Answering it means interpreting a client's sales data, which is outside a
  read-only architecture check.
- **U-J2** (carried) — Twilio Messages idempotency remains undocumented. It is
  recorded in the registry as `status: "unknown"`, so `followup.sms.send` is
  declared at-least-once rather than assumed safe.
