# Critical bug: notification-digest wiped customer unread

**Date:** 2026-09-05  
**Branch:** `fix/notification-digest-tenant-scope`  
**Source:** nightly critical-bug automation (post #535)

## Bug and impact

`runUnreadNotificationDigest` (#535 Strážca prítoku) selected **all** unread
`routine_notifications` with the admin client and set `read_at` after email.

**Trigger:** Daily cron `GET /api/cron/notification-digest` while any paying
agency has unread `seller_rescue` / `new_lead` / `deal_risk` / agency
`ceo_command` rows.

**Impact:**

1. Customer unread state permanently cleared without agent action (data loss).
2. Director morning brief (`seller_rescue` critical unread) silently loses URGENT.
3. Secondary: `sendViaResend` ignored Resend `{ error }` and still returned
   `ok: true`, so failed sends could also mark platform rows read.

## Root cause

Digest query/update omitted `.eq("agency_id", SYSTEM_USAGE_AGENCY_ID)`.
Heartbeat writes platform alerts to that tenant only; customer crons write to
tenant `agency_id`. No tenant filter → cross-tenant unread wipe.

Resend SDK does not throw on API failure; sibling senders already check
`result.error`.

## Fix

- Scope select + update to `SYSTEM_USAGE_AGENCY_ID`.
- Fail closed on `result.error` before `read_at` update.
- Unit + verification contracts lock both behaviors.

## Validation

```text
npx vitest run src/lib/infra/__tests__/notification-delivery.test.ts \
  src/app/api/cron/notification-digest/__tests__/route.test.ts \
  tests/verification/notification-digest.verification.test.ts
```
