## Session 2026-08-25
### Dokončené
- Revolis nočná vlna 20260825: L30–L34 + orch, draft PR #469–#474, STOP
- ONL-MCP-001 **zaradené do bus fronty**, nespustené (kalendár 26.→27.)
### Rozpracované / Pending
- Founder review Revolis PR v poradí L34→L30→L33→L32→L31
- ONL-MCP-001 ostáva QUEUED; 002/003/004 blocked
- `GO SEARCH-PAGING` / `GO IMPLEMENT PRICING V2` / `GO IMPLEMENT ACTION CENTER V0` — neudelené
- Agent OS V0: stále treba push `feat/bridge-harness`
### Kľúčové súbory zmenené
- `.ai/bus/tasks/TASK-0005.md`: Onlinovo MCP audit karta, status queued
- `.ai/bus/state/night-wave-queue.md`: kalendár + konfliktová politika
- `docs/reports/2026-08-25-onl-mcp-001-queued.md`: dôkaz, že job nie je vo live scheduleri
### Ďalší krok
Nespúšťať Onlinovo audit. Ráno Revolis review. ONL-MCP-001 až v okne 26.→27. po preflight PASS.

## Session 2026-08-24
### Dokončené
- #461 merged `47ec4852`
- GO FÁZA A + audit merged #463 (`1cf82d32`)
- Spec check-in BO-A Action Center V0 + BO-B Pricing v2 (docs only)
### Rozpracované / Pending
- Merge spec PR BO-A/BO-B — **žiadny runtime**
- `GO SEARCH-PAGING` = paging diera + `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`
- `GO IMPLEMENT PRICING V2` / `GO IMPLEMENT ACTION CENTER V0` — **neudelené**
### Ďalší krok
Founder merge spec PR; paging len po `GO SEARCH-PAGING`; AC/pricing runtime až po vlastných GO frázach.

