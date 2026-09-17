# CRITICAL — Smolko owner profile takeover via domain email match

**Date:** 2026-08-29  
**Severity:** CRITICAL (authz / account takeover)  
**Status:** Fixed on branch `fix/smolko-owner-email-allowlist`

## Bug and impact

`isSmolkoOwnerEmail` treated **any** `*@realitysmolko.sk` address as a Smolko owner login. Combined with:

1. `smolkoProfileLookupEmails` injecting `rastislav.smolko@gmail.com` + `office@realitysmolko.sk` into email candidates for those logins
2. `pickPreferredProfile` preferring higher `entitlementRank` (owner beats agent)
3. `findSmolkoOwnerProfileViaServiceRole` falling back to `emailMatch ?? best` (arbitrary owner/founder row)

…a broker/agent (or any other `@realitysmolko.sk` auth user) resolved to the **owner** profile on login / `resolveProfileForAuthUser`.

### Concrete trigger

1. Agent profile exists: `broker@realitysmolko.sk`, `role=agent`, linked `auth_user_id`.
2. Owner profile exists: `rastislav.smolko@gmail.com` (or `office@`), `role=owner`. If `auth_user_id` is still null (documented ops case), login also **writes** the broker’s auth uid onto the owner row via `persistAuthUserIdLink`.
3. Broker signs in → app paths using `resolveProfileForAuthUser` / `linkProfileToAuthUser` treat them as owner (CEO Command, settings gates that use this resolver, etc.).

## Root cause

Over-broad domain check + fail-open “any owner row” fallback in the Smolko special-case path of `resolve-profile-for-auth.ts`.

## Fix

- Allowlist owner emails to exact set: `office@realitysmolko.sk`, `rastislav.smolko@gmail.com`.
- `findSmolkoOwnerProfileViaServiceRole` returns **only** an email match — never an arbitrary `best` owner.

## Validation

```text
npx vitest run \
  src/lib/profiles/__tests__/resolve-profile-for-auth.test.ts \
  src/lib/profiles/__tests__/resolve-profile-service-fallback.test.ts \
  src/lib/profiles/__tests__/link-profile-to-auth.test.ts
→ 3 files, 16 tests passed
```

New coverage: non-owner `@realitysmolko.sk` must not inject owner aliases, must not resolve to owner profile, must not link unbound owner `auth_user_id`.
