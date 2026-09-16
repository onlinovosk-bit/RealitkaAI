---
id: TASK-RLS-ONBOARDING-SESSION
type: task
status: done
owner: founder
created_at: 2026-09-04T12:00:00Z
updated_at: 2026-09-16T22:30:00+02:00
scope:
  repo_paths:
    - apps/crm/src/app/api/onboarding/session/**
    - apps/crm/src/lib/onboarding/**
    - apps/crm/supabase/migrations/20260904220000_drop_onboarding_sessions_anon_all.sql
    - docs/runbooks/rollback-onboarding-sessions-anon.md
    - docs/reports/2026-09-04-rls-onboarding-session-api.md
  forbidden_paths:
    - apps/crm/src/app/api/automation/rules/**
verdict:
  result: ACCEPT
  reason: "Founder GO CONFIRM-APPLIED 2026-09-16 — prod OK; PR #534 merged; task closed"
  checked_at: 2026-09-16T22:30:00+02:00
  ledger_run_id: null
founder_approval:
  verdict_run_id: null
  approved_by: "Andrej Ondrus"
  approved_at: "2026-09-16T22:30:00+02:00"
  reason: "GO CONFIRM-APPLIED — production migration/state OK; mark task done"
---

# TASK-RLS-ONBOARDING-SESSION — zatvoriť `Allow anon access`

**Status:** `done` (Founder `GO CONFIRM-APPLIED` 2026-09-16)  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/534 — **MERGED** 2026-09-05 (`3aed4fcf7`)  
**Branch:** `security/rls-onboarding-session`  
**Report:** `docs/reports/2026-09-04-rls-onboarding-session-api.md`  
**Decision:** `.ai/bus/decisions/DEC-20260916-001-rls-onboarding-confirm-applied.md`

## Acceptance (closed)

- [x] Code Path B on `main` (session API + DROP migration file)
- [x] PR #534 merged
- [x] Founder confirms production OK (`GO CONFIRM-APPLIED`)
- [x] Rollback runbook remains available if needed

## Out of scope (unchanged)

- `lead_assignment_rules` / `agency_id` drift → Brief 17
- `integration_settings` conscious deny

## Historical problem statement

`onboarding_sessions` had `Allow anon access` (`FOR ALL TO anon USING (true)`).
Path B: API `POST/GET /api/onboarding/session` (service role) + DROP anon ALL.
See report for implementation detail — do not re-paste here.
