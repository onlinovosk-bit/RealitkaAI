# Critical bug: demo booking silent CRM task drop

**Date:** 2026-09-13  
**Branch:** `fix/demo-booking-task-service-role`

## Bug and impact

Public demo form (`POST /api/sales-funnel/demo-request`, used by `DemoRequestForm`) returned `{ ok: true }` while the founder CRM follow-up task **never persisted**.

**Trigger:** Anonymous visitor submits “Požiadať o demo” on the marketing/demo page.

**Impact:** Confirmation UX + optional Resend email can succeed, but sales never gets `Naplánovať demo pre {company}` in `tasks` → lost handoff on paying-prospect funnel. Sibling `/api/demo/request` also created SaaS leads via cookie-less browser client and previously returned a **fake UUID** on insert error.

## Root cause

1. `createDemoBookingTask` used `getSupabaseClient()` (browser anon singleton, no request cookies).
2. Insert used `lead_id: null`. Policy `tasks_agency` requires `lead_id ∈ leads` for the caller’s agencies → WITH CHECK fails for anon/authenticated.
3. Failure was swallowed (`{ ok: false, mode: database_error }`) while `runDemoBookingAutomation` still returned `ok: true`.
4. `createSaasLead` on DB error returned a synthetic UUID instead of throwing (silent durable-row miss).

Same class as buyer-onboarding `#545`, different call site (`createDemoBookingTask` / sales funnel).

## Fix

- Pass `createServiceRoleClient()` into `createSaasLead` + `runDemoBookingAutomation` from both demo routes (mirror `/api/proof`).
- `createDemoBookingTask` defaults to service-role (required for orphan `lead_id: null` rows).
- `createSaasLead` throws on insert error (fail-closed).
- Route returns 500 if automation task insert fails after lead was saved.

## Validation

```bash
cd apps/crm
npx vitest run \
  src/lib/__tests__/demo-booking-store.test.ts \
  src/lib/__tests__/sales-funnel-create-saas-lead.test.ts \
  tests/verification/demo-booking-service-role.verification.test.ts
```

## Notes

1 PR = 1 logical fix. No migration. Does not merge itself.
