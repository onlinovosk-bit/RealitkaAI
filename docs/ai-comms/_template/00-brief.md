---
role: founder
turn: 0
input_refs:
  - REPLACE_WITH_REPO_PATH_OR_URL
output_type: draft
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - REPLACE_WITH_EVIDENCE_PATH
verdict: N/A
---

# Brief — REPLACE_WITH_TOPIC

## Scope

REPLACE_WITH_EXACT_SCOPE.

## Decision under review

REPLACE_WITH_ONE_DECISION_QUESTION.

## Non-goals

- REPLACE_WITH_NON_GOAL_1
- REPLACE_WITH_NON_GOAL_2
- No PROD writes.
- No merge to `main`.
- No external communication.
- No runtime automation.

## Required output

```text
docs/ai-comms/YYYY-MM-DD-topic/
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```

## Success criteria

1. Every substantive claim cites repo evidence or is labeled UNKNOWN.
2. Opus review finds concrete risks, not generic criticism.
3. Sol revision narrows scope rather than expanding it.
4. Final verdict separates manual protocol outcome from runtime/prod/merge gates.
