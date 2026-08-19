## Session 2026-08-19
### Dokončené
- Critical-bug hunt (post-#428–#434): 2 HIGH bugs in matching-store recalculate paths
- Report: `docs/reports/2026-08-19-critical-bug-hunt-matching-recalc.md`
### Rozpracované / Pending
- Fix Bug 1: pass scoped client to listLeads/listProperties in recalculateAllMatches + recalculateMatchesForProperty
- Fix Bug 2: transactional replace or fail-hard after delete in matching recalculate
- Tracked PRs #438–#443 still open
### Kľúčové súbory zmenené
- docs/reports/2026-08-19-critical-bug-hunt-matching-recalc.md: hunt findings
### Ďalší krok
GO-gated fix PR for matching recalculate data loss (Bug 1 + Bug 2, single logical change)
