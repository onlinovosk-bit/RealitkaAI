# 01 — Handoff schema

Handoff is a **pointer packet**, not a dump of chat or of files that already exist.

## Required fields

```yaml
---
id: HANDOFF-YYYYMMDD-NNN-<slug>
protocol: multi-agent-protocol-v0
type: handoff
status: open | blocked | done
from: <agent-or-role>
to: <agent-or-role | founder>
created_at: <ISO-8601>
task_ref: <path to TASK-*.md>          # required
artifact_refs:                          # required — existing paths only
  - path: <repo-relative path>
    role: task | report | decision | evidence | context | pr
prior_decisions:                        # paths or DEC ids; empty list allowed
  - <path or DEC-*>
out_of_scope: []
next_action:
  gate: AUTO-SAFE | GO REQUIRED | STOP
  description: <one concrete action>
  owner: <who>
---
```

## Body rules

1. **Do not paste** contents of files listed in `artifact_refs`. Cite path + one-line why.
2. **Do not ask the Founder to retransmit** text that already lives in an `artifact_refs` file. If the Founder must decide, ask for a **decision token** (GO / NO-GO / choose A|B), not a paste.
3. Body sections use typed blocks only (see `02-claim-evidence.md`).
4. If a needed artifact is missing → `FINDING` with `evidence_cmd`, status `blocked` — do not invent it in the handoff body.

## Minimal body skeleton

```markdown
## FINDING
- ...

## PROPOSAL
- ...

## EVIDENCE
- path / command / PR — ...

## DECISION needed (Human Decision Gate)
- question: ...
- options: ...
- default if none: STOP
```

`ACTION` blocks appear only when the emitter is authorized to perform them in-session.
