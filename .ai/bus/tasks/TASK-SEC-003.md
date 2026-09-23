---
id: TASK-SEC-003
type: task
status: open
owner: unassigned
created_at: 2026-09-17T19:10:00Z
updated_at: 2026-09-17T19:10:00Z
source: "PR #490 https://github.com/onlinovosk-bit/RealitkaAI/pull/490 — conflict-PR security finding transfer 2026-09-17"
target: "founder-review → executor after GO (fix only; do not close #490 until card accepted)"
scope:
  repo_paths:
    - apps/crm/src/lib/lead-automation-store.ts
    - apps/crm/src/app/api/automation/rules/**
    - apps/crm/supabase/13_add_lead_assignment_rules.sql
    - apps/crm/supabase/migrations/**
    - .ai/bus/tasks/TASK-SEC-003.md
  forbidden_paths:
    - .github/workflows/**
acceptance:
  - id: A1
    desc: "loose SQL 13_add stále vytvára USING (true) demo policies"
    cmd: "rg -n \"using \\(true\\)\" apps/crm/supabase/13_add_lead_assignment_rules.sql"
    expect: exit_code == 0
  - id: A2
    desc: "store: cookie-less anon client + unscoped delete by id"
    cmd: "rg -n \"persistSession: false|lead_assignment_rules\\\"\\)\\.delete\" apps/crm/src/lib/lead-automation-store.ts"
    expect: exit_code == 0
  - id: A3
    desc: "tenant RLS migrácia z #490 nie je na main"
    cmd: "python -c \"from pathlib import Path; import sys; sys.exit(0 if not Path('apps/crm/supabase/migrations/20260827230000_lead_assignment_rules_tenant_rls.sql').exists() else 1)\""
    expect: exit_code == 0
risk: critical
evidence:
  commands:
    - "rg -n \"using \\(true\\)\" apps/crm/supabase/13_add_lead_assignment_rules.sql  # exit=0; demo_select/update/delete using(true)"
    - "rg -n \"persistSession: false|lead_assignment_rules\" apps/crm/src/lib/lead-automation-store.ts  # exit=0; line 39 persistSession false; line 356 unscoped delete"
    - "Test-Path apps/crm/supabase/migrations/20260827230000_lead_assignment_rules_tenant_rls.sql  # False; A490-3 exit=1"
    - "Note: migrations/20260904150000_drop_open_anon_policies.sql DROPs demo_* IF applied (commit f89d59ece / #533 message: NOT applied). Full tenant gate from #490 not on main."
  files:
    - apps/crm/supabase/13_add_lead_assignment_rules.sql
    - apps/crm/src/lib/lead-automation-store.ts
    - apps/crm/supabase/migrations/20260904150000_drop_open_anon_policies.sql
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/490
next_action:
  gate: GO REQUIRED
  description: "Po founder GO: agency_id + profile_agencies_for_auth policies + scoped store/API (PR #490); overiť prod apply state osobitne."
---

# TASK-SEC-003 — lead assignment rules cross-tenant wipe vektor

## Summary

Na `main` zostáva cookie-less anon store + `delete().eq("id")` bez `agency_id`.
Loose SQL `13_add_lead_assignment_rules.sql` stále definuje `USING (true)` pre
anon/authenticated. Tenant RLS migrácia z PR #490 **nie je** na main. Drop
open policies v `20260904150000_*` existuje, ale commit #533 ju označil
**NOT applied** — prod stav `unknown`. Nález **platí** ako otvorený fix scope.

## Context

- API `GET/POST /api/automation/rules` volá `listAssignmentRules()` /
  `createAssignmentRule()` bez tenant stamp.
- Out of scope tohto stacku: apply migrácie do produkcie.
- #569 opravil properties/tasks tenant scope, nie assignment rules.

## Evidence

```text
rg -n "using \(true\)" apps/crm/supabase/13_add_lead_assignment_rules.sql
# exit=0

rg -n "persistSession: false" apps/crm/src/lib/lead-automation-store.ts
# exit=0; unscoped .delete().eq("id", id) at line 356

# tenant mig from #490 absent on main → exit proof A490-3=1
```

## Next action

Founder GO → land tenant gate (migration + store + API) z #490 alebo ekvivalent;
prod apply ako samostatné rozhodnutie.
