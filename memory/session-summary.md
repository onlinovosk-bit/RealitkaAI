## Session 2026-08-16

### Dokončené
- Critical-bug audit: #429 proxy auth timeout fail-open on `/api/*` → fail-closed 401
- PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/438
- Report: `docs/reports/2026-08-16-proxy-api-auth-timeout-fail-closed.md`

### Rozpracované / Pending
- Open tracked bugfix PRs still awaiting review: #369 #370 #371 #374 #392 #401 #427 #438
- Stage 1 / merge gates unchanged (founder GO)

### Kľúčové súbory zmenené
- `apps/crm/src/proxy.ts`: API routes 401 on getUser timeout
- `apps/crm/src/proxy-auth-timeout.test.ts` + verification: lock API fail-closed

### Ďalší krok
Founder review/merge #438 (and backlog of open critical fixes starting with #427 ILIKE).
