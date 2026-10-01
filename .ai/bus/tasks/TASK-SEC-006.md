---
id: TASK-SEC-006
type: task
status: open
owner: unassigned
created_at: 2026-09-17T19:10:00Z
updated_at: 2026-09-17T19:10:00Z
source: "PR #370 https://github.com/onlinovosk-bit/RealitkaAI/pull/370 — conflict-PR security finding transfer 2026-09-17"
target: "founder-review → executor after GO (fix only; do not close #370 until card accepted)"
scope:
  repo_paths:
    - apps/crm/src/lib/credits-billing.ts
    - apps/crm/src/lib/credits/**
    - apps/crm/supabase/migrations/**
    - .ai/bus/tasks/TASK-SEC-006.md
  forbidden_paths:
    - .github/workflows/**
acceptance:
  - id: A1
    desc: "applyTopupPurchase stále robí absolute update purchased_credits_balance z JS súčtu"
    cmd: "rg -n \"purchased_credits_balance: purchased\" apps/crm/src/lib/credits-billing.ts"
    expect: exit_code == 0
  - id: A2
    desc: "credits-billing.ts nemá FOR UPDATE / atomic RPC lock na top-up path"
    cmd: "rg -n \"FOR UPDATE\" apps/crm/src/lib/credits-billing.ts"
    expect: exit_code == 1
risk: high
evidence:
  commands:
    - "rg -n \"purchased_credits_balance: purchased\" apps/crm/src/lib/credits-billing.ts  # exit=0; line 306"
    - "rg -n \"FOR UPDATE\" apps/crm/src/lib/credits-billing.ts  # exit=1 (no matches in TS writer)"
    - "Note: spend_credits SQL RPC already uses FOR UPDATE (20260611000003_spend_credits.sql); purchase/grant writers do not"
  files:
    - apps/crm/src/lib/credits-billing.ts
    - apps/crm/supabase/migrations/20260611000003_spend_credits.sql
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/370
next_action:
  gate: GO REQUIRED
  description: "Po founder GO: atomic purchase/grant/expire RPCs s row lock (PR #370); nezatvárať #370 skôr."
---

# TASK-SEC-006 — credits lost-update race (top-up / grant writers)

## Summary

`applyTopupPurchase` na `main` stále: SELECT balances → sčítať v JS → UPDATE
absolútnych hodnôt **bez** `FOR UPDATE` / atomic RPC. Concurrent top-upy
(alebo overlap s monthly cycle) môžu stratiť paid credits v
`purchased_credits_balance` pri zápise do ledgeru. Nález z PR #370 **stále platí**.

## Context

- `spend_credits` už má `FOR UPDATE` v SQL RPC — writers nie.
- PR #371 (billing webhook free wipe) je **OPRAVENÉ** samostatne cez
  `5bf8167dcc` (#451) — nie súčasť tejto karty.
- Out of scope: push/merge #370 bez GO.

## Evidence

```text
rg -n "purchased_credits_balance: purchased" apps/crm/src/lib/credits-billing.ts
# exit=0 → line 306 absolute write

rg -n "FOR UPDATE" apps/crm/src/lib/credits-billing.ts
# exit=1 → no lock in TS path
```

## Next action

Founder GO → atomic RPCs podľa #370; update kartu.
