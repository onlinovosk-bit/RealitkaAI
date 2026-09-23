---
role: founder
turn: 0
input_refs:
  - docs/architecture/gpt-sol-opus5-autonomous-communication.md
  - docs/reports/2026-08-18-gpt-sol-opus5-contract.md
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
  - memory/session-summary.md
verdict: N/A
---

# Brief — first manual Sol↔Opus trial

## Scope

Run the first manual GPT Sol ↔ Opus 5 protocol trial as repo artifacts only.

This trial tests whether the contract can produce a useful, bounded, auditable
exchange without implementing runtime automation.

## Decision under review

Should Revolis continue with the repo-mediated Sol↔Opus protocol as the default
shape for model-to-model collaboration?

## Non-goals

- No provider API integration.
- No autonomous runtime loop.
- No PROD writes.
- No merge to `main`.
- No external communication.

## Required output

```text
docs/ai-comms/2026-09-06-trial/
  00-brief.md
  01-sol-draft.md
  02-opus-review.md
  03-sol-revision.md
  04-verdict.md
```

## Success criteria

1. Every substantive claim cites repo evidence or is labeled UNKNOWN.
2. Opus review must find concrete risks, not generic criticism.
3. Sol revision must narrow scope rather than expand it.
4. Final verdict must distinguish manual protocol PASS from runtime automation STOP.
