# Critical bug hunt — sales-funnel platform-admin gate

**Date:** 2026-09-16  
**Branch:** `cursor/critical-bug-hunt-20260916`

## Bug and impact

`POST /api/sales-funnel/update-status` only checked `auth.getUser()`. Combined with open `saas_leads` RLS (`owner_profile_id IS NULL` / `using (true)` — and `createSaasLead` never sets `owner_profile_id`), **any logged-in tenant agent** could flip Revolis platform SaaS demo-lead statuses (`won` / `lost` / …).

`/sales-funnel` had no platform-admin gate either, so the same users could view prospect PII (name, email, phone, company) via the dashboard.

**Trigger:** authenticate as any CRM tenant user → `POST /api/sales-funnel/update-status` with a known `saas_leads.id` → status mutates; or open `/sales-funnel`.

## Root cause

Platform sales pipeline treated like tenant CRM: session auth without `is_platform_admin`, while table policies allow broad update/select.

## Fix

- Gate `update-status` with `requirePlatformAdmin()` before any write.
- Gate `/sales-funnel` page with `fetchProfilePlatformAdminFlag` + `notFound()` for non-admins.
- Thread scoped `createClient()` into `getSalesFunnelData` / `listSaasLeads` (no cookie-less SSR list).

## Validation

- Unit: `src/app/api/sales-funnel/update-status/__tests__/route.test.ts` (401 / 403 / admin 200)
- Verification: `tests/verification/sales-funnel-platform-admin.verification.test.ts`

## Residual risk

RLS on `saas_leads` remains open at the DB layer — a client with the anon/authenticated key could still query/update directly. App gates close the product UI/API path; a follow-up migration should deny non-admin access at RLS.
