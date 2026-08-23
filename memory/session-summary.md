## Session 2026-08-23
### Dokončené
- Critical bug hunt + fix: `auth-email-tests` cross-tenant recovery-link takeover + invite agency_id stamp
- PR https://github.com/onlinovosk-bit/RealitkaAI/pull/462 — unit + verification tests green (12)
- Reports: `docs/reports/2026-08-23-critical-bug-hunt.md`, `docs/reports/2026-08-23-auth-email-tests-tenant-fix.md`
### Rozpracované / Pending
- Merge review for #462 (auth-sensitive)
- Still open tracked bugs: #369 #370 #443 #444 #447 #459
- Medium (not fixed): empty agencyId seat/topup checkout → forever 500 after pay
### Kľúčové súbory zmenené
- `apps/crm/src/app/api/settings/auth-email-tests/route.ts`: agency-scope recovery + invite agency_id
- `apps/crm/tests/verification/auth-email-tests-tenant.verification.test.ts`: live spec
### Ďalší krok
Founder review/merge #462; then consider empty-agencyId checkout preflight (medium confidence).


## Session 2026-08-22
### Dokončené
- Founder `GO IMPLEMENT V0` prijaté; pred prvým runtime editom **STOP** — Phase 0 baseline v tomto clone chýba
- Spec check-in: BO + plan + baseline manifest + STOP report
- Decision Memory: `D-2026-08-18-01` + V0 amendment + `D-2026-08-22-01` STOP
### Rozpracované / Pending
- Founder musí commit+push `feat/bridge-harness` (9 staged blob IDs z manifestu)
- Až potom nové `GO IMPLEMENT V0` na tom commite
- Runtime `scripts/ruflo-model-bridge/**` sa v tomto clone **nemenil** (neexistuje)
### Kľúčové súbory zmenené
- `docs/briefs/BO-agent-os-v0-bounded-workflow-kernel.md`: canonical V0 BO
- `docs/briefs/plans/BO-agent-os-v0-bounded-workflow-kernel-plan.md`: implementation plan
- `docs/reports/2026-08-22-agent-os-v0-implementation-stop.md`: contradiction report
- `memory/decisions.md`: Phase 0 + V0 amendment + STOP
### Ďalší krok
Capture PC: paste PowerShell unlock from STOP report addendum; then `GO IMPLEMENT V0`.

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
