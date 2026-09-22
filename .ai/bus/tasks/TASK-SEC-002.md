---
id: TASK-SEC-002
type: task
status: open
owner: unassigned
created_at: 2026-09-17T19:10:00Z
updated_at: 2026-09-17T19:10:00Z
source: "PR #495 https://github.com/onlinovosk-bit/RealitkaAI/pull/495 — conflict-PR security finding transfer 2026-09-17"
target: "founder-review → executor after GO (fix only; do not close #495 until card accepted)"
scope:
  repo_paths:
    - apps/crm/src/app/api/webhooks/inbound-lead/**
    - apps/crm/src/lib/inbound/process-lead.ts
    - apps/crm/src/lib/inbound/**
    - .ai/bus/tasks/TASK-SEC-002.md
  forbidden_paths:
    - apps/crm/supabase/migrations/**
    - .github/workflows/**
acceptance:
  - id: A1
    desc: "INBOUND_WEBHOOK_SECRET je stále optional (if secret)"
    cmd: "rg -n \"if \\(secret\\)\" apps/crm/src/app/api/webhooks/inbound-lead/route.ts"
    expect: exit_code == 0
  - id: A2
    desc: "processInboundLead používa cookie/anon createClient + insert bez kontroly error"
    cmd: "rg -n \"createClient\\(\\)|from\\('leads'\\)\\.insert\" apps/crm/src/lib/inbound/process-lead.ts"
    expect: exit_code == 0
risk: high
evidence:
  commands:
    - "rg -n \"if \\(secret\\)\" apps/crm/src/app/api/webhooks/inbound-lead/route.ts  # exit=0; line 12"
    - "rg -n \"createClient\\(\\)|from\\('leads'\\)\\.insert\" apps/crm/src/lib/inbound/process-lead.ts  # exit=0; lines 36, 40"
    - "python tmp/sec-acceptance-exits.py  # A495-1=0 A495-2=0; ignores_insert_error=True"
  files:
    - apps/crm/src/app/api/webhooks/inbound-lead/route.ts
    - apps/crm/src/lib/inbound/process-lead.ts
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/495
next_action:
  gate: GO REQUIRED
  description: "Po founder GO: require secret, service-role insert, fail on insert/profile error; nezatvárať #495 skôr."
---

# TASK-SEC-002 — inbound-lead webhook ticho zahadzuje leady

## Summary

`POST /api/webhooks/inbound-lead` má auth optional (`if (secret)`). Processor
používa cookie/anon `createClient()` a `leads.insert` **bez kontroly error** —
po revoke anon práv na `leads` handler vie vrátiť `{ ok: true, leadId }` bez
riadku. Nález z PR #495 **stále platí** na `main`.

## Context

- BRI fallback `?? 50` stále v `process-lead.ts` (môže spustiť auto-reply).
- Out of scope: produkčný apply migrácií / zápis do prod DB.
- #569/#572/#575 sa webhooku nedotkli.

## Evidence

```text
rg -n "if \(secret\)" apps/crm/src/app/api/webhooks/inbound-lead/route.ts
# exit=0 → line 12

rg -n "createClient\(\)|from\('leads'\)\.insert" apps/crm/src/lib/inbound/process-lead.ts
# exit=0 → lines 36, 40; insert result unchecked
```

## Next action

Founder GO → fail-closed secret + service-role insert + throw on failure
(podľa #495); potom update karty.
