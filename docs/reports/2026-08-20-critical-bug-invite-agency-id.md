# Critical bug hunt — 2026-08-20

## Bug and impact

`POST /api/invite` (Team → Invite form) created the invitee `profiles` row **without `agency_id`**.

**Trigger:** Agency owner invites a colleague from `/team` invite UI.

**Impact:** Invitee accepts the email, logs into CRM, and resolves a profile with `agency_id = null`. `listLeads` / inventory / tenant-scoped reads return empty forever — significant user-facing breakage of team onboarding (tenantless account).

## Root cause

Admin upsert after `inviteUserByEmail` only set `id`, `full_name`, `email`, `role`, `is_active`. Caller agency was never copied. Role from the JSON body was also unvalidated (`founder`/`owner` accepted).

## Fix

- Require caller `agency_id`; refuse invite without it.
- Upsert invitee with `agency_id` + `auth_user_id`.
- Allowlist roles to `agent` | `manager` | `admin`.

## Validation

```text
npx vitest run src/app/api/invite/__tests__/route.test.ts \
  tests/verification/invite-agency-id.verification.test.ts
```

## Out of scope / related open fixes

Does not replace open PRs #369/#370/#371/#374/#438/#439/#443/#444.
Grant-engine ledger-orphan after failed balance write is covered by open atomic RPC PR #370 — not duplicated here.
