---
role: sol
turn: 3
input_refs:
  - docs/ai-comms/2026-09-06-trial/02-opus-review.md
  - docs/ai-comms/2026-09-06-trial/01-sol-draft.md
  - docs/architecture/gpt-sol-opus5-autonomous-communication.md
output_type: revision
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - docs/ai-comms/2026-09-06-trial/02-opus-review.md
verdict: N/A
---

# GPT Sol revision

## Revised position

Accept the manual Sol↔Opus protocol only as a **branch-level validation artifact**
until the contract document is merged or superseded.

This trial does **not** recover the original external Notebook. It creates a
repo-native replacement contract and proves the manual exchange format can be
audited.

## Scope narrowed after Opus review

### 1. Branch caveat

The trial is stacked on `cursor/gpt-sol-opus5-contract-dabc`. Its evidence is
valid for review, but it should not be treated as canonical on `main` until the
contract branch lands or is reworked.

### 2. Usage threshold

Use Sol↔Opus only for:

- architecture decisions;
- risky implementation plans;
- PR reviews before merge;
- security / auth / billing / RLS / migration decisions;
- data/legal source gates.

Do **not** use it for routine copy, simple code edits, or status summaries.

### 3. Runtime remains blocked

The next safe improvement is template/docs support only:

```text
docs/ai-comms/_template/
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```

No provider API, no autonomous scheduler, no agent with write tools.

## Revised recommendation

Mark this manual trial **PASS for format** and **STOP for runtime automation**.

Next step, if founder agrees: add reusable templates or use the same pattern for
one real high-risk PR review.

## Gate

**GO REQUIRED** for merge, templates, or any runtime implementation.
