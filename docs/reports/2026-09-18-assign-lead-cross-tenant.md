# Critical bug: cross-tenant lead assignment via forged profileId

**Date:** 2026-09-18  
**Branch:** `cursor/critical-bug-assign-lead-agency`  
**Severity:** HIGH — tenant isolation / PII leak path

## Bug and impact

`POST /api/team/assign-lead` accepted any `profileId` UUID and wrote it to
`leads.assigned_profile_id` without verifying the target agent belongs to the
caller's agency.

**Trigger:** Authenticated broker in agency A calls assign-lead with a valid
lead from A and a `profileId` belonging to agency B (or any UUID).

**Impact:**
1. Lead row is stamped with a foreign `assigned_profile_id`.
2. Downstream paths that notify by profile id (e.g. `notifyHotLead` on status
   → Horúci) can push the lead name to an agent in another tenant — PII leak.
3. Prior code returned `{ ok: true }` when no Supabase client was available —
   silent fake success.

## Root cause

`assignLeadToProfile` updated `leads` by `id` only and resolved the display
name via unscoped `listProfiles()` (cookie-less browser singleton on the
server → empty list → fallback label). No same-agency check on the target
profile.

## Fix

- Resolve caller `agency_id` (fail-closed if missing).
- Select target profile with `.eq("id", profileId).eq("agency_id", agencyId)`.
- Update lead with `.eq("id", leadId).eq("agency_id", agencyId)` and require a
  returned row.
- Throw when Supabase client is missing (no fake `{ ok: true }`).

## Validation

```bash
cd apps/crm
npx vitest run \
  src/lib/__tests__/assign-lead-same-agency.test.ts \
  tests/verification/assign-lead-same-agency.verification.test.ts \
  tests/verification/tasks-team-scoped-writes.verification.test.ts
# → 10 passed
```

## Out of scope

- `POST /api/team/users` INSERT RLS gap (still needs founder GO for policy).
- Matching recalculate wipe (#444 open).
- HubSpot/analyze fail-open (#486 open).
