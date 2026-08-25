---
id: DEC-20260825-001-onlinovo-revolis-lanes
type: decision
status: open
owner: founder
created_at: 2026-08-25T21:15:00Z
updated_at: 2026-08-25T21:15:00Z
scope:
  repo_paths:
    - .ai/bus/state/night-wave-queue.md
    - .ai/bus/tasks/TASK-0005.md
  external_systems: []
evidence:
  commands: []
  files:
    - docs/reports/2026-08-25-onl-mcp-001-queued.md
  urls: []
next_action:
  gate: STOP
  description: Follow the wave calendar; do not start ONL-MCP-001 on 25→26.
---

# DEC-20260825-001 — oddelené vlny Revolis / Onlinovo

**Rozhodnutie foundera (25. 8. 2026):** Ruffo vlny idú sériovo, nie naraz.

| Noc | Lane | Pravidlo |
|---|---|---|
| 25. → 26. 8. | Revolis `20260825.md` | Beží / STOP na draft PR. **ONL-MCP-001 nesmie zasiahnuť.** |
| 26. → 27. 8. | ONL-MCP-001 | Samostatný Onlinovo lane. Revolis má prioritu, ak sa jeho práca predĺži. |
| Až po verdikte 001 | ONL-MCP-002 | Implementačný návrh |
| Až po 002 | ONL-MCP-003 | MVP build |
| Až po 003 | ONL-MCP-004 | Integrácia do Ruffo |

## Konfliktová politika

1. Pred štartom Onlinovo jobu zisti, či existuje aktívna Revolis nočná vlna.
2. Ak áno → Onlinovo ostáva QUEUED.
3. Nezasahuj do bežiacej vlny (žiadny commit na jej vetvy, žiadny merge, žiadny deploy).
4. Nevytváraj PR, ktorý mieša Onlinovo produkt do Revolis `apps/crm`.
5. Pri nedostatku AI compute / kontextu / tokenov / slotu **vyhráva Revolis**.
6. ONL-MCP-001 = feasibility. Žiadny produkčný MCP gateway v tej istej noci.

Toto je Decision Memory pre orchestráciu. Nie je to verdikt BUILD/BUY pre gateway.
