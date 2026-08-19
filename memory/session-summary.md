## Session 2026-08-15
### Dokončené
- Critical-bug hunt: profile email ILIKE wildcards → auth takeover / lead dump
- Fix + unit/verification tests + report `docs/reports/2026-08-15-critical-email-ilike-auth.md`
### Rozpracované / Pending
- Merge guard PR after CI green
- Open tracked billing PRs (#369–#401) still need founder merge
### Kľúčové súbory zmenené
- apps/crm/src/lib/profiles/resolve-profile-for-auth.ts: exact email match when `_`/`%` present
- apps/crm/tests/verification/auth-email-ilike-wildcard.verification.test.ts: live contract
### Ďalší krok
Founder review/merge ILIKE auth guard PR; then continue critical-bug backlog or Stage 1 only on GO.
