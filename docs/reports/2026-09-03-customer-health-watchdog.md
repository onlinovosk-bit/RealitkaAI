# L2 — Customer-health watchdog

**Branch:** `feat/customer-health-watchdog` · STOP (no merge)

## Krok 0
Existing crons insufficient: `guardian-run` = lead R1–R4 (night-wave: do not attach); `morning-brief` emails customers (forbidden); `heartbeat` = infra; `operator/health-score` = different signals. → **new** `lib/customer-health` + `/api/cron/customer-health`.

## Ship
Thresholds, evaluate (+ paying severity bump), scan (`auth_user_id` → `last_sign_in_at`), exclude via `isOperatorExcludedAgency`, persist `customer_health_daily`, cron `Bearer CRON_SECRET`, `morningLines` only when alerts.

## Founder after merge
1. Apply migration `20260903070000_customer_health_daily.sql` in Dashboard (no `db push`).
2. Add vercel cron: `{"path":"/api/cron/customer-health","schedule":"0 7 * * *"}`.
3. Smoke: Bearer CRON_SECRET → Smolko must be `red` (lead silence + never-logged-in).
