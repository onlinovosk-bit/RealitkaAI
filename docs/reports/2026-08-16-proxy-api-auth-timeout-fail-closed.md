# Proxy API auth timeout — fail-closed

**Date:** 2026-08-16  
**Branch:** `cursor/critical-bug-management-9f47`  
**Verdict:** Critical auth-gate hole from #429 fixed. API routes fail-closed on `getUser` timeout.

## Bug and impact

After #429, `src/proxy.ts` aborts Supabase `auth.getUser()` after 5s and **fail-opens** (returns `NextResponse.next()`).

**Trigger:** Supabase Auth is slow/hung (>5s) — the same condition that motivated the timeout.

**Impact:** Unauthenticated requests to session-gated `/api/*` routes proceeded past the proxy. Handlers that rely on this gate and use service-role / admin clients without a second `getUser()` (notably `/api/import/test-xml` when `IMPORT_TEST_API_KEY` is unset, `/api/neighborhood-watch/*`) became reachable without a session during Auth outages.

Dashboard pages still fail-open so SSR/layout can re-check auth and avoid hanging the edge.

## Root cause

Timeout catch path treated all routes the same:

```ts
if (isProxyAuthTimeoutError(err)) {
  console.error(PROXY_AUTH_TIMEOUT_MARKER, pathname);
  return response; // next() — including /api/*
}
```

## Fix

On auth timeout:

- `/api/*` → HTTP **401** `{ ok: false, error: "Unauthorized" }`
- Non-API (e.g. `/dashboard`) → unchanged fail-open for layout re-check

## Validation

```text
npx vitest run src/proxy-auth-timeout.test.ts tests/verification/proxy-session-gate.verification.test.ts
Test Files  2 passed (2)
Tests       7 passed (7)
```

## Out of scope

- Does not replace open fixes for ILIKE email (#427), credits races (#370/#374/#392), billing webhook (#371/#401), upgrade checkout (#369).
- Does not add `IMPORT_TEST_API_KEY` hard-require (separate hardening).
