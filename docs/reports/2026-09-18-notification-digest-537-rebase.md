# #537 — notification-digest tenant scope (rebase)

**Dátum:** 2026-09-18  
**PR:** https://github.com/onlinovosk-bit/RealitkaAI/pull/537  
**Branch:** `fix/notification-digest-tenant-scope`  
**Base:** `origin/main` @ `ed45d5188`

## Bug

`runUnreadNotificationDigest` vyberal unread len cez `.is("read_at", null)` bez `agency_id` → cross-tenant wipe customer unread. Resend error bol ignorovaný → `read_at` aj bez odoslaného mailu.

## Fix (na vetve)

- Select + mark-read: `.eq("agency_id", agencyId)` default `SYSTEM_USAGE_AGENCY_ID`
- Fail-closed: `if (!send.ok) → markedRead: 0`
- Unit + verification tests

## Rebase

- Rebase na main: conflict len `memory/session-summary.md` (docs commit) → **skipped** (fix commit zachovaný)
- Tip: `b71dbe6bb`

## Merge

GO REQUIRED — nerobím bez pokynu.
