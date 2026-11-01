# CRITICAL: acquire_dedup_keys wiped cross-tenant inbound leads

**Date:** 2026-10-17  
**Severity:** CRITICAL (silent lead loss across tenants)  
**Status:** fix on branch `cursor/critical-bug-management-4032`

## Bug and impact

`POST /api/acquire/email` deduped portal/web inquiries on a **global** `key`
(hash of listing + contact + calendar day). Table `acquire_dedup_keys` stored
`agency_id` but the primary key was only `key`.

**Trigger:** Agency A receives a portal inquiry (listing X, contact C, day D) and
claims the dedup key. Agency B later receives the same content (shared portal
syndication, identical web-form title + buyer, or CC’d notification). B’s SELECT
sees A’s key → `duplicate` → `lead_created: false` forever. Deterministic lead
UUIDs were also global, so even a claim bypass would collide on `leads.id`.

## Root cause

1. `dedupKey()` hashes content without tenant.
2. SELECT/INSERT uniqueness were global (`key` PK).
3. Claim release on lead-insert failure deleted by `key` alone (could drop
   another tenant’s claim once uniqueness became composite).
4. `deterministicLeadId(key)` omitted `agencyId`.

## Fix

- Migration `20261017230000_acquire_dedup_keys_tenant_pk.sql`: PK `(agency_id, key)`.
- Route: SELECT / DELETE scoped by `agency_id`; lead id =
  `acquire-email-lead:${agencyId}:${key}`; LEAD_ALREADY_EXISTS load filters
  `agency_id`.

## Validation

- Unit: `src/app/api/acquire/email/__tests__/route.test.ts` — new cross-tenant
  case + existing release/retry cases.
- Verification: `tests/verification/acquire-email-gateway.verification.test.ts`
  — tenant scope + agency-scoped release/load.

## Remains risky

- Migration must be applied on PROD before/with deploy (forward-only).
- Pre-existing rows keep old lead UUIDs; new leads after deploy use
  agency-scoped ids (same-agency retries still hit the old claim row).
