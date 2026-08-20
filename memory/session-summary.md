## Session 2026-08-20
### Dokončené
- Critical-bug hunt: POST /api/invite omitted agency_id on invitee profile
- Fix + unit/verification tests + report `docs/reports/2026-08-20-critical-bug-invite-agency-id.md`
### Rozpracované / Pending
- Open tracked critical PRs still awaiting founder merge (#369–#374, #438–#444)
- Grant-engine ledger-orphan after failed balance write → covered by open #370 (atomic RPCs); not duplicated
### Kľúčové súbory zmenené
- apps/crm/src/app/api/invite/route.ts: stamp agency_id + auth_user_id; role allowlist
- apps/crm/src/app/api/invite/__tests__/route.test.ts: invite tenant contract
- apps/crm/tests/verification/invite-agency-id.verification.test.ts: live spec
### Ďalší krok
Founder review/merge invite agency_id PR; then continue critical-bug backlog or merge oldest open money/auth PRs on GO.
