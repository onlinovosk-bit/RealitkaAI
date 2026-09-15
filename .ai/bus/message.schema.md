# Bus Message Schema v1

Use this shape for files in `inbox/`, `outbox/`, `tasks/`, `context/`, and
`decisions/`. Markdown is the transport; YAML front matter carries fields that
agents can parse.

```yaml
---
id: MSG-YYYYMMDD-NNN-short-title
type: task|context|result|decision|state
message_type: TASK|QUESTION|PROPOSAL|CRITIQUE|RESULT|DECISION|BLOCKED|VERIFICATION
status: CREATED|PLANNED|ASSIGNED|IN_PROGRESS|WAITING|RESULT_READY|VERIFYING|VERIFIED|CLOSED|BLOCKED|RETRY|NEEDS_INPUT|ESCALATED|done|blocked|open|draft|archived|in_progress
owner: agent-or-human
created_at: YYYY-MM-DDTHH:MM:SSZ
updated_at: YYYY-MM-DDTHH:MM:SSZ
trace_id: TRACE-...                 # povinné · stabilné cez reťazec jednej úlohy
parent_task_id: TASK-... | null     # povinné pri dekompozícii, inak null
context_refs: []                    # cesty/ID — odkaz, nikdy kópia obsahu
memory_refs: []                     # odkazy do brain/ a memory/decisions.md
constraints: []                     # čo sa nesmie
budget:
  max_iterations: 8
  max_cost_usd: 3
  max_runtime_minutes: 30
deadline: 2026-09-15T15:18:00+02:00 | null
required_capabilities: []           # nástroje, ktoré task potrebuje
approval_required: false            # pri risk >= high vždy true
idempotency_key: "..."              # stabilný hash (task_id + scope + acceptance)
risk: low|medium|high|critical
scope:
  repo_paths:
    - path/to/file
  external_systems: []
evidence:
  commands: []
  files: []
  urls: []
next_action:
  gate: AUTO-SAFE|GO REQUIRED|STOP
  description: one concrete action
---
```

## Envelope fields (v1)

| Field | Rule |
|---|---|
| `trace_id` | povinné · stabilné cez celý reťazec správ jednej úlohy |
| `parent_task_id` | povinné ak task vznikol dekompozíciou, inak null |
| `context_refs` | zoznam ciest/ID — odkaz, nikdy kópia obsahu |
| `memory_refs` | odkazy do brain/ a memory/decisions.md |
| `constraints` | čo sa nesmie |
| `budget` | max_iterations · max_cost_usd · max_runtime_minutes |
| `deadline` | ISO 8601 s offsetom, alebo null |
| `required_capabilities` | zoznam nástrojov, ktoré task potrebuje |
| `approval_required` | bool — pri risk >= high vždy true |
| `idempotency_key` | stabilný hash (task_id + scope + acceptance) |

## Lifecycle (canonical)

```
CREATED → PLANNED → ASSIGNED → IN_PROGRESS → WAITING
        → RESULT_READY → VERIFYING → VERIFIED → CLOSED
zlyhanie: IN_PROGRESS → BLOCKED → RETRY | NEEDS_INPUT | ESCALATED
```

Legacy statuses still accepted by the validator (baseline): `done`, `blocked`, `open`, `draft`, `archived`, `in_progress`.

## Body template

```markdown
## Summary

One paragraph with the actionable fact.

## Context

- Relevant repo state.
- Constraints and rules.
- What is explicitly out of scope.

## Evidence

- Command output, file path, PR, CI link, or report path.

## Next action

Exactly one next action and the required gate.
```

## Validation checklist

- No secrets.
- No unverified external facts.
- No broad task bundled with unrelated work.
- Status reflects reality.
- Next action has an explicit gate.
