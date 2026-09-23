---
title: "GPT Sol ↔ Opus 5 Autonomous Communication Contract"
status: draft-contract
date: 2026-08-18
owner: founder
confidentiality: internal
related:
  - ../reports/2026-08-18-gpt-sol-opus5-comms-zisti.md
  - ../../apps/crm/docs/RUFLO-ORCHESTRATION.md
  - ../../apps/crm/docs/L99-intelligent-model-routing-caching-skill.md
  - ./revolis-constitution-v2.md
  - ./engineering-constitution.md
---

# GPT Sol ↔ Opus 5 Autonomous Communication Contract

## 0. Verdict

**VALIDATE / CONTRACT ONLY.** This document defines the communication contract. It
does not implement automation, provider API calls, a runtime gateway, or model
selection logic.

The safe shape is **repo-mediated asynchronous communication**, not direct hidden
model-to-model chat. Every valuable exchange must create a durable repo artifact.

---

## 1. Constitution check

| Question | Answer |
|---|---|
| Would a current client pay for this directly? | Not directly. It is internal leverage. |
| Does it improve client retention or chance of paid client? | Yes, if it reduces founder/agent drift and improves speed/quality of delivery. |
| Is this the right time to build runtime automation? | No. Contract first; runtime after one successful manual cycle. |
| MVP scope | Markdown contract + one manual protocol trial. |
| Veto | Runtime automation is **too early** until the contract survives a manual trial. |

**Decision:** Draft the contract now. Defer implementation until a manual
Sol↔Opus loop produces at least one useful repo artifact without scope drift.

---

## 2. Strategic analysis

### 2.1 Weakness Finder

1. **Hidden state drift**
   - Failure: Sol and Opus exchange conclusions that never land in repo memory.
   - Evidence: repo already has a rule that output without `docs/reports/` does not exist.
   - Control: every turn writes or references a repo artifact.

2. **Tool abuse / over-privilege**
   - Failure: one model convinces another to run PROD, send outreach, or merge.
   - Evidence: `docs/security/AI_SECURITY.md` requires least privilege and human gates.
   - Control: model-to-model loop is read/write-to-branch only; PROD, external send,
     secrets, and merge are GO REQUIRED.

3. **Authority laundering**
   - Failure: "Opus approved it" or "Sol found it" becomes a false proof.
   - Evidence: Kontrolor requires facts, logs, diffs, and test evidence.
   - Control: no role can approve its own claim; verdicts cite evidence paths.

4. **Duplicate orchestration layer**
   - Failure: a new Sol↔Opus mechanism bypasses existing Ruflo / memory / task-loop.
   - Evidence: `RUFLO-ORCHESTRATION.md` already defines session/swarm IDs and audit.
   - Control: this contract is a protocol over existing repo/Ruflo patterns, not a
     new runtime system.

5. **Unbounded autonomous loop**
   - Failure: agents keep debating or expanding scope.
   - Evidence: task-loop explicitly forbids endless autonomous execution.
   - Control: max 3 model turns per cycle before founder GO/STOP.

### 2.2 Opportunity variants

| Variant | What it gives | Cost/risk | Reversibility | Business gate | First verification |
|---|---|---|---|---|---|
| A. Chat-only | Fast discussion | No audit, high drift | Hard to recover | Fails artifact rule | None |
| B. Repo-mediated manual loop | Durable decisions + low risk | Manual file writes | Easy | Passes VALIDATE | One contract trial |
| C. Runtime orchestrator | True automation | Tool/security/secret blast radius | Medium-hard | Too early | Needs security matrix |
| D. LLM gateway integration | Cost/routing control | Larger infra + provider coupling | Medium | Backlog until usage | Gateway spike |

**Recommended variant:** B — repo-mediated manual loop. It creates value now
without adding runtime risk.

---

## 3. Roles

### GPT Sol — Builder / Synthesizer

Owns:

- context gathering from repo artifacts;
- first draft of plan, code approach, or decision package;
- explicit assumptions list;
- proposed tests/smoke;
- patch-ready handoff when implementation is in scope.

Cannot:

- mark its own plan PASS;
- merge, deploy, send external communication, or write PROD data;
- invent source data or silently skip repo evidence.

### Opus 5 — Judge / Adversarial reviewer

Owns:

- weakness finding;
- evidence classification: FACT / ASSUMPTION / UNKNOWN;
- contradiction check against `memory/decisions.md`, Constitution, and security docs;
- STOP / RETURN / FLAG / PASS verdict.

Cannot:

- perform implementation after judging the same plan;
- approve missing evidence;
- override founder GO gates.

### Founder — Gatekeeper

Owns:

- GO / NO-GO;
- merge decisions;
- PROD / external / secret authorization;
- business priority when Sol and Opus disagree.

---

## 4. Transport

### Default transport: repo-mediated markdown

Use one directory per exchange:

```text
docs/ai-comms/YYYY-MM-DD-topic/
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```

Each file must include:

```yaml
role: sol | opus | founder | system
turn: number
input_refs:
  - path-or-url
output_type: draft | review | revision | verdict
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
evidence:
  - path-or-log
verdict: PASS | FLAG | RETURN | STOP | N/A
```

### Why repo transport first

- Works with current GitHub memory rule.
- Survives context compaction.
- Produces reviewable diffs.
- Requires no new secrets or provider-to-provider API.

---

## 5. State machine

```text
INIT
  ↓
BRIEF_LOCKED
  ↓
SOL_DRAFT
  ↓
OPUS_REVIEW
  ↓
SOL_REVISION
  ↓
KONTROLOR_VERDICT
  ↓
FOUNDER_GO_REQUIRED
  ↓
EXECUTE_ON_BRANCH
  ↓
VERIFY
  ↓
HANDOFF
```

### Rules

1. `INIT → BRIEF_LOCKED`: founder or agent writes a bounded brief.
2. `SOL_DRAFT`: Sol proposes one approach and cites evidence.
3. `OPUS_REVIEW`: Opus returns PASS/FLAG/RETURN/STOP with evidence.
4. `SOL_REVISION`: Sol may revise once.
5. `KONTROLOR_VERDICT`: if STOP remains, do not execute.
6. `FOUNDER_GO_REQUIRED`: runtime/prod/merge/external actions stop here.
7. `EXECUTE_ON_BRANCH`: one branch, one logical change.
8. `VERIFY`: tests/build/smoke or explicit reason why docs-only.
9. `HANDOFF`: report + memory update.

### Loop limit

Max **3 model turns** before a founder decision:

```text
Sol draft → Opus review → Sol revision
```

If disagreement remains, stop and ask founder.

---

## 6. Safety boundaries

### Always blocked without explicit founder GO

- PROD SQL / data writes / deletes.
- Merge to `main`.
- External communication to clients, prospects, Slack, email, SMS.
- Secrets changes or exposing secret values.
- Billing, auth, RLS, migrations.
- Any "autonomous send" or "autonomous deploy".

### Default permissions

| Role | Read repo | Write docs branch | Write code branch | Shell/test | PROD | External send |
|---|---:|---:|---:|---:|---:|---:|
| GPT Sol | yes | yes | only after GO | local only | no | no |
| Opus 5 | yes | review only | no | read-only logs | no | no |
| Founder | yes | yes | GO | GO | GO | GO |

---

## 7. Message quality bar

Every Sol/Opus turn must include:

1. **Scope** — what is and is not being decided.
2. **Evidence** — repo path, log, test, or explicit UNKNOWN.
3. **Risk** — what can fail.
4. **Next gate** — AUTO-SAFE / GO REQUIRED / STOP.
5. **Artifact pointer** — where the durable output lives.

Forbidden:

- "Looks good" without evidence.
- "I remember" without repo artifact.
- model-to-model agreement as proof.
- silent scope expansion.

---

## 8. First manual trial

Use the next architecture or risky implementation decision as a manual trial.

Required output:

```text
docs/ai-comms/2026-08-18-trial/
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```

Trial success criteria:

- no hidden assumptions accepted as facts;
- no new scope added after brief lock;
- verdict cites paths/logs;
- final handoff updates `docs/reports/` and `memory/session-summary.md`.

Runtime automation remains blocked until this trial passes.

---

## 9. Implementation backlog after successful trial

Only after founder GO:

1. Add `docs/ai-comms/_template/` files.
2. Add a lightweight validator script for required frontmatter fields.
3. Wire optional model-routing through existing LLM Gateway design.
4. Consider Ruflo managed-agent IDs as transport metadata.

Do not start with provider APIs. Start with repo artifacts.

---

## 10. Engineering justification

- **Trigger:** new-file
- **Decision path:** reuse
- **Alternatives considered:**
  - Direct model-to-model API loop — rejected; hidden state and tool abuse risk.
  - Ruflo swarm runtime now — rejected; existing docs require IDs, token limits,
    and guardrails; runtime is too early without a contract trial.
  - Chat-only memory — rejected; violates repo-as-communication-channel rule.
- **Why not reuse:** N/A — this document reuses existing Ruflo, memory, task-loop,
  AI security, and Constitution patterns as the control plane.
- **Expected outcome:** Sol and Opus can collaborate through auditable artifacts
  before any autonomous execution exists.
- **Related paths:** `apps/crm/docs/RUFLO-ORCHESTRATION.md`,
  `apps/crm/docs/L99-intelligent-model-routing-caching-skill.md`,
  `docs/security/AI_SECURITY.md`, `memory/decisions.md`.
- **Contradiction check:** none. This narrows automation; it does not grant new
  runtime permissions.
