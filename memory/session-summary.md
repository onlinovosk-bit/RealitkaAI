## Session 2026-08-19
### Dokončené
- Critical-bug hunt + fix: matching recalculate tenant wipe (unscoped list reads + silent post-delete timeout)
- Unit + verification tests; report updated
### Rozpracované / Pending
- Merge matching fix PR after CI green
- Tracked open: #369 #370 #371 #374 #438 #439 #443 (+ this matching PR)
### Kľúčové súbory zmenené
- apps/crm/src/lib/matching-store.ts: scoped reads + fail-hard after delete
- apps/crm/src/lib/matching-hooks.ts: thread scoped client
- apps/crm/src/app/api/leads/** + properties/[id]: pass scoped into autoRecalculate*
- docs/reports/2026-08-19-critical-bug-hunt-matching-recalc.md: fix report
### Ďalší krok
Founder review/merge matching wipe fix; then merge remaining critical auth/billing PRs (#438 first).
