---
id: TASK-SEC-002
type: task
status: done
owner: claude/keen-lovelace-ih8ej3
created_at: 2026-09-17T19:10:00Z
updated_at: 2026-09-24T20:10:00Z
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

## Resolution (2026-09-24, founder GO „Tier-3 brána pre inbound auto-reply")

**Na `main` od 2026-09-24 20:07Z** (squash `ebb55b1`, PR #690). Overené obsahom:
`git diff HEAD origin/main` na dotknutých cestách je prázdny. #689 sa zmergovala
pred pushom fixu a niesla len docs.

- **Secret je povinný.** Bez `INBOUND_WEBHOOK_SECRET` vráti endpoint 503 (fail-closed).
  Bearer sa porovnáva v konštantnom čase.
- **Service-role klient namiesto cookie/anon.** Lead sa zapíše s `agency_id` profilu.
  Neznámy profil alebo profil bez agentúry vráti 422.
- **Chyba pri inserte leadu zhodí request (AP-010).** Handler už nevracia `ok` bez riadku.
- **Rozšírenie nad rámec karty: Tier 3.** AI odpoveď sa už neposiela cez Resend ani WhatsApp.
  Uloží sa ako draft do `activities` (`meta.draft`, `meta.requires_approval`) a do
  `ai_action_audit` so stavom `ai_suggested` / `pending_human`. Odoslanie robí maklér.
- **Testy:** `lib/inbound/__tests__/process-lead.test.ts` (10) a
  `app/api/webhooks/inbound-lead/__tests__/route.test.ts` (6). Proti starému kódu
  13 zo 16 testov padne.

Acceptance A1 a A2 vyššie sú *dôkazy existencie chyby*. Po fixe majú vrátiť exit 1.
