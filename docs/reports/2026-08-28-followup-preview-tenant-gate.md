# CRITICAL: Follow-up preview fail-open → cross-tenant lead PII

**Date:** 2026-08-28  
**Branch:** `cursor/critical-bug-management-b710`  
**Severity:** CRITICAL (security / cross-tenant PII)

## Trigger

1. Attacker (or any user) is authenticated in CRM.
2. Their `profiles.agency_id` is `null` / empty — e.g. invite path that omitted `agency_id` (still open as #447), incomplete onboarding, or missing profile row.
3. They open `/followup` (or `GET /api/followup`).
4. Server resolves agency via `resolveFollowupAgencyId(null)` → **DEMO / FOLLOWUP_AGENCY_ID** fallback.
5. `buildFollowupPreview` uses **service-role admin** and selects `name, email, phone, …` for that tenant.
6. Response returns drafts + lead PII for the reference/demo agency to a user who does not belong to it.

## Root cause

```ts
// preview.ts (before)
return profileAgencyId?.trim() || FOLLOWUP_AGENCY_ID;
```

Same fail-open class as HubSpot/analyze (#486): missing `agency_id` + admin client = cross-tenant data.

`GET /api/followup` is session-authenticated but **not** tenant-gated before the admin read.

## Why not already tracked

Open tracked set: #369 #370 #443 #444 #447 #459 #462 #481 #486 #490.  
#486 covers hubspot/sync + ai/call/analyze only — not follow-up preview.

## Fix (minimal)

- `resolveFollowupAgencyId` → `string | null`, **no** DEMO fallback.
- `GET /api/followup` → **403** when agency missing, before `buildFollowupPreview`.
- POST cron path unchanged (still intentionally scoped to `FOLLOWUP_AGENCY_ID` with Bearer).

## Verification

```text
npx vitest run \
  src/lib/agents/followup/__tests__/preview-agency.test.ts \
  tests/verification/followup-preview-tenant-gate.verification.test.ts
```

4/4 passed.

## Residual risk

- Invite without `agency_id` (#447) still produces broken tenants (403 on follow-up instead of leak) — merge #447 remains needed.
- POST `/api/followup` remains Smolko/DEMO-scoped by design for cron; not changed here.
