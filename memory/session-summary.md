## Session 2026-09-05 (critical-bug automation)
### Dokončené
- Found #535 digest bug: unscoped routine_notifications mark-read wiped customer unread + ignored Resend errors
- Fix + tests + report → PR #537 `fix/notification-digest-tenant-scope`
- MEMORIES: removed #534 (merged); added #537
### Rozpracované / Pending
- Founder review/merge #537 (before next PROD digest cron)
- Older open critical fixes still awaiting review (#369–#495)
### Kľúčové súbory zmenené
- `apps/crm/src/lib/infra/notification-delivery.ts`: SYSTEM_USAGE_AGENCY_ID scope + Resend error check
- `docs/reports/2026-09-05-notification-digest-tenant-wipe.md`
### Ďalší krok
Founder GO: merge #537 before 07:15 UTC digest cron runs on PROD.
