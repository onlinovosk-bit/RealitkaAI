## Session 2026-08-15

### Dokoncene
- #415 STOP evidencia merged. #416 layout perf merged.
- Production T1/T2 po #416: /acquisition 4s/4s, /dashboard 6s/6s, /leads 4s/5s. Perfgate PASS.
- D-2026-08-15-03 Stage 0 PASS (docs addendum PR). #400 close without merge.

### Rozpracovane / Pending
- Founder merge tohto docs PR. Stage 1 nespustene (vlastne GO).

### Klucove subory zmenene
- docs/reports/2026-08-15-workdesk-layout-perf.md: production T1/T2
- docs/architecture/acquisition-os-stage0-PASS-report.md: PASS potvrdeny 15.8.2026
- memory/decisions.md: D-2026-08-15-03

### Dalsi krok
Founder merge docs PR. Stage 1 len na explicitne GO.

## Session 2026-08-15 (origin/main)

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
