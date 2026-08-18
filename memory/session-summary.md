## Session 2026-08-18

### Dokončené
- Kontrolor review PR #439: found remaining unknown-commit retry duplicate risk.
- Follow-up branch `cursor/acquire-email-idempotency-dabc`: deterministic `leads.id` from acquire dedup key.
- Report: `docs/reports/2026-08-18-acquire-email-idempotency-followup.md`

### Rozpracované / Pending
- Verify/push/open PR for `cursor/acquire-email-idempotency-dabc`.
- Open critical-bug PRs awaiting review: #369, #370, #371, #374, #392, #401, #427, #438, #439
- Stage 1 acquisition — only on explicit founder GO

### Kľúčové súbory zmenené
- `apps/crm/src/app/api/acquire/email/route.ts`: deterministic lead id + existing-lead response on primary-key retry.
- `apps/crm/src/app/api/acquire/email/__tests__/route.test.ts`: unknown commit retry test.
- `apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`: live-spec for deterministic idempotency.

### Ďalší krok
Run targeted tests, push branch, open draft PR. Do not merge #439 without idempotency follow-up.
