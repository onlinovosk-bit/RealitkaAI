# Sol<->Opus review: PR #537 notification-digest tenant scope

**Date:** 2026-09-06  
**Branch:** `cursor/sol-opus-pr537-review-dabc`  
**Reviewed PR:** #537 `fix(crm): scope notification-digest to platform agency (tenant unread wipe)`  
**Artifact:** `docs/ai-comms/2026-09-06-pr537-review/`

## Verdict

Manual Sol<->Opus protocol outcome: **PASS**.

PR #537 readiness outcome: **RETURN**.

No merge, PROD cron, secret change, external send, or runtime/provider automation
is authorized by this review.

## Evidence used

- `gh pr view 537 --json ...` reported #537 as draft and `mergeable: CONFLICTING`.
- `gh pr diff 537 --patch` showed:
  - `runUnreadNotificationDigest` adds agency filtering to the select and
    read-marking update;
  - `sendViaResend` checks Resend `result.error` before digest read-marking.
- `apps/crm/src/app/api/cron/heartbeat-check/route.ts` passes
  `SYSTEM_USAGE_AGENCY_ID` to `runPlatformHeartbeat`.
- `apps/crm/src/lib/infra/platform-heartbeat.ts` writes
  `routine_notifications.agency_id = input.notifyAgencyId`.

## Findings

1. **RETURN:** #537 is not merge-ready while GitHub reports
   `mergeable: CONFLICTING`; the conflict-resolved code has not been reviewed.
2. **FLAG:** `runUnreadNotificationDigest` accepts an `agencyId` override even
   though the intended invariant is platform-only digest. Remove/constrain it or
   add explicit guard/test coverage before merge-ready verdict.
3. **FLAG:** Resend handling preserves unread rows on send error, but does not
   provide recipient-level exactly-once delivery for multiple founder emails.

## Next gate

Allowed next step without PROD/merge permission: resolve/review #537 conflicts
and prepare a patch proposal or review comment for the `agencyId` escape hatch.

Merge #537 or run PROD digest/heartbeat cron remains **GO REQUIRED**.
