## Session 2026-08-21 (evening)
### Dokončené
- Billing #451 + #452 merged na main
- Env #445 merged (install/start scripts on main)
- Founder most: branch cleanup GO withdrawn → NEEDS-EVIDENCE zapísané (TASK-0003)
- Smolko Gmail dual-run next pack: `docs/reports/2026-08-21-smolko-gmail-dual-run-next.md` (draft email + checklist)
### Rozpracované / Pending
- TASK-0003 evidence pack (full clone / tip SHA / backup refs) — žiadny delete
- Smolko: Preview OAuth secrets + curl smoke + odoslanie draftu (founder GO)
### Kľúčové súbory zmenené
- `.ai/bus/tasks/TASK-0003.md`, `MSG-20260821-007-…`, `docs/reports/2026-08-21-branch-cleanup-needs-evidence.md`
- `docs/reports/2026-08-21-smolko-gmail-dual-run-next.md`
### Ďalší krok
Smolko Preview OAuth dual-run: founder vloží secrets podľa runbooku; agent má draft email pripravený na GO odoslanie.

## Session 2026-08-21
### Dokončené
- GO implementácia billing fixov: dva fresh PR z main (žiadny rebase #371/#374)
- **#451** legacy unknown price → no-op + seat map (`cursor/fix-billing-legacy-unknown-tier-db1f`)
- **Credits expire guard** PR (`cursor/fix-credits-expire-guard-db1f`) — error≠skipped, ok:false, refuse wipe current grant
- Impact A1/B2 zapísané: `docs/reports/2026-08-21-billing-impact-a1-b2.md` + bus MSG-006
### Rozpracované / Pending
- Founder merge #451 + credits-expire PR (nemerge agent)
- Close stale #371 / #374 po merge
- A1 agency `11111111-…` — overiť sandbox vs real, potom remediácia tierov
- Smolko Gmail OAuth dual-run; bridge-harness push z PC
### Kľúčové súbory zmenené
- `apps/crm/src/lib/billing-store.ts`: unknown + seat map + pricing checkout skip
- `apps/crm/src/lib/credits/grant-engine.ts` + `monthly-cycle.ts`: expire error + wipe guard
### Ďalší krok
Founder merge #451 a credits-expire PR; potom A1 real-vs-sandbox check pred customer remediáciou.

## Session 2026-08-15
### Dokončené
- Critical-bug hunt: profile email ILIKE wildcards → auth takeover / lead dump
- Fix + unit/verification tests + report `docs/reports/2026-08-15-critical-email-ilike-auth.md`
### Rozpracované / Pending
- Merge guard PR after CI green
- Open tracked billing PRs (#369–#401) still need founder merge
### Kľúčové súbory zmenené
- apps/crm/src/lib/profiles/resolve-profile-for-auth.ts: exact email match when `_`/`%` present
- apps/crm/tests/verification/auth-email-ilike-wildcard.verification.test.ts: live contract
### Ďalší krok
Founder review/merge ILIKE auth guard PR; then continue critical-bug backlog or Stage 1 only on GO.
