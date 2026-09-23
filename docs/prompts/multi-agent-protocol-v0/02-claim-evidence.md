# 02 — Claim / Evidence semantics

Every substantive statement in a handoff, bus message, or Track B report **must** carry one type.

## Types

| Type | Meaning | Who may mint | Becomes durable when |
|---|---|---|---|
| **FINDING** | Observed fact with evidence | any agent | written to bus/report with `evidence` |
| **PROPOSAL** | Recommended change or interpretation | any agent (Grok: only this + FINDING) | Founder accepts → `DECISION` |
| **DECISION** | Binding choice | **Founder only** (or Founder-signed gate) | `decisions/` or signed front matter |
| **ACTION** | Work performed or to perform | Executor inside territory; Founder anywhere | evidence of execution |
| **EVIDENCE** | Pointer to proof (cmd, path, PR, log) | any agent | always citeable |

## Binding rules

1. A `FINDING` without `EVIDENCE` (or `evidence_cmd` inline) is invalid.
2. A `PROPOSAL` must not be written as if already decided.
3. Agents **must not** write `DECISION` into `memory/decisions.md` or bus `decisions/` without Founder signature / explicit GO recorded in the artifact.
4. `ACTION` that touches merge, prod, secrets, or external send requires Human Decision Gate first (`03`).
5. Historical ledger/chat claims that contradict repo files → prefer repo; record conflict as `FINDING`.

## Compact inline form (allowed in tables)

```text
FINDING: PR #534 state=MERGED | EVIDENCE: gh pr view 534
PROPOSAL: mark TASK status done | gate: GO REQUIRED (bus amend)
```
