---
id: MSG-20260825-001-onl-mcp-001-queued
type: task
status: open
owner: onlinovo-lane
created_at: 2026-08-25T21:15:00Z
updated_at: 2026-08-25T21:15:00Z
scope:
  repo_paths:
    - .ai/bus/tasks/TASK-0005.md
    - .ai/bus/context/CTX-0002-onl-mcp-001.md
    - .ai/bus/state/night-wave-queue.md
    - docs/prompts/onl-mcp-001-feasibility.md
    - docs/reports/2026-08-25-onl-mcp-001-queued.md
  external_systems:
    - Onlinovo.sk
    - Shoptet (read-only research, not now)
evidence:
  commands:
    - git log origin/main --oneline -3
    - cursor-cloud get-message-queue → queuedMessageCount 0
  files:
    - docs/reports/2026-08-26-nocna-vlna-report.md
  urls:
    - https://github.com/onlinovosk-bit/RealitkaAI/pull/474
next_action:
  gate: GO REQUIRED
  description: Consume this inbox item only in the 26→27 Aug Onlinovo night slot.
---

# ONL-MCP-001 queued — do not start tonight

## Summary

Founder nastavil poradie Ruffo vĺn. Revolis nočná vlna `20260825.md` má agent **STOP** (draft PR #469–#474). **ONL-MCP-001 sa dnes nespúšťa.** Karta je v `inbox/` ako čakajúca práca na noc **26. → 27. 8.**

Toto **nie je** fyzický insert do Cursor Automations / Ruffo live scheduler. Durable queue = tento bus.

## Context

- Project lane: **Onlinovo.sk**, nie Revolis CRM.
- Revolis má prioritu pri konflikte o compute / kontext / token / slot.
- ONL-MCP-002/003/004 sa nespúšťajú pred verdiktom 001.

## Evidence

- Revolis orch STOP: `docs/reports/2026-08-26-nocna-vlna-report.md` + PR #474.
- Cursor Cloud follow-up queue tohto behu: **0** queued messages (nástroj `get-message-queue`).
- `origin/main` obsahuje #456; vlna 25.→26. má vlastné draft PR, tento lane ich nesahe.

## Next action

Ďalší Onlinovo agent v okne 26.→27. 8.: prejsť `TASK-0005` bránu. Ak PASS → feasibility audit. Ak FAIL → nechať QUEUED.
