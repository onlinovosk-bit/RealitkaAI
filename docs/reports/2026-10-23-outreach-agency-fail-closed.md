# Critical bug: outreach agency fallback bypasses suppression scope

**Date:** 2026-10-23  
**Severity:** HIGH (user-facing deliverability / GDPR — send after agency unsubscribe)  
**Introduced:** #910 (`feat(deliverability)`)  
**Status:** fixed on this branch

## Bug and impact

`sendApprovedOutreach` and `prepareOutreachDraft` used:

```ts
const agencyId = (await fetchLeadAgencyId(leadId)) ?? SYSTEM_USAGE_AGENCY_ID;
```

When `fetchLeadAgencyId` returned `null` (DB read error, missing lead, empty `agency_id`), suppression lookup and the signed List-Unsubscribe token used the platform system UUID (`00000000-…0001`), not the tenant.

**Concrete trigger**

1. Recipient unsubscribes via List-Unsubscribe → row in `email_suppressions` with `scope_key = <agency UUID>`.
2. Broker approves another outreach draft to the same address.
3. `fetchLeadAgencyId` returns `null` (transient leads read error, or lead row gone).
4. Suppression check runs with `scope_key ∈ {global, SYSTEM_USAGE}` → agency unsubscribe missed → email is sent.
5. New List-Unsubscribe token also binds to SYSTEM_USAGE → one-click unsubscribe writes the wrong scope.

Impact: emails continue after an agency-scoped unsubscribe; unsubscribe confirmation does not protect that agency.

## Root cause

Fail-open tenant substitution. EMAIL-SUPPRESSION-01 elsewhere is fail-closed (no service role / lookup error / missing HMAC secret → do not send). The agency id was the exception.

`fetchLeadAgencyId` also ignored PostgREST `error` and treated it like “no row”.

## Fix

- `sendApprovedOutreach`: no agency → `{ ok: false }` (do not send).
- `prepareOutreachDraft`: no agency → 503 (do not draft under system UUID).
- `fetchLeadAgencyId`: on query error log + return `null`; reject empty `agency_id`.

## Validation

- `npx vitest run src/lib/__tests__/outreach-contract.test.ts` (includes new fail-closed cases).

## Not filed this run (already tracked / Slack-only)

- Matching DELETE + 500-row list truncation wipe — known since 2026-08-25; overlaps open #843 / #883; report only.
- Open fix PRs still awaiting review: #911 #902 #843 #859 #877 #881 #883.
- Merged and removed from tracker: #916.
