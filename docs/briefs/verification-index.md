# Verification index — BO → test mapovanie

Živá špecifikácia: `apps/crm/tests/verification/*.verification.test.ts`  
Dokumentácia: `apps/crm/tests/verification/README.md`

Pri písaní Build Orderu mapuj akceptačné kritériá na súbory nižšie.  
`rg "<kľúčové slovo>" apps/crm/tests/verification/` pred každou zmenou featury.

## Doménový index

| Doména / feature | Verification súbor | Playwright (ak existuje) |
|------------------|---------------------|--------------------------|
| Decision flags / gating | `decision-flags.verification.test.ts` | — |
| Forecast gating | `forecast-gating.verification.test.ts` | `smoke.spec.ts` (routes) |
| Morning brief cron | `morning-brief.verification.test.ts` | `smoke.spec.ts` (cron) |
| Follow-up sweep | `follow-up-sweep.verification.test.ts` | `smoke.spec.ts` (cron) |
| Dashboard insights cron | `dashboard-insights-cron.verification.test.ts` | `smoke.spec.ts` (cron) |
| Lead capture / forms | `lead-capture.verification.test.ts`, `lead-form-public.verification.test.ts` | — |
| Lead triage / scoring | `lead-triage-scoring.verification.test.ts`, `prospecting-scoring.verification.test.ts` | — |
| Lead scoped writes | `lead-scoped-writes.verification.test.ts` | — |
| Call analyzer | `call-analyzer.verification.test.ts` | `call-analyzer.spec.ts` |
| CEO command | `ceo-command.verification.test.ts`, `ceo-command-ui.verification.test.ts`, `ceo-command-routines-guard.verification.test.ts` | — |
| Team gating / visibility | `team-gating-manual-plan.verification.test.ts`, `team-visibility.verification.test.ts`, `tasks-team-scoped-writes.verification.test.ts` | `smoke.spec.ts` (team routes) |
| Matching recommendations | `matching-recommendations-scoped-writes.verification.test.ts` | — |
| Notifications | `notifications-store.verification.test.ts` | — |
| Demo ops | `demo-ops.verification.test.ts` | — |
| Arbitrage demo guard | `arbitrage-demo-guard.verification.test.ts` | — |
| Acquire email gateway | `acquire-email-gateway.verification.test.ts` | — |
| Seller rescue | `seller-rescue.verification.test.ts`, `seller-rescue-guard.verification.test.ts` | — |
| Revenue intelligence | `revenue-intelligence-guard.verification.test.ts` | — |
| Column detector (import) | `column-detector.verification.test.ts` | `universal-import-smoke.spec.ts` |
| Onboarding RLS | `onboarding-client-rls.verification.test.ts` | `onboarding-*.spec.ts` |
| Platform heartbeat | `platform-heartbeat.verification.test.ts` | — |
| Stealth recruiter (legal hold) | `stealth-recruiter.verification.test.ts` | `stealth-recruiter.smoke.spec.ts` |

## Playwright smoke projekty (CI gate)

| Projekt | Súbory | Čo chráni |
|---------|--------|-----------|
| `smoke` | `smoke.spec.ts`, `proof-funnel.spec.ts` | Cron auth, deprecated endpoints, core routes, /proof |
| `universal-import-smoke` | `universal-import-smoke.spec.ts` | `/import/universal` route |

CI: `.github/workflows/saas-grade-pipeline.yml` — `npm run test:smoke:ci` po `next start`.

Preview deploy: `.github/workflows/preview-playwright-smoke.yml` — `npm run test:smoke:preview` proti `realitka-ai` Vercel Preview URL.

## Príkazy

```bash
# Jedna verification špecifikácia
npx vitest run tests/verification/decision-flags.verification.test.ts

# Všetky verification
npx vitest run tests/verification/

# Playwright smoke (lokálne — dev server alebo PLAYWRIGHT_SKIP_WEBSERVER=1 + next start)
npm run test:smoke
```
