# Bus Message Schema v1

Canonical envelope. `npm run bus -- send --file <draft.md>` validates this shape
and assigns the id; `npm run bus:validate` gates it in CI. The v0.1 shape below
still describes the 35 messages written before v1 — those are never rewritten.

```yaml
---
v: 1
id: MSG-20260918-001-branch-audit      # PREFIX-YYYYMMDD-NNN-slug (MSG|TASK|CTX|DEC)
type: task|context|result|decision|state|blocker
status: draft|open|in_progress|blocked|done|archived
from: sol-gpt|claude-code|founder|runner|cursor
to: sol-gpt|claude-code|founder|runner|cursor
created_at: 2026-09-18T09:00:00Z
task_id: TASK-347-BRANCH-AUDIT         # optional; thread defaults to it
mode: READ_ONLY|PLAN|IMPLEMENT|REVIEW  # optional
stop_after_report: true                # optional
summary: one line, max 280 chars       # what the receiving agent reads first
counters:                              # optional, machine-countable facts
  safe_to_delete: 281
  open_pr: 31
decisions_required:                    # optional; only what genuinely needs a human
  - id: D1
    question: Delete the 281 merged branches?
    options: [batched, all at once, keep]
    recommendation: batched, with backup refs
    gate: GO REQUIRED
evidence:
  commands: []
  files: []
  urls: []
scope:
  repo_paths: []
  forbidden_paths: []
  external_systems: []
next_action:
  gate: AUTO-SAFE|GO REQUIRED|STOP
  description: exactly one concrete action
---
```

## Rules the validator enforces

- `summary` is one line and under 280 characters — detail belongs in the body.
- `from`/`to`/`type`/`status`/`gate` come from the closed lists above.
- `created_at` is a parseable timestamp.
- `next_action` carries a gate and exactly one action.
- No credentials anywhere in the message (bus rule 6).
- Any value containing `#` is quoted. Unquoted, YAML reads `summary: PR #593 is open`
  as the value `PR` plus a comment, and the rest of the sentence is gone. `bus send`
  refuses such a draft; `bus validate --warnings` reports existing ones. A deliberate
  comment (`status: done   # closed on main`, with a space after `#`) is left alone.

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

---

# Bus Message Schema v0.1 (pre-v1, historical)

Use this shape for files in `inbox/`, `outbox/`, `tasks/`, `context/`, and
`decisions/`. Markdown is the transport; YAML front matter carries fields that
agents can parse.

```yaml
---
id: MSG-YYYYMMDD-NNN-short-title
type: task|context|result|decision|state
status: draft|open|in_progress|blocked|done|archived
owner: agent-or-human
created_at: YYYY-MM-DDTHH:MM:SSZ
updated_at: YYYY-MM-DDTHH:MM:SSZ
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
