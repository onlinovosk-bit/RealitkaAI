---
id: TASK-SEC-004
type: task
status: open
owner: unassigned
created_at: 2026-09-17T19:10:00Z
updated_at: 2026-09-17T19:10:00Z
source: "PR #545 https://github.com/onlinovosk-bit/RealitkaAI/pull/545 — conflict-PR security finding transfer 2026-09-17"
target: "founder-review → executor after GO (fix only; do not close #545 until card accepted)"
scope:
  repo_paths:
    - apps/crm/src/app/(public)/buyer-onboarding/actions.ts
    - apps/crm/src/app/(public)/buyer-onboarding/**
    - apps/crm/src/lib/tasks-store.ts
    - .ai/bus/tasks/TASK-SEC-004.md
  forbidden_paths:
    - apps/crm/supabase/migrations/**
    - .github/workflows/**
acceptance:
  - id: A1
    desc: "buyer-onboarding createTask volanie bez second-arg admin client (tichý drop)"
    cmd: "python -c \"from pathlib import Path; t=Path(r'apps/crm/src/app/(public)/buyer-onboarding/actions.ts').read_text(encoding='utf-8'); i=t.find('await createTask('); w=t[i:i+550]; import sys; sys.exit(0 if ('createAdminClient' in t and ', admin)' not in w) else 1)\""
    expect: exit_code == 0
risk: high
evidence:
  commands:
    - "rg -n \"createTask\\(|createAdminClient\" \"apps/crm/src/app/(public)/buyer-onboarding/actions.ts\"  # exit=0; admin at 35, createTask({ at 187 without second arg"
    - "python check A545-1  # exit=0 hole=True (createAdminClient present; createTask window has no ', admin)')"
  files:
    - apps/crm/src/app/(public)/buyer-onboarding/actions.ts
    - apps/crm/src/lib/tasks-store.ts
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/545
next_action:
  gate: GO REQUIRED
  description: "Po founder GO: createTask(input, admin) v buyer-onboarding actions; nezatvárať #545 skôr."
---

# TASK-SEC-004 — buyer-onboarding createTask ticho zahadzuje úlohy

## Summary

Public buyer-onboarding vytvára lead cez `createAdminClient()`, ale `createTask(...)`
volá **bez** scoped/service-role druhého argumentu. `createTask` padne na
`resolveTenantSupabase()` / RLS `tasks_agency`; catch prehltne chybu → CRM
follow-up task `Nový buyer lead: …` nevznikne. Nález z PR #545 **stále platí**.

## Context

- #569 upravil `tasks-store` tenant list scope; **neopravil** toto call-site.
- Out of scope: migrácie.

## Evidence

```text
# actions.ts ~187: await createTask({ ... });  // no , admin)
# createAdminClient() exists at line 35 and is passed to auto-response, not createTask

python -c "... hole if createAdminClient and no ', admin)' in createTask window ..."
# exit=0 hole=True
```

## Next action

Founder GO → pass `admin` as second arg (ako `POST /api/tasks`); update kartu.
