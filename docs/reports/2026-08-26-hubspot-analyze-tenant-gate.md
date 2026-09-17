# Critical bug fix — HubSpot + call analyze admin IDOR (2026-08-26)

## Bug and impact

Authenticated users whose `profiles.agency_id` is null (orphan invite / incomplete
onboarding — still possible while invite `agency_id` stamp #447 is unmerged) could
bypass tenant checks on:

1. `POST /api/integrations/hubspot/sync` — admin `select *` on any lead, then push
   PII to HubSpot and update `hubspot_contact_id` via service role.
2. `POST /api/ai/call/analyze` with `persist_to_crm: true` — admin insert of
   activities/tasks onto any lead id.

Impact: cross-tenant PII exfiltration and cross-tenant CRM writes.

## Root cause

Both routes used fail-open tenant gates:

```ts
if (callerProfile?.agency_id && lead.agency_id !== callerProfile.agency_id) {
  return 403;
}
```

When `agency_id` is null/undefined, the condition short-circuits and the admin
path runs. Amplifies invite profiles that omit `agency_id` (#447).

## Trigger scenario

1. User authenticates with a profile where `agency_id IS NULL`.
2. Attacker knows (or enumerates) another tenant's lead UUID.
3. `POST /api/integrations/hubspot/sync` with `{ leadId }` → lead PII synced to
   configured HubSpot; or `POST /api/ai/call/analyze` with
   `{ transcript, lead_id, persist_to_crm: true }` → admin activity/task on that lead.

## Fix

Fail closed: require `callerProfile.agency_id` and exact match to the lead's
`agency_id` before any admin sync/persist. Missing lead (analyze) also 403.

## Validation

```text
npx vitest run \
  src/app/api/integrations/hubspot/sync/__tests__/route.test.ts \
  src/app/api/ai/call/analyze/__tests__/route.test.ts \
  tests/verification/hubspot-analyze-tenant-gate.verification.test.ts
```

## Skipped (still open / tracked)

- #369 upgrade checkout shape, #370 credit RMW, #443 properties scoped client,
  #444 matching wipe (docs), #447 invite agency_id, #459 onboarding MVP,
  #462 auth-email recovery, #481 empty checkout agencyId
- Deferred separately: cron `Bearer undefined` when `CRON_SECRET` unset;
  gmail-pull maxResults=25; seat grant result ignored after entitlements

## Next GO

`GO FIX-CRON-SECRET-FAIL-CLOSED` — handlers that compare Bearer without
`if (!cronSecret)` (do not bundle with this PR).
