# Critical: POST /api/team/users mint owner without owner gate

**Date:** 2026-11-01  
**Severity:** CRITICAL (privilege escalation)  
**Status:** Fixed on branch (PR pending)

## Bug and impact

`POST /api/team/users` accepted any authenticated session and any `role` string. Comment claimed agency enforcement, but code still fell back to `body.agencyId` when `callerProfile.agency_id` was missing. The UI even offers `owner` in the role dropdown.

**Concrete trigger**

1. Agent (or any logged-in user) `POST /api/team/users` with `{ email: attacker@…, role: "owner", … }`.
2. Unbound `profiles` row is inserted (`auth_user_id` null) in the tenant.
3. Attacker logs in with that email → dashboard/`linkProfileToAuthUser` attaches `auth_user_id`.
4. Attacker is now `owner` (settings, invites, billing surfaces keyed off role).

Sibling: `POST /api/team/teams` had the same `body.agencyId` fallback and no owner gate.

## Root cause

Team create routes never got the owner/founder + invitable-role gates that `/api/invite` already has. Misleading comment left the `body.agencyId` fallback in place.

## Fix

- Owner/founder gate; refuse missing `agency_id`.
- Stamp agency only from caller profile (ignore `body.agencyId`).
- Allowlist roles: owner / manager / agent (zod enum).
- Same owner + agency stamp on `POST /api/team/teams`.
- Unit + verification tests.

## Validation

- `npx vitest run src/app/api/team/users/__tests__/route.test.ts src/app/api/team/teams/__tests__/route.test.ts tests/verification/tasks-team-scoped-writes.verification.test.ts`
