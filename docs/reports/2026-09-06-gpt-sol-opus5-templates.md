# GPT Sol ↔ Opus 5 templates

**Date:** 2026-09-06  
**Branch:** `cursor/gpt-sol-opus5-templates-dabc`  
**Base:** stacked on `cursor/gpt-sol-opus5-trial-dabc`  
**Mode:** docs-only reusable templates. No runtime automation.

## What changed

Created reusable templates:

```text
docs/ai-comms/_template/
  README.md
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```

## Why

The first manual trial passed for format. Templates reduce drift in future
high-risk Sol↔Opus reviews by forcing:

- explicit scope;
- evidence paths;
- FACT / ASSUMPTION / UNKNOWN labels;
- PASS / FLAG / RETURN / STOP verdicts;
- GO gates for merge, PROD, secrets, external send, and runtime automation.

## Verification

Docs-only change. Verification performed:

- `git diff --check`
- frontmatter field count across all five turn templates
- marker check for blocked actions and verdict vocabulary

## Not done

- No provider API.
- No scheduler.
- No tool-bearing model loop.
- No merge.
- No PROD write.

## Next gate

Founder GO required to apply the protocol to one real high-risk PR review.
