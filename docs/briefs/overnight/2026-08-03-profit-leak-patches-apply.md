# Profit-leak patches — apply notes (2026-08-03)

Source bundle: `Downloads/revolisprofitleakfixes20260802/` (+ audit `20260802profitleakaudit.md`).
Full procedure: that folder’s `APPLY.md`.

## PRs opened / skipped

| Patch | Branch | Outcome |
|---|---|---|
| 01 stealth 410 | `fix/w1-stealth-recruiter-410` | **[#352](https://github.com/onlinovosk-bit/RealitkaAI/pull/352)** — outreach + scan + cron ingest → 410 |
| 02 credits-cycle | `fix/w1-credits-cron-merge` | **[#353](https://github.com/onlinovosk-bit/RealitkaAI/pull/353)** |
| 03 valuation_estimates | — | **SKIP** — already on main via #338 |
| 04 system usage agency | `fix/w2-system-usage-agency-guard` | Core via **#343**; residual guard **[#355](https://github.com/onlinovosk-bit/RealitkaAI/pull/355)** |
| 05 credit spend wiring | `feat/w2-credit-spend-wiring` | **[#354](https://github.com/onlinovosk-bit/RealitkaAI/pull/354)** (leadUnlock already #350) |

## Merge order (from APPLY.md)

1 → 2 → 3(skipped) → 4(#343 done / residual) → **5 only after #4 precondition**  
`#5` must not run with `SYSTEM_USAGE_AGENCY_ID` = Smolko. Satisfied by #343.

## Migrations — founder manual (do NOT auto-apply)

| Migration | Status |
|---|---|
| `20260731210000_valuation_estimates.sql` | Wave 1C — already applied on prod (per overnight status) |
| `20260802120000_valuation_estimates.sql` | Patch duplicate — **do not apply** (superseded by Wave 1C) |
| `20260731220000_system_usage_agency.sql` | Wave 3A — already applied |
| `20260802130000_system_usage_agency.sql` | Patch variant (3333… UUID) — **do not apply**; main uses `00000000…001` |

Diagnostic (read-only): `apps/crm/docs/ops/system-usage-agency-audit.sql`

## CREDITS_ENFORCEMENT

Default **off**. Flip to `enforce` only after measuring real spend + notifying Reality Smolko.
