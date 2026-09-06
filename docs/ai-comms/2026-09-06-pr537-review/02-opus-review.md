---
role: opus
turn: 2
input_refs:
  - docs/ai-comms/2026-09-06-pr537-review/00-brief.md
  - docs/ai-comms/2026-09-06-pr537-review/01-sol-draft.md
output_type: review
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - docs/ai-comms/2026-09-06-pr537-review/01-sol-draft.md
  - gh pr view 537 --json number,title,headRefName,baseRefName,isDraft,mergeable,statusCheckRollup,url
  - gh pr diff 537 --patch
  - apps/crm/src/lib/usage-metrics.ts
verdict: RETURN
---

# Opus review — PR #537 notification-digest tenant-scope review

## Claim audit

### Claim: "The core diff direction is sound."

**Label:** FACT with caveat.  
**Evidence:** The patch adds `SYSTEM_USAGE_AGENCY_ID`, `.eq("agency_id", agencyId)`
on select, and `.eq("agency_id", agencyId)` on update.  
**Caveat:** This proves the branch filters on an agency id. It does not prove the
branch is merge-safe because GitHub reports `mergeable: CONFLICTING`.

### Claim: "Platform heartbeat writes notifications under `SYSTEM_USAGE_AGENCY_ID`."

**Label:** FACT for the inspected route.  
**Evidence:** `apps/crm/src/app/api/cron/heartbeat-check/route.ts` passes
`notifyAgencyId: SYSTEM_USAGE_AGENCY_ID`; `apps/crm/src/lib/infra/platform-heartbeat.ts`
inserts `agency_id: input.notifyAgencyId`.  
**Caveat:** This only covers the heartbeat cron path. Other platform/system
notification writers were not exhaustively audited.

### Claim: "Resend error handling prevents silent read-marking after failed send."

**Label:** FACT for single failure return path.  
**Evidence:** Patch checks `result.error` and returns `{ ok: false, reason }`;
the digest only marks read after `sendResult.ok`.  
**Caveat:** If there are multiple recipients, the code may send successfully to
earlier recipients, fail later, leave rows unread, and send duplicate digests to
the earlier recipients on retry. This is not a data-loss bug; it is an alert
duplication risk.

### Claim: "Required checks are green."

**Label:** FACT for the observed PR head.  
**Evidence:** GitHub PR metadata showed success for `Lint, test, build`, ratchet,
memory audit, Vercel contexts, and Snyk.  
**Caveat:** Checks are not sufficient for merge while the PR is conflicting.

## Findings

### RETURN-1: #537 is not currently merge-ready because it is conflicting

GitHub reports `mergeable: CONFLICTING`. This is not a soft concern; it blocks
safe founder merge review because the final code after conflict resolution may
not equal the reviewed patch.

**Required action:** Resolve conflicts on #537 and rerun required checks before
any merge-ready verdict.

### FLAG-1: `agencyId` option creates an escape hatch from the platform-only invariant

The PR says "Never touches customer-tenant unread rows," but the exported
function accepts `options.agencyId`. A future caller can pass a customer agency
id and still use the same digest/read-marking mechanism.

This does not prove current behavior is broken; it weakens the invariant exactly
where the bug was tenant isolation. A safer implementation would keep
`runUnreadNotificationDigest` platform-only and avoid a caller-supplied agency id,
or make the escape hatch private/test-only with explicit guardrails.

### FLAG-2: the review does not prove all platform notifications intended for digest are in the system tenant

The heartbeat cron path is proven. The patch and report mention platform
heartbeat writes, but this review did not exhaustively enumerate every
`routine_notifications` writer that might be meant for founder digest. If
another system alert is written under a customer agency, #537 would stop emailing
it in the digest. That may be correct, but it should be explicit.

### FLAG-3: multi-recipient partial send behavior remains at-least-once, not exactly-once

The Resend check fixes silent read loss on API error. It does not give
recipient-level delivery accounting. If founder emails contain multiple
recipients and recipient N fails after recipient 1 succeeds, rows remain unread
and recipient 1 may receive the same digest again on retry.

This is acceptable if the invariant is "preserve alerts over avoiding duplicate
emails." The PR/report should not imply exact delivery semantics.

## Opus verdict

**RETURN for merge readiness.** The code direction is plausible, but the PR is
conflicting and one code-shape choice (`agencyId` override) weakens the
tenant-isolation invariant.

Do not merge #537 until:

1. conflicts are resolved;
2. required CI is green on the resolved branch;
3. the author either removes `options.agencyId` or documents/tests why the
   override cannot be used against customer tenants.
