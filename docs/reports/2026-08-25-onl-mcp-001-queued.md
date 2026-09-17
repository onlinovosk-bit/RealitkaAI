# ONL-MCP-001 — zaradené do fronty, nespustené

**Dátum:** 2026-08-25 ~21:15 UTC  
**Rozhodnutie foundera:** poradie Ruffo vĺn.  
**Toto nie je feasibility audit.** Gateway sa nestaval.

## Fakty

| Tvrdenie | Nálepka | Dôkaz |
|---|---|---|
| Revolis vlna 25.→26. má agent STOP | FAKT | `docs/reports/2026-08-26-nocna-vlna-report.md`; draft PR #469–#474 |
| ONL-MCP-001 dnes nespustený | FAKT | žiadny `docs/onlinovo/ONL-MCP-FEASIBILITY.md`; žiadny Shoptet/MCP kód |
| Cursor Cloud follow-up queue tohto behu = 0 | FAKT | `cursor-cloud` `get-message-queue` |
| Job **nie je** vo live Ruffo/Automations scheduleri | FAKT | žiadny connector; user to aj povedal |
| Durable queue = `.ai/bus` | FAKT | `TASK-0005` status `queued`; inbox `MSG-20260825-001` |

## Kalendár

| Noc | Čo | Stav |
|---|---|---|
| 25. → 26. 8. | Revolis `20260825.md` | STOP na draft PR. ONL-MCP-001 **nesmie** siahnuť na tie vetvy. |
| 26. → 27. 8. | ONL-MCP-001 | **QUEUED.** Feasibility only. |
| po verdikte 001 | ONL-MCP-002 | implementačný návrh — **blocked** |
| po 002 | ONL-MCP-003 | MVP build — **blocked** |
| po 003 | ONL-MCP-004 | Ruffo integrácia — **blocked** |

## Konfliktová politika (záväzná)

1. Pred štartom Onlinovo: je aktívna Revolis nočná vlna? Ak áno → ostaň QUEUED.
2. Necommituj na Revolis lane vetvy (`cursor/workdesk-rail-8-sections-db1f`, `paleta-admiral`, `dodane-od-10-08`, `demo-seed-reality-monopol`, `operator-dashboard-audit`, `nocny-report-2026-08-26`).
3. Žiadny merge, žiadny deploy, žiadny `apps/crm` zápis z Onlinovo lane.
4. Pri nedostatku slotu / tokenov **vyhráva Revolis**.
5. 001 = rozhodnutie, nie polovičná implementácia gateway.

## Kde je job

- Karta: `.ai/bus/tasks/TASK-0005.md`
- Inbox: `.ai/bus/inbox/MSG-20260825-001-onl-mcp-001-queued.md`
- Prompt: `docs/prompts/onl-mcp-001-feasibility.md`
- Kalendár: `.ai/bus/state/night-wave-queue.md`
- Decision: `.ai/bus/decisions/DEC-20260825-001-onlinovo-revolis-lanes.md`

Výstup auditu (až 26.→27.): `docs/onlinovo/ONL-MCP-FEASIBILITY.md` — nie Revolis `docs/architecture/`.

## Čo by zmenilo QUEUED → in_progress

GO foundera v okne 26.→27. **alebo** automatický preflight PASS podľa `night-wave-queue.md`. Bez toho ostáva fronta.
