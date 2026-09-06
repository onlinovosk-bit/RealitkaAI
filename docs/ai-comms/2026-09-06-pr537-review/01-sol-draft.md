---
role: sol
turn: 1
input_refs:
  - docs/ai-comms/2026-09-06-pr537-review/00-brief.md
  - https://github.com/onlinovosk-bit/RealitkaAI/pull/537
output_type: draft
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - gh pr view 537 --json number,title,body,headRefName,baseRefName,isDraft,mergeable,files,commits,statusCheckRollup,url
  - gh pr diff 537 --patch
  - apps/crm/src/app/api/cron/heartbeat-check/route.ts
  - apps/crm/src/lib/infra/platform-heartbeat.ts
verdict: FLAG
---

# Sol draft — PR #537 notification-digest tenant-scope review

## Proposal

PR #537 should proceed only after merge conflicts are resolved and required CI is
rerun on the rebased branch. The core diff direction is sound: it scopes
notification digest reads and read-marking to the platform tenant and stops
marking notifications as read when Resend returns `{ error }`.

## Evidence

1. GitHub PR metadata for #537 reports:
   - title: `fix(crm): scope notification-digest to platform agency (tenant unread wipe)`;
   - head: `fix/notification-digest-tenant-scope`;
   - base: `main`;
   - draft: `true`;
   - mergeable: `CONFLICTING`;
   - required checks observed as successful for `Lint, test, build`,
     `Zmluva kódu (ratchet)`, `Memory Engine checks and advisory audit`,
     Vercel preview contexts, and Snyk.
2. The patch for `apps/crm/src/lib/infra/notification-delivery.ts` imports
   `SYSTEM_USAGE_AGENCY_ID`, defines `const agencyId = options?.agencyId ?? SYSTEM_USAGE_AGENCY_ID`,
   filters the select with `.eq("agency_id", agencyId)`, and filters the
   read-marking update with `.eq("agency_id", agencyId)`.
3. The patch changes `sendViaResend` from ignoring the returned value to checking
   `result.error` and returning `{ ok: false, reason }` before the digest can mark
   rows read.
4. Existing repo code supports the platform-tenant premise:
   - `apps/crm/src/app/api/cron/heartbeat-check/route.ts` calls
     `runPlatformHeartbeat({ notifyAgencyId: SYSTEM_USAGE_AGENCY_ID, agencyScope: null, notify: true })`.
   - `apps/crm/src/lib/infra/platform-heartbeat.ts` inserts
     `routine_notifications` with `agency_id: input.notifyAgencyId`.
5. The PR patch adds unit coverage asserting the select/update agency filter and
   no read-marking on Resend error.

## Assumptions and UNKNOWNs

- UNKNOWN: the exact merge conflict contents are not visible from PR metadata
  alone. They must be resolved on the PR branch before any merge decision.
- UNKNOWN: production has not been smoked here after the fix; no PROD cron was
  run as part of this review.
- Assumption: daily digest is intended only for platform heartbeat/system
  notifications, not customer tenant notifications. The route comment and PR
  report say this, and the heartbeat route supports it.

## Initial risk assessment

### PASS — core tenant-scope fix direction

The diff addresses the reported cross-tenant unread wipe by filtering both the
read query and read update on the same agency id. Based on current evidence, the
platform heartbeat writes notifications under `SYSTEM_USAGE_AGENCY_ID`, so the
digest will still pick up platform alerts while avoiding customer tenant rows.

### PASS — Resend error handling direction

The diff checks Resend's `{ error }` result before returning success. This
prevents silent read-marking after a failed send response.

### FLAG — exported `agencyId` override weakens the platform-only invariant

`runUnreadNotificationDigest` now accepts `options?: { limit?: number; agencyId?: string }`.
The implementation defaults to `SYSTEM_USAGE_AGENCY_ID`, but a future internal
caller could pass a customer tenant id and use this platform-only function for a
customer digest. That is not an immediate bug in the observed callers, but it is
the only code-level footgun found in the patch.

### STOP for merge now — PR is conflicting

GitHub metadata reports `mergeable: CONFLICTING`. Even with green checks on the
current head, branch protection requires the branch to be up to date before merge.
The branch needs conflict resolution and then fresh CI.

## Sol recommendation

Verdict for the patch logic: **FLAG, leaning PASS after rebase**.

Required before founder merge review:

1. Resolve PR #537 merge conflicts against current `main`.
2. Rerun required CI after conflict resolution.
3. Consider removing the public `agencyId` option unless there is a concrete
   non-customer, non-prod reason for it. If retained, document that it is a test
   seam and must never target a customer tenant.
