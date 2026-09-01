# CRITICAL: inbound-lead webhook silent lead drop + optional auth

**Date:** 2026-09-01  
**Severity:** CRITICAL (data loss + unauthenticated side-effects)  
**PR:** (opened this run)

## Bug

`POST /api/webhooks/inbound-lead`:

1. **Silent data loss** — `processInboundLead` used cookie `createClient()` (anon, no session on webhooks). After `REVOKE ALL … FROM anon` on `public.leads`, inserts fail, but the error was ignored and the handler still returned `{ ok: true, leadId }`. Callers believed the lead was stored.
2. **Optional auth** — `if (secret) { … }` fail-open when `INBOUND_WEBHOOK_SECRET` unset; `/api/webhooks/*` bypasses the proxy session gate.
3. **Fake BRI score → auto-reply** — `bri?.new_score ?? 50` with threshold 40 meant a failed BRI still attempted Resend/WhatsApp auto-reply.

## Trigger

1. Marketing/portal posts a valid inbound payload (with or without Bearer, depending on env).
2. Insert is rejected (anon / RLS) → no row in `leads`.
3. Response is still `200 { ok: true, leadId: <uuid> }` → lead never appears in CRM.

## Fix

- Require `INBOUND_WEBHOOK_SECRET` (503 if unset, 401 if wrong; timing-safe compare).
- Pass `createServiceRoleClient()` into `processInboundLead` after auth.
- Resolve profile, require `agency_id`, stamp it on the lead insert.
- Throw on insert failure (route returns 5xx/422 — no silent ACK).
- Auto-reply only when BRI actually computed (`bri` non-null); default score `0` on failure.

## Validation

```text
npx vitest run \
  src/app/api/webhooks/inbound-lead/__tests__/route.test.ts \
  src/lib/inbound/__tests__/process-lead.test.ts \
  tests/verification/inbound-lead-webhook.verification.test.ts
# 3 files / 8 tests PASS
```

## Residual risk

- Deployments must set `INBOUND_WEBHOOK_SECRET` or the webhook returns 503 (intentional fail-closed).
- Matching recalculate wipe (#444 report-only) and other open critical PRs remain unmerged.
