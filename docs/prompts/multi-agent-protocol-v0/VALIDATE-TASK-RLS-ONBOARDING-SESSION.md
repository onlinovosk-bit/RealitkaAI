---
id: HANDOFF-20260916-001-rls-onboarding-validate
protocol: multi-agent-protocol-v0
type: handoff
status: done
from: cursor-track-b
to: founder
created_at: 2026-09-16T20:30:00+02:00
updated_at: 2026-09-16T22:30:00+02:00
closed_by: "GO CONFIRM-APPLIED"
decision_ref: .ai/bus/decisions/DEC-20260916-001-rls-onboarding-confirm-applied.md
task_ref: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
artifact_refs:
  - path: .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
    role: task
  - path: .ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md
    role: context
  - path: docs/reports/2026-09-04-rls-onboarding-session-api.md
    role: report
  - path: docs/runbooks/rollback-onboarding-sessions-anon.md
    role: evidence
  - path: apps/crm/src/app/api/onboarding/session/route.ts
    role: evidence
  - path: apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql
    role: evidence
  - path: https://github.com/onlinovosk-bit/RealitkaAI/pull/534
    role: pr
prior_decisions:
  - path: .ai/bus/inbox/MSG-20260904-rls-anon-nejasne.md
    note: Path B preferred; DROP wave applied; only onboarding_sessions left open (as of 2026-09-04)
out_of_scope:
  - lead_assignment_rules agency_id drift (Brief 17)
  - integration_settings policies
  - Multi-Agent OS / MCP / Learning Router
next_action:
  gate: AUTO-SAFE
  description: none — founder closed gate with GO CONFIRM-APPLIED; task done
  owner: none
---

# VALIDATE — TASK-RLS-ONBOARDING-SESSION under protocol v0

This handoff is the **proof run**. It cites artifacts; it does not re-paste them.

## FINDING

1. Task card text still presents PR as open / migration PREPARED NOT applied.
2. Live GitHub state: PR #534 is **MERGED** (`mergedAt=2026-09-05T19:59:00Z`, merge `3aed4fcf7`).
3. On `origin/main`: session API route and drop-anon migration file **both exist**.
4. Whether the SQL was **applied in production** is **not determinable from repo alone** (needs Founder / ops evidence).
5. Task card lacks YAML front matter required by `.ai/bus/message.schema.md` — independent parsers cannot read `status`/`verdict` uniformly (protocol soft-fail vs bus schema).

## EVIDENCE

- `gh pr view 534` → state MERGED, url in `artifact_refs`
- `git cat-file -e origin/main:apps/crm/src/app/api/onboarding/session/route.ts` → exit 0
- `git cat-file -e origin/main:apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql` → exit 0
- Task body lines 3–6 vs report acceptance checkboxes still unchecked for founder apply

## PROPOSAL

A. If prod migration **applied** → Founder `GO` to mark task `done` + short DEC note; no code.
B. If prod migration **not applied** → Founder `GO apply-migration` using existing runbook path only; then re-check anon list deny.
C. Always: add YAML front matter on next bus touch (separate micro-task) so Track B parsers work.

## Grok lane (boundary check)

Grok **may** challenge: “MERGED ≠ prod applied” (agreed — already FINDING 4).  
Grok **must not** decide to apply SQL or close the task.

## DECISION (closed)

**Founder:** `GO CONFIRM-APPLIED` (2026-09-16)  
**Effect:** TASK → `done`; DEC-20260916-001 recorded.  
**Not selected:** `GO APPLY-PROD` (no prod SQL from this gate).
**Amendment:** `DEC-20260916-002` — `done` = engineering; produkčná migrácia **UNKNOWN** (nie CONFIRMED).

## Independent-first self-check

- [x] Task path known
- [x] Prior context in MSG + report paths (not re-asked from Founder)
- [x] Status conflict typed as FINDING with commands
- [x] Gaps (prod apply) typed, not guessed
- [x] Outputs typed; Grok bounded; gate explicit

## Protocol score vs success criteria

| # | Criterion | Result |
|---|---|---|
| 1 | Founder never retransmits existing artifact text | **PASS** — only paths + decision tokens requested |
| 2 | Agent resolves task+context+decisions from refs | **PASS** with **FINDING**: card status stale vs PR |
| 3 | Outputs typed FINDING/PROPOSAL/DECISION/ACTION/EVIDENCE | **PASS** in this handoff |
| 4 | Grok cannot mint DECISION | **PASS** — section explicit |
| 5 | Human Decision Gate explicit | **PASS** — options + default STOP |

**Protocol failure (useful):** durable task card diverged from merged PR for ~11 days without bus update — independent-first still works, but **trust in card status alone fails**. Fix = status reconcile after gate, not abandon Track B.
