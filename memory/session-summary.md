## Session 2026-08-17

### Dokončené
- Critical-bug audit: fixed acquire email dedup orphan (permanent inbound lead loss) — PR #439
- Report: `docs/reports/2026-08-17-acquire-email-dedup-orphan.md`
- Tests: acquire email route + verification 7/7 PASS

### Rozpracované / Pending
- Open critical-bug PRs awaiting review: #369, #370, #371, #374, #392, #401, #427, #438, #439
- Stage 1 acquisition — only on explicit founder GO

### Kľúčové súbory zmenené
- `apps/crm/src/app/api/acquire/email/route.ts`: release dedup claim on lead insert failure; check 23505
- `apps/crm/src/app/api/acquire/email/__tests__/route.test.ts`: compensate + race tests
- `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`: live-spec for compensate path

### Ďalší krok
Merge/review PR #439 (acquire email dedup) — highest new lead-loss fix; then triage oldest open critical PRs (#369+).
