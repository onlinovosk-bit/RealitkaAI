# Critical bug: profile self-edits silently fail (RLS)

**Date:** 2026-09-14
**Severity:** HIGH — team admin UX broken; name/email/phone/team edits do not persist
**Branch:** `fix/profiles-patch-scoped-client`
**Source:** bug #4 in `docs/reports/2026-09-13-critical-bug-hunt.md`

## Trigger

An authenticated user sends `PATCH /api/profiles/{id}` changing `fullName`,
`email`, `phone` or `teamId` — anything that is *not* `role` or `isActive`.

## Root cause

The route authenticates with `createClient()` but then mutates through
`updateProfile(id, safePatch)`, which called `resolveTenantSupabase()` with no
argument → cookie-less browser singleton → `auth.uid()` is null →
`profiles_self_update` rejects the write. The user sees a 500 or a stale profile.

The asymmetry is what hid it: the owner-only `role` / `isActive` path already goes
through `createAdminClient()` and works, so role flips persisted while ordinary
contact edits did not. Same mechanism as the properties routes in #443.

## Fix

- `updateProfile(id, input, scoped?)` accepts a scoped client and forwards it to
  `resolveTenantSupabase(scoped)`.
- The route passes the `supabase` client it already created for authentication.
- The owner-only service-role path is untouched — role and `is_active` are frozen
  for authenticated JWT clients by a DB trigger and must keep using the admin
  client.

Deliberately **not** changed: `getProfileById(id)` in the cross-tenant gate stays
unscoped. It is already fail-closed (an unreadable profile yields `undefined`,
which fails the `agencyId` comparison and returns 403), and scoping it could turn
a legitimate same-agency patch into a 403 if the `profiles` select policy is
narrower than expected. That is a separate, verifiable change.

## Validation

```bash
cd apps/crm
npx vitest run \
  src/lib/__tests__/profiles-patch-scoped-client.test.ts \
  tests/verification/profiles-patch-scoped-client.verification.test.ts
```

Unit tests assert the scoped client reaches `resolveTenantSupabase`, that the
column mapping is unchanged, and that an RLS rejection throws rather than
reporting success.

## Not verified

- No production PATCH was executed; the RLS policy was not exercised against the
  live database. The `profiles_self_update` behaviour is taken from the policy
  definition and from the identical #443 mechanism, not from a measured run.

## Rollback

Revert the branch. No migration, no schema change.

Merge robí founder — agent nemerguje.
