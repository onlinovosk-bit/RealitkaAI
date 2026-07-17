# BO-outcome-first-workdesk — Livappy-style outcome UX

> Status: **IN PROGRESS** (GO 2026-07-17)
> Cieľ: predávať čas/istotu zárobku namiesto AI featur; 60s first audit; 1 CTA na dashboarde; short onboarding.

## Ústava

BUILD — timing OK, building blocks existujú (triage, stale, forecast, Action Queue).
Pasca: Feature Trap (nepridávať 6. priority panel).

## Scope (1 logická zmena)

1. Outcome copy kit (`lib/copy/outcome-copy.ts`)
2. `buildFirstAudit` + `GET /api/workdesk/first-audit` + `FirstAuditPanel`
3. Start-today hero (honest empty, 1 CTA `#today-focus`)
4. Dashboard KPI bez fake fallbackov; demote AIPriorityStrip / NextBestAction
5. Short onboarding path + `step-audit`
6. Marketing: odstrániť +34% / fake counter

## Verification

`tests/verification/first-audit.verification.test.ts`
