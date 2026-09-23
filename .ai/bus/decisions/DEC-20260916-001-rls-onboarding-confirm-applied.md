---
id: DEC-20260916-001-rls-onboarding-confirm-applied
type: decision
status: superseded_in_part
superseded_in_part_by: DEC-20260916-002-rls-prod-state-unknown
owner: founder
created_at: 2026-09-16T22:30:00+02:00
updated_at: 2026-09-16T22:30:00+02:00
scope:
  repo_paths:
    - .ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md
    - docs/prompts/multi-agent-protocol-v0/VALIDATE-TASK-RLS-ONBOARDING-SESSION.md
  external_systems:
    - production-supabase
evidence:
  commands:
    - gh pr view 534
  files:
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/534
next_action:
  gate: AUTO-SAFE
  description: none — task closed
---

# DEC-20260916-001 — RLS onboarding session: CONFIRM-APPLIED

## DECISION

Founder token: **`GO CONFIRM-APPLIED`**

> **Amendment 2026-09-16 (DEC-20260916-002):** veta nižšie o produkcii je nahradená — produkčný stav = **UNKNOWN**, evidence tohto DEC dokazuje iba merge #534.

~~Production state for closing `onboarding_sessions` anon ALL is **OK**.~~  
`TASK-RLS-ONBOARDING-SESSION` → **`done`**.

## Context (refs only)

- Task: `.ai/bus/tasks/TASK-RLS-ONBOARDING-SESSION.md`
- Validate handoff: `docs/prompts/multi-agent-protocol-v0/VALIDATE-TASK-RLS-ONBOARDING-SESSION.md`
- Report: `docs/reports/2026-09-04-rls-onboarding-session-api.md`
- PR #534 MERGED 2026-09-05

## Not authorized

`GO APPLY-PROD` was **not** selected. No production SQL apply from this decision.
