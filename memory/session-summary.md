## Session 2026-08-24
### Dokončené
- #461 merged `47ec4852`
- GO FÁZA A: copy filter vs hľadať; províziu von; paging nález v audite (bez API fixu)
### Rozpracované / Pending
- Merge #463 (audit + Fáza A copy) — **bez labelu automerge** (Tier 2, founder ručne)
- `GO SEARCH-PAGING` = paging diera + `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`
- BO Action Center V0 + Pricing v2: spec v repe, **implementačný GO neudelený**
### Kľúčové súbory zmenené
- `WorkdeskTopbar.tsx` / `lead-filters.tsx` / `leads-module.tsx` / `SemanticSearchBar.tsx`
- `docs/reports/2026-08-24-workdesk-search-architecture-audit.md`
### Ďalší krok
Founder merge PR; paging len po `GO SEARCH-PAGING`.


## Session 2026-08-23
### Dokončené
- Topbar search: `readOnly` → form + Hľadať, `/leads?q=` + filter sync
- Tests 7/7: workdesk-topbar-search verification + WorkdeskTopbar.search RTL
### Rozpracované / Pending
- Preview smoke of search behind login (TEST_USER)
- Agent OS V0 stále blocked na capture PC Phase 0
### Kľúčové súbory zmenené
- `apps/crm/src/components/layout/WorkdeskTopbar.tsx`: search form + Hľadať
- `apps/crm/src/components/leads/lead-filters.tsx`: hydrate/sync `?q=`
### Ďalší krok
Founder merge `fix/topbar-search` po CI; V0 stále čaká na push `feat/bridge-harness`.

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
