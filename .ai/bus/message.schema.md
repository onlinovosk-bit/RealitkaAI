# Bus Message Schema v0.1

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
