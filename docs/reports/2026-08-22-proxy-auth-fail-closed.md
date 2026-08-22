# Proxy API auth timeout — fail-closed

**Date:** 2026-08-22  
**Branch:** `cursor/proxy-auth-fail-closed-db1f`  
**Verdict:** Replay of #438 onto current `main`. API routes fail-closed on `getUser` timeout; dashboard pages remain fail-open.

## Bug and impact

After #429, `src/proxy.ts` aborts Supabase `auth.getUser()` after 5s and **fail-opens** (returns `NextResponse.next()`).

**Trigger:** Supabase Auth slow/hung (>5s).

**Impact:** Unauthenticated requests to session-gated `/api/*` routes proceeded past the proxy. Handlers that rely on this gate and use service-role / admin clients without a second `getUser()` became reachable without a session during Auth outages.

Dashboard pages still fail-open so SSR/layout can re-check auth and avoid hanging the edge.

## Fix

On auth timeout:

- `/api/*` → HTTP **401** `{ ok: false, error: "Unauthorized" }`
- Non-API (e.g. `/dashboard`) → unchanged fail-open for layout re-check

## Validation

```text
npm test --prefix apps/crm -- src/proxy-auth-timeout.test.ts tests/verification/proxy-session-gate.verification.test.ts
Test Files  2 passed (2)
Tests       7 passed (7)
```

## Out of scope

Does not replace open fixes for ILIKE email (#427), credits races (#370/#374/#392), billing webhook (#371/#401), upgrade checkout (#369).
