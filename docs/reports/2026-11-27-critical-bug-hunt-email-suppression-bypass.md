# Critical bug hunt — email deliverability / unsubscribe / suppressions (2026-11-27)

**Head checked:** `origin/main` @ `0437f80d`  
**Branch:** `cursor/fix-email-suppression-bypass-non-outreach`  
**Scope:** feature #910 surface — `outreach-store`, `email_suppressions`, List-Unsubscribe, Resend bounce webhook, approve-send paths.

## Skipped (already tracked)

| Item | PR |
|------|-----|
| outreach `fetchLeadAgencyId` null → `SYSTEM_USAGE_AGENCY_ID` wrong suppression/unsub scope | #923 (open) |

## NEW CRITICAL

### Non-outreach prospect sends bypass `email_suppressions` and List-Unsubscribe

| | |
|--|--|
| **Severity** | CRITICAL — silent loss of unsubscribe/suppression (spam/legal + deliverability) |
| **Location** | `apps/crm/src/lib/inbound/approve-draft.ts` (~211): only `OUTREACH_AGENT_ID` uses `sendApprovedOutreach`; follow-up / dead-lead / inbound drafts call `sendMessage` → `multi-channel-sender.sendEmail`. Same hole: `ghostwriter/send-email`, `playbook/confirm-viewing`. |
| **Root cause** | EMAIL-SUPPRESSION-01 (`checkSuppression` + HMAC List-Unsubscribe) was wired only into `sendApprovedOutreach`. The shared approve path and other Resend senders on `OUTREACH_FROM_EMAIL` never consulted `email_suppressions` and never attached RFC 8058 headers. |
| **Concrete trigger** | 1) Prospect hard-bounces or clicks List-Unsubscribe on an outreach mail → row in `email_suppressions` (global or agency). 2) Broker approves a follow-up-sweep / dead-lead / inbound draft for the same address (or sends ghostwriter / confirm-viewing email). 3) `sendMessage` / ghostwriter hits Resend with no suppression check. |
| **Impact** | Emails continue after unsubscribe (GDPR Art. 21 / spam complaint risk) and after hard bounce (shared domain reputation). Suppression writes from `#910` webhook/unsubscribe are silently ineffective for most prospect send paths. |
| **Key refs** | `approve-draft.ts:211`, `multi-channel-sender.ts` (pre-fix `sendEmail`), `ghostwriter/send-email/route.ts`, `outreach-store.ts` `sendApprovedOutreach` (the only gated path), `resend-webhook/route.ts` (global write assumed honored). |

**Fix in this PR:** shared `guardProspectEmailSend` (`lib/email/prospect-send-guard.ts`); wired into `multi-channel-sender.sendEmail`, `sendApprovedOutreach`, and `ghostwriter/send-email`. Fail-closed on missing agency, service role, suppression hit, or missing `UNSUBSCRIBE_TOKEN_SECRET`.

## Cleared at CRITICAL bar (this pass)

- `/api/unsubscribe`: HMAC verify, GET no write, POST upsert agency-scoped; 503 without service role.
- `/api/resend-webhook`: secret required (503), Standard Webhooks verify; Permanent bounce / complaint / suppressed → global upsert; write failure → 500 (retry).
- `sendApprovedOutreach` itself: suppression + List-Unsubscribe present (agency null → #923 only).
- Legacy `/api/notifications/unsubscribe`: redirect-only (no mute-by-UUID).
- Proxy: `/api/unsubscribe` + `/api/resend-webhook` on `PUBLIC_PATHS` with handler-side auth.

## Non-critical notes (not filed)

- Inbound *auto*-response (`sendInboundAutoResponse`) still has no suppression check (transactional ack; same judgment as 2026-11-03 hunt).
- Acquire `eventKind: unsubscribe` classifies portal mails but does not write `email_suppressions` (portal footer false-positive risk; out of #910 send path).
- Morning-brief unsubscribe updates `enabled` without checking `count`; no row → success HTML with no durable change (internal brief, not prospect marketing).

## Evidence

- Unit: `src/lib/email/__tests__/prospect-send-guard.test.ts`
- Unit: `src/lib/__tests__/multi-channel-sender-suppression.test.ts`
- Regression: `outreach-contract`, ghostwriter ownership + WP-2 send-gate (41 tests green locally)
