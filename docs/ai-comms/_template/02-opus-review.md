---
role: opus
turn: 2
input_refs:
  - docs/ai-comms/YYYY-MM-DD-topic/00-brief.md
  - docs/ai-comms/YYYY-MM-DD-topic/01-sol-draft.md
  - REPLACE_WITH_RELEVANT_CONTEXT
output_type: review
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - docs/ai-comms/YYYY-MM-DD-topic/01-sol-draft.md
  - REPLACE_WITH_EVIDENCE_PATH
verdict: REPLACE_WITH_PASS_FLAG_RETURN_OR_STOP
---

# Opus 5 review — REPLACE_WITH_TOPIC

## Verdict

**REPLACE_WITH_PASS_FLAG_RETURN_OR_STOP.**

## Findings

### 1. REPLACE_WITH_FINDING_TITLE

- **FACT / ASSUMPTION / UNKNOWN:** REPLACE_WITH_CLASSIFIED_CLAIM.
- **Evidence:** REPLACE_WITH_PATH_OR_LOG.
- **Risk:** REPLACE_WITH_CONCRETE_FAILURE_MODE.
- **Required fix:** REPLACE_WITH_FIX_OR_NONE.

### 2. REPLACE_WITH_FINDING_TITLE

- **FACT / ASSUMPTION / UNKNOWN:** REPLACE_WITH_CLASSIFIED_CLAIM.
- **Evidence:** REPLACE_WITH_PATH_OR_LOG.
- **Risk:** REPLACE_WITH_CONCRETE_FAILURE_MODE.
- **Required fix:** REPLACE_WITH_FIX_OR_NONE.

## What passes

- REPLACE_WITH_PASSING_POINT.

## Required Sol revision

REPLACE_WITH_SCOPE_NARROWING_OR_STOP_REASON.
