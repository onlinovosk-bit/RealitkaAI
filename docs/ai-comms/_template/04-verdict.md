---
role: system
turn: 4
input_refs:
  - docs/ai-comms/YYYY-MM-DD-topic/00-brief.md
  - docs/ai-comms/YYYY-MM-DD-topic/01-sol-draft.md
  - docs/ai-comms/YYYY-MM-DD-topic/02-opus-review.md
  - docs/ai-comms/YYYY-MM-DD-topic/03-sol-revision.md
output_type: verdict
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - docs/ai-comms/YYYY-MM-DD-topic/02-opus-review.md
  - docs/ai-comms/YYYY-MM-DD-topic/03-sol-revision.md
verdict: REPLACE_WITH_PASS_FLAG_RETURN_OR_STOP
---

# Final verdict — REPLACE_WITH_TOPIC

## Verdict

**REPLACE_WITH_PASS_FLAG_RETURN_OR_STOP for manual protocol outcome.**

**Runtime/prod/merge/external actions:** REPLACE_WITH_STOP_OR_GO_REQUIRED.

## What was proven

1. REPLACE_WITH_PROVEN_POINT.
2. REPLACE_WITH_PROVEN_POINT.

## What was not proven

1. REPLACE_WITH_NOT_PROVEN_POINT.
2. REPLACE_WITH_NOT_PROVEN_POINT.

## Canonical rule after trial

REPLACE_WITH_RULE_OR_NO_NEW_RULE.

## Next allowed step

**REPLACE_WITH_AUTO_SAFE_OR_GO_REQUIRED_OR_STOP:** REPLACE_WITH_NEXT_STEP.
