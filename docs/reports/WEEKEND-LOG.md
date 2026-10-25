# Víkendový denník

## 2026-10-16 ~16:55 UTC

### Hotové

- #865 `cursor/realvia-probe-retry-terminal-479b` — probe `{test:true}` je terminálny po `max_retries`. Report `docs/reports/2026-10-16-realvia-fail-rate-and-probe-retry.md`. Číslo 83,4 % je citát #864, v tomto behu **nezmerané** znova. **ZMERANÉ:** po `83ab55d1` boli Lint, test, build, Security review a Zmluva kódu SUCCESS. Squash merge 2026-10-16 16:59 UTC, merge commit `9a4c6d8d`.
- #866 `cursor/missing-prod-tables-rls-479b` — migrácia `event_store`, `outreach_log`, `team_member_permissions` + RLS. Label `needs-founder`. Na PROD sa neaplikovala. Schema-gap výnimky zmazané v `ba69e37e`, lebo CI hlásilo STALE_CAUSE_RESOLVED. **Nemergované.**
- #867 `cursor/stripe-go-checklist-479b` — `/upgrade` vypíše názvy chýbajúcich `STRIPE_PRICE_*`, seat/top-up 503 vracia tie názvy, checklist `docs/reports/STRIPE-GO.md`. Label `needs-founder`. Mení billing. **Nemergované.**
- #868 `cursor/followup-sweep-observe-479b` — menší follow-up sweep, zápis `cron_runs`, HTTP kód bez zmeny. **Nemergované.**
- #869 `cursor/saturday-lib-tests-479b` — testy grantu a `callOpenAI`. **Nemergované.**
- #870 `cursor/status-main-2026-10-16-479b` — STATUS bez prepočtu 51 %. **ZMERANÉ** 34 commitov na main od 2026-10-05 (`git rev-list --count`, HEAD `9168d583`).

### Beží

- CI na #866 (po zmazaní schema-gap výnimiek), #867, #868, #869, #870, #871. #865 je zmergované.

### Blokované

- Live Stripe verify a založenie cien — pozri `docs/reports/WEEKEND-BLOCKERS.md`.
- #845 — červené billing integračné testy, bez úpravy (zmena správania).

### Pravidlá tohto behu

Žiadna migrácia do PROD, žiadny DELETE/UPDATE, žiadny live Stripe kľúč, žiadny e-mail klientovi, žiadna zmena Vercel env.
