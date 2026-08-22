# Critical bug — unauthenticated onboarding MVP PII + dispatch

**Date:** 2026-08-22  
**Severity:** HIGH (security / PII exfiltration + unauthenticated email send)  
**Status:** fixed on branch (PR pending)

## Bug

`proxy.ts` bypassed the session gate for the entire `/api/onboarding/mvp/` prefix.
Routes under that prefix use `createServiceRoleClient()` with **no route-level auth**:

| Route | Impact without auth |
|-------|---------------------|
| `GET /api/onboarding/mvp/at-risk` | Dumps up to 100 onboarding clients (`company`, `contact_name`, `contact_email`) |
| `POST /api/onboarding/mvp/messages/dispatch` | Triggers `runOnboardingDispatch()` → sends onboarding emails |
| `GET /api/onboarding/mvp/checklist` | Used `.ilike` on company/email → `%` / `_` wildcard PII probe |

Cron already has a gated twin at `POST /api/cron/onboarding-dispatch` (`Bearer CRON_SECRET`). The MVP dispatch path was an unauthenticated duplicate.

## Trigger

```bash
curl -sS "$APP_URL/api/onboarding/mvp/at-risk"
# → 200 + client PII (no cookie / no secret)

curl -sS -X POST "$APP_URL/api/onboarding/mvp/messages/dispatch"
# → runs email dispatch
```

## Fix

1. Narrow proxy public allowlist to checklist + schedule only (pre-login wizard).
2. Gate `at-risk` + `dispatch` with `requireOnboardingOperator()` (founder or `is_platform_admin`).
3. Checklist GET: `.ilike` → `.eq` to block wildcard probes.

## Validation

- Unit: `src/app/api/onboarding/mvp/__tests__/operator-auth.test.ts`
- Verification: `tests/verification/onboarding-mvp-auth.verification.test.ts`
