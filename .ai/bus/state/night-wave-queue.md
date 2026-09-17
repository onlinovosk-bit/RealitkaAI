---
id: night-wave-queue
type: state
status: open
owner: orchestrator
created_at: 2026-08-25T21:15:00Z
updated_at: 2026-08-25T21:15:00Z
scope:
  repo_paths:
    - .ai/bus
  external_systems:
    - Cursor Cloud follow-up queue (read-only snapshot)
evidence:
  commands:
    - cursor-cloud get-message-queue → 0
  files:
    - docs/reports/2026-08-26-nocna-vlna-report.md
  urls: []
next_action:
  gate: STOP
  description: Do not start ONL-MCP-001 until the 26→27 window and conflict checks pass.
---

# Ruffo night-wave queue (repo-local)

**Pravda:** Toto nie je živý Ruffo scheduler. Cursor Automations / swarm queue sem job **nevložila**. Toto je jediná durable fronta, ktorú tento workspace vie zapísať.

## Aktívne / zatvorené okná

| Okno | Job | Stav 25. 8. 21:15 UTC |
|---|---|---|
| 25. → 26. 8. | Revolis `nocnavlna20260825.md` | Agent **STOP**. Draft PR #469 L30, #470 L31, #471 L32, #472 L33, #473 L34, #474 orch. Founder review ráno. |
| 26. → 27. 8. | **ONL-MCP-001** | **QUEUED** — `TASK-0005`, inbox `MSG-20260825-001` |
| blocked | ONL-MCP-002 | čaká na verdikt 001 |
| blocked | ONL-MCP-003 | čaká na 002 |
| blocked | ONL-MCP-004 | čaká na 003 |

## Preflight pred štartom ONL-MCP-001

```
1. Dátum/okno = 26.8. večer → 27.8. ráno (Europe/Bratislava)?
2. Revolis 25→26 stále len STOP (žiadny nový agent na tých vetvách)?
3. Žiadna nová Revolis nočná vlna v chate / inbox?
4. Ak Revolis potrebuje slot → abort, nechaj QUEUED.
5. Write globs len: docs/onlinovo/**, docs/reports/*onl-mcp*, .ai/bus/outbox/*onl-mcp*
6. Zakázané: apps/crm/**, supabase prod, secrets, merge, Shoptet write.
```

Ak krok 1–4 FAIL → nespúšťaj. Zapíš outbox MSG prečo.

## Kill / yield

Revolis > Onlinovo. Onlinovo job sa zabije / neodštartuje skôr ako Revolis lane.
