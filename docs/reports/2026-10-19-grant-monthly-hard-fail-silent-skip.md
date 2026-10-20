# Grant monthly hard-fail swallowed as soft skip (2026-10-19)

## Bug

`grantMonthlyCreditsForAgency` mapped RPC/DB hard failures (`!result.ok`) to
`{ granted: 0, skipped: true }` **without** `error`. `runMonthlyCreditCycle`
treated that as a soft skip and returned `ok: true` → `/api/cron/credits-cycle`
responded **HTTP 200** → Vercel cron did **not** retry.

## Impact

On the 1st of the month, a transient failure in `apply_monthly_grant_credits`
(PostgREST timeout, connection reset, empty RPC payload) left a paying agency
with **0 monthly grant credits** until the next cycle (or manual repair).
Expire failures already failed the cycle; grant failures did not — asymmetry.

## Trigger scenario

1. Agency has `seats > 0`, pricing v2/v3 `subscription_status = active`, grant amount > 0.
2. Credits-cycle cron runs on day 1; expire phase succeeds (or soft-skips).
3. `apply_monthly_grant_credits` returns `ok: false` (e.g. RPC error).
4. Before fix: cycle `ok: true`, cron metric increments, no retry → no credits.
5. After fix: cycle `ok: false` / `grant_failed:N`, HTTP 500 → cron retries;
   ledger idempotency key makes retry safe.

## Fix

- `grantMonthlyCreditsForAgency` returns `error` on service unavailable and RPC hard fail (mirrors `expireGrantCreditsForAgency`).
- `runMonthlyCreditCycle` returns `ok: false` with `grant_failed:<n>` when any grant hard-fails.

## Validation

- `npx vitest run src/lib/__tests__/grant-engine.test.ts src/lib/credits/__tests__/monthly-cycle.test.ts`
