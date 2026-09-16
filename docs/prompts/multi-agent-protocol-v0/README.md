# Multi-Agent Protocol v0 — minimum executable pack

**Status:** VALIDATE-first (not Multi-Agent OS)  
**Authority:** Founder PROCEED 2026-09-16 — Track B parallel to Track A  
**Non-goals:** new infrastructure, `.mjs` changes, memory system, Learning Router, MCP adapters

## Load order (conflict → lower number wins)

| # | File | Role |
|---|---|---|
| 00 | `00-agent-contract.md` | Who may do what |
| 01 | `01-handoff-schema.md` | How work is passed |
| 02 | `02-claim-evidence.md` | Claim / Evidence types |
| 03 | `03-human-decision-gate.md` | Explicit human authority |
| 04 | `04-independent-first.md` | Resolve from artifacts, no chat SoT |
| 05 | `05-grok-permission-boundary.md` | Grok may challenge, not decide |

## Relationship to existing bus

This pack **binds** agents to existing `.ai/bus/` + `docs/reports/` + task cards.  
It does **not** replace `AGENT_PROTOCOL.md` or Inter-Agent Bus v1 — it adds the missing
authority / typing / independent-first rules those files left soft.

## How to run a task under v0

1. Open the task card (or create one under `.ai/bus/tasks/`).
2. Build a Handoff that **only references** existing artifact paths (no pasted bodies of those files).
3. Label every substantive statement: `FINDING` | `PROPOSAL` | `DECISION` | `ACTION` | `EVIDENCE`.
4. Stop at Human Decision Gate when merge / prod / secrets / new scope.
5. Grok outputs are `PROPOSAL` or `FINDING` only — never `DECISION`.

## Validation fixture

`VALIDATE-TASK-RLS-ONBOARDING-SESSION.md` — first live proof of this protocol.
