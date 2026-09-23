---
id: TASK-SEC-001
type: task
status: open
owner: unassigned
created_at: 2026-09-17T19:10:00Z
updated_at: 2026-09-17T19:10:00Z
source: "PR #563 https://github.com/onlinovosk-bit/RealitkaAI/pull/563 — conflict-PR security finding transfer 2026-09-17"
target: "founder-review → executor after GO (fix only; do not close #563 until card accepted)"
scope:
  repo_paths:
    - apps/crm/src/app/api/sales-funnel/update-status/**
    - apps/crm/src/app/(dashboard)/sales-funnel/**
    - apps/crm/src/lib/sales-funnel-store.ts
    - .ai/bus/tasks/TASK-SEC-001.md
  forbidden_paths:
    - apps/crm/supabase/migrations/**
    - .github/workflows/**
acceptance:
  - id: A1
    desc: "update-status nemá requirePlatformAdmin/isPlatformAdmin (nález ešte na main)"
    cmd: "rg -n \"requirePlatformAdmin|isPlatformAdmin|is_platform_admin\" apps/crm/src/app/api/sales-funnel/update-status/route.ts"
    expect: exit_code == 1
  - id: A2
    desc: "sales-funnel page nemá platform-admin / notFound gate"
    cmd: "rg -n \"requirePlatformAdmin|isPlatformAdmin|is_platform_admin|notFound\" \"apps/crm/src/app/(dashboard)/sales-funnel/page.tsx\""
    expect: exit_code == 1
  - id: A3
    desc: "update-status stále mutuje saas_leads po samotnom getUser"
    cmd: "rg -n \"getUser|saas_leads\" apps/crm/src/app/api/sales-funnel/update-status/route.ts"
    expect: exit_code == 0
risk: critical
evidence:
  commands:
    - "rg -n \"requirePlatformAdmin|isPlatformAdmin|is_platform_admin\" apps/crm/src/app/api/sales-funnel/update-status/route.ts  # exit=1 (no matches)"
    - "rg -n \"requirePlatformAdmin|isPlatformAdmin|is_platform_admin|notFound\" \"apps/crm/src/app/(dashboard)/sales-funnel/page.tsx\"  # exit=1 (no matches)"
    - "rg -n \"getUser|saas_leads\" apps/crm/src/app/api/sales-funnel/update-status/route.ts  # exit=0; lines 11 getUser, 22 saas_leads"
    - "python tmp/sec-acceptance-exits.py  # A563-1=1 A563-2=1 A563-3=0"
  files:
    - apps/crm/src/app/api/sales-funnel/update-status/route.ts
    - apps/crm/src/app/(dashboard)/sales-funnel/page.tsx
    - apps/crm/supabase/18_add_tasks_and_saas_leads.sql
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/563
next_action:
  gate: GO REQUIRED
  description: "Po founder GO implementovať requirePlatformAdmin na update-status + page gate; nezatvárať #563 skôr, než je karta done."
---

# TASK-SEC-001 — sales-funnel bez platform-admin gate (status mutate + PII)

## Summary

Na aktuálnom `main` môže ktorýkoľvek authenticated tenant user volať
`POST /api/sales-funnel/update-status` (iba `auth.getUser()`) a mutovať
`saas_leads`. Stránka `/sales-funnel` nemá `is_platform_admin` / `notFound`
gate — PII prospectov je viditeľné. Nález z PR #563 **stále platí**.

## Context

- RLS na `saas_leads` umožňuje broad update/select (`owner_profile_id IS NULL` /
  `using (true)` v loose SQL / migráciách).
- Out of scope tohto stacku: samotný fix kódu (iba prenos nálezu).
- Súvisiace PR #569/#572/#575 sa tohto nálezu nedotkli.

## Evidence

Repro na `main` @ `6f6381ca0` (2026-09-17):

```text
rg -n "requirePlatformAdmin|isPlatformAdmin|is_platform_admin" \
  apps/crm/src/app/api/sales-funnel/update-status/route.ts
# exit=1 — žiadny match

rg -n "getUser|saas_leads" apps/crm/src/app/api/sales-funnel/update-status/route.ts
# exit=0 — getUser + update saas_leads
```

## Next action

Founder GO → executor opraví podľa PR #563 (alebo ekvivalent); potom aktualizovať
kartu a až potom riešiť close #563.
