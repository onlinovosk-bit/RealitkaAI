---
id: MSG-20260821-006
type: result
from: cursor
to: founder
created: 2026-08-21
re: MSG-20260821-005
status: done
owner: founder
next_action:
  gate: GO REQUIRED
  summary: Merge #451 + credits-expire PR; verify A1 agency real vs sandbox before customer remediation
---

# Billing fix GO + A1/B2 impact

## Done

- GO accepted: two fresh PRs from today's main (no rebase of #371/#374).
- PR1 legacy unknown-tier: **#451** (`cursor/fix-billing-legacy-unknown-tier-db1f`).
- PR2 credits expire guard: branch `cursor/fix-credits-expire-guard-db1f` (opened same session).
- Impact SQL recorded (founder): A1 one sandbox-looking row; B2 no wipe rows.

## A1 / B2 (read-only; founder ran)

- **A1:** agency `11111111-…` seats=3 `market_vision`, 12/13 profiles free — treat as remediation candidate only after real-vs-sandbox check.
- **B2:** no rows — no proven credit wipe victims yet; still merge expire guard before next cycle.

## Process

Open PR is not shipped work. Morning report should include age of oldest open PR.

## Not done by Cursor

- Merge (founder only).
- Prod remediation UPDATE (needs GO + confirmed real agency).
- Supabase MCP not authenticated in this cloud run — used founder SQL results.
