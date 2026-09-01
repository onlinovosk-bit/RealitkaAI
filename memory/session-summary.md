## Session 2026-09-01
### Dokončené
- Critical bug hunt: inbound-lead webhook silent lead drop + optional auth
- Report: `docs/reports/2026-09-01-inbound-lead-webhook-silent-drop.md`
### Rozpracované / Pending
- Founder review/merge inbound-lead fix PR
- Open critical fix PRs still awaiting review: #369 #370 #443 #444 #447 #459 #462 #481 #486 #490
### Kľúčové súbory zmenené
- `apps/crm/src/app/api/webhooks/inbound-lead/route.ts`: require secret + service-role
- `apps/crm/src/lib/inbound/process-lead.ts`: agency stamp, insert fail-closed, no fake BRI reply
### Ďalší krok
Founder merge inbound-lead PR; then oldest open criticals (#369/#370/#443/#444).
