# Critical bug hunt 2026-11-20 — expire_grant_credits current-period wipe

Head before fix: `origin/main` @ `0437f80d`.

## Bug

`expire_grant_credits` (SECURITY DEFINER RPC) zeroes `grant_credits_balance` after
`FOR UPDATE` but only checks the **expiry** idempotency key. The TypeScript
pre-check in `expireGrantCreditsForAgency` looks for
`grant:<agency>:<currentYYYYMM>` in a separate unlocked SELECT, then calls the RPC.

### Concrete trigger

1. Agency has leftover grant credits from the previous month (`grant_credits_balance > 0`).
2. Month-boundary `credits-cycle` (or manual `/api/cron/credits-expire`) starts expire
   for that agency; TS sees no current-period monthly grant ledger row.
3. Concurrent path applies the current-period monthly grant:
   - Stripe seat checkout → `triggerInitialGrantAfterSeatCheckout`
   - overlapping `credits-grant` / second cycle retry
4. RPC runs, finds no expiry ledger row, zeroes **entire** grant pool (old leftovers
   **and** the new monthly grant), writes `grant_expiry` for the previous period.
5. Current-period `grant:<agency>:<YYYYMM>` already exists → idempotent retry cannot
   restore the wiped monthly grant until the next month.

Impact: silent loss of paid/entitled monthly credits (customer-facing breakage).

Distinct from open #859 (repair path absolute `credits_balance` overwrite from a
stale purchased snapshot). This bug is the unlocked current-grant check vs RPC.

## Root cause

Atomic RPC migration `20260804230000` never ported the TS refuse-guard into SQL.
A later SQL restore was lost when #370 was reverted. JS guard alone is not atomic
with the zeroing write.

## Fix

Migration `20261120230000_expire_grant_refuse_after_current_grant.sql`:
after agency `FOR UPDATE`, if expiring a **previous** period and ledger already has
`grant:<agency_id>:<currentUTCYYYYMM>`, return
`{ ok: true, skipped: true, reason: "current_period_grant_applied" }` without
mutating balances.

Verification + unit tests updated to lock the migration contract and the RPC skip
path.

## Validation

- `npx vitest run src/lib/__tests__/grant-engine.test.ts tests/verification/billing-credits.verification.test.ts`
  (run from `apps/crm` — see agent log).
- PROD apply of the migration requires founder GO (`prod-migration` skill); PR only
  lands the forward migration in-repo.

## Scan notes (no new PR)

- All previously tracked critical-bug PRs (#953…#843 etc.) still **OPEN** — not re-filed.
- Control Tower / subscription-capacity (#955/#957): platform-admin gated writes; CRM
  does not call `createModelGateway().complete()` yet (JSONL spend race remains
  latent until paid gateway wiring).
- `createAdminClient()` anon-key fallback remains a known footgun (ADAF note); not
  newly introduced this week and not fixed here.
