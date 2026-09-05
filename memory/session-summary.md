## Session 2026-09-05 (Strážca prítoku)
### Dokončené
- Founder GO „Strážca GO.“ → Brief 18 V2 notification delivery na `feat/b18-notification-delivery`
- Realvia 48h warning / 7d critical; odstránená väzba na inboundMailboxCount
- Cron `/api/cron/notification-digest` + critical e-mail na FOUNDER_EMAILS
- Report: `docs/reports/2026-09-05-strazca-pritoku.md`
### Rozpracované / Pending
- Merge PR (founder) + PROD smoke digest + FOUNDER_EMAILS/RESEND na Production
- G1 správa referenčnému klientovi (webhook živý vs ticho)
- Neaplikovať onboarding DROP z #534 bez samostatného GO
### Kľúčové súbory zmenené
- `apps/crm/src/lib/infra/platform-heartbeat.ts`: Realvia prahy + critical email hook
- `apps/crm/src/lib/infra/notification-delivery.ts`: digest + critical mail
- `apps/crm/src/app/api/cron/notification-digest/route.ts`: cron endpoint
- `apps/crm/vercel.json`: schedule `15 7 * * *`
- `docs/prompts/task-strazca-pritoku.md`: kanonický brief z B18 V2
### Ďalší krok
Founder: review/merge PR Strážca prítoku; potom PROD smoke digest (unread ↓).
