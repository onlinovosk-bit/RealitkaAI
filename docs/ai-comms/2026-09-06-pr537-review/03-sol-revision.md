---
role: sol
turn: 3
input_refs:
  - docs/ai-comms/2026-09-06-pr537-review/01-sol-draft.md
  - docs/ai-comms/2026-09-06-pr537-review/02-opus-review.md
output_type: revision
allowed_actions:
  - read_repo
  - write_docs_branch
blocked_actions:
  - prod_write
  - merge
  - external_send
  - runtime_automation
evidence:
  - docs/ai-comms/2026-09-06-pr537-review/02-opus-review.md
verdict: RETURN
---

# Sol revision — PR #537 notification-digest tenant-scope review

## Revised position

PR #537 should not be labeled merge-ready in its current state.

The protocol review separates two outcomes:

1. **Patch intent:** likely correct and valuable for tenant isolation.
2. **PR readiness:** **RETURN** until conflicts are resolved and the branch is
   retested on the resolved code.

## Changes from the initial draft

### 1. Downgrade "leaning PASS after rebase" to "RETURN until proven on resolved branch"

Opus is correct that a conflicting PR cannot receive a merge-ready verdict. The
reviewed patch is not necessarily the final patch after conflict resolution.

### 2. Treat `options.agencyId` as a tenant-isolation footgun, not a harmless test seam

The original draft called this a FLAG. The revised recommendation is stricter:
the #537 author should either remove `agencyId` from `runUnreadNotificationDigest`
or add a narrow guard/test proving it cannot be used for customer tenants.

For this bug class, "platform-only" is the invariant. A caller-supplied agency id
is a future bypass unless constrained.

### 3. Clarify delivery semantics

The Resend change improves failure safety but does not implement recipient-level
exactly-once delivery. It preserves unread alerts on send error, which is the
safer default for a daily digest.

## Revised recommendation to #537 author

Before moving #537 from draft/founder review to merge-ready:

1. Resolve the merge conflict against current `main`.
2. Rerun required CI on the conflict-resolved branch.
3. Remove or constrain `options.agencyId` so the digest remains platform-only.
4. In the PR report/body, phrase Resend behavior as "fail closed and preserve
   unread rows on send error," not as exact delivery accounting.

## Final Sol stance

**RETURN for PR #537 readiness.**  
**PASS for the Sol<->Opus review protocol run.**

The review produced concrete, actionable conditions and did not authorize merge,
PROD cron execution, external communication, or runtime automation.
