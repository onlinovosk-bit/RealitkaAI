# GPT Sol ↔ Opus 5 manual trial

**Date:** 2026-09-06  
**Branch:** `cursor/gpt-sol-opus5-trial-dabc`  
**Base:** stacked on `cursor/gpt-sol-opus5-contract-dabc`  
**Mode:** docs-only manual protocol trial. No runtime automation.

## What changed

Created the first manual Sol↔Opus exchange:

```text
docs/ai-comms/2026-09-06-trial/
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```

## Verdict

**PASS for manual protocol format.**  
**STOP for runtime automation.**

## Evidence

- Sol draft separated FACT / ASSUMPTION / UNKNOWN.
- Opus review returned concrete FLAGs:
  - contract branch dependency;
  - original external Notebook still missing;
  - runtime automation temptation;
  - indirect business value.
- Sol revision narrowed the protocol to high-risk decisions only.
- Final verdict keeps merge, PROD, secrets, external send, and runtime automation
  behind founder GO.

## Not proven

- Original external Notebook content was not recovered.
- Provider-to-provider automation is not approved.
- This is branch evidence until the contract branch is merged or superseded.

## Next gate

Founder GO required for either:

1. reusable templates under `docs/ai-comms/_template/`; or
2. applying Sol↔Opus to one real high-risk PR review.
