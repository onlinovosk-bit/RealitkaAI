# Topbar search — Hľadať button

**Date:** 2026-08-23  
**Branch:** `fix/topbar-search`  
**Founder input:** `patch-hladat-tlacidlo.patch`

## Change

Workdesk topbar search was `readOnly` (visual only). It is now a `<form role="search">` that navigates to `/leads?q=…` and lead filters hydrate from that query.

## Files

- `apps/crm/src/components/layout/WorkdeskTopbar.tsx` — editable input + Hľadať submit
- `apps/crm/src/components/leads/lead-filters.tsx` — `q` from `?q=`, sync on URL change, clear/hot filter drops `q`
- verification + RTL tests

## Beyond the patch

URL sync + dropping `q` on clear/hot filter, so search works when already on `/leads` and “Vymazať filtre” does not snap back to the old query.

## Verification

- `npx vitest run tests/verification/workdesk-topbar-search.verification.test.ts src/components/layout/__tests__/WorkdeskTopbar.search.test.tsx`
