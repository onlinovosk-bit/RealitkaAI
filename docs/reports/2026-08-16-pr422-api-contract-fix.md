# 2026-08-16 — PR #422 API contract ratchet

## Check
- Job: Code Contract Guard / Zmluva kódu (ratchet)
- Details: https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/31911201743/job/95076404711
- PR: https://github.com/onlinovosk-bit/realitkaai/pull/422
- Head: 2e51944e4f588cda13a0bff708eff0760713c257 (pre-fix)

## Root cause
New route `apps/crm/src/app/api/inbound/gmail-pull/route.ts` used `NextResponse.json` and did not import:
- `@/lib/api-response` (`okResponse` / `errorResponse`)
- `@/lib/usage-metrics` (`incrementUsageMetric`)

Ratchet: 538 violations vs 536 baseline = 2 new. Node 20 deprecation warning is unrelated.

## Fix
Route now returns `errorResponse` / `okResponse` and records a zero-delta usage metric on `SYSTEM_USAGE_AGENCY_ID` after CRON auth (same pattern as other non-tenant system routes).

## Verified
- `node apps/crm/scripts/check-api-contract.mjs --ci` → NOVÉ porušenia: 0
- `npx vitest run` gmail-pull route + lib tests → 10/10 passed

## Risk
Live Gmail pull still 401 until middleware/proxy allowlists `/api/inbound/` (separate GO). This commit does not change that.

## Classification
`diffRelation=related` `flakeAssessment=unlikely` `recommendedAction=fix` `confidence=high`
