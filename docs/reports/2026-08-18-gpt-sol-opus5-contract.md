# GPT Sol ↔ Opus 5 contract draft

**Date:** 2026-08-18  
**Branch:** `cursor/gpt-sol-opus5-contract-dabc`  
**Mode:** docs-only contract. No runtime implementation.

## What changed

Created:

```text
docs/architecture/gpt-sol-opus5-autonomous-communication.md
```

The document defines:

- roles for GPT Sol, Opus 5, and founder;
- repo-mediated markdown transport;
- model-to-model state machine;
- max 3-turn loop limit;
- blocked actions without founder GO;
- first manual trial criteria;
- implementation backlog after successful trial.

## Strategic verdict

**VALIDATE / CONTRACT ONLY.**

Runtime model-to-model automation is too early until one manual Sol↔Opus loop
produces a useful repo artifact without hidden assumptions, scope drift, or
unapproved actions.

## Verification

Docs-only change. Verification is structural:

- uses existing `RUFLO-ORCHESTRATION.md` and LLM gateway direction;
- follows AI Security least-privilege / human-gate constraints;
- includes Engineering justification block;
- does not grant PROD, merge, secrets, or external communication capability.

## Next gate

Founder GO required for first manual trial:

```text
docs/ai-comms/2026-08-18-trial/
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```
