# Billing impact A1/B2 + fix GO (2026-08-21)

## Verdict

Code bugs on `main` are confirmed. Founder GO: implement fixes **now** as two independent PRs; impact SQL is a **parallel remediation track**, not a merge gate.

## Confirmed mechanisms (main)

| Bug | Mechanism | Open stale PR |
|-----|-----------|---------------|
| Legacy webhook → free | `resolvePlanKeyFromStripePriceId`: missing/unknown price → `"free"` (was ~L626/L640) | #371 |
| Credits-cycle wipe | Expire DB error → soft `skipped`; cycle `ok:true`; retry expires current grant under previous-period key | #374 |

## Fix PRs (fresh from today's main — no rebase)

1. **#451** `cursor/fix-billing-legacy-unknown-tier-db1f` — unknown → no-op; seat map; skip pricing checkouts; `forceFree` only on delete.
2. **Credits expire** (this session) — `error` not silent skip; cycle `ok:false`; refuse expire when current-period grant exists.

Founder merges. No prod DB writes from these PRs.

## Impact SQL (founder-provided; read-only)

### A1 — agencies with free profiles while agency paid

| agency_id | seats | agency_tier | free_profiles | profiles_total |
|-----------|-------|-------------|---------------|----------------|
| `11111111-1111-1111-1111-111111111111` | 3 | market_vision | 12 | 13 |

Signal: one row. UUID looks like sandbox/fixture — **verify whether this is a real customer agency before remediating**. If real: restore profile tiers to match paid seat/agency, then apologize if customer-facing impact occurred.

### B2 — grant-then-expiry wipe pattern in ledger

**Success. No rows returned.**

No ledger evidence yet of the credits-cycle wipe pattern in prod. Still ship the code fix: absence of historical rows ≠ absence of future risk on the next 1st-of-month retry.

## Process note (DMARC / billing latency)

This week twice: DMARC waited ~7 days, billing ~15 days — diagnosed/fixed in open PRs but not merged/deployed. **Open PR ≠ done.** Customer still has the bug until merge + deploy.

Suggested morning report addition (7:00): **age of oldest open PR** (days since opened / last push). Optional Cursor follow-up if founder wants it automated.

## Remediation track (separate from code fix)

- [ ] Confirm A1 agency is/ isn't sandbox
- [ ] If real: restore `account_tier` / `ui_role` for free profiles under paid agency
- [ ] B2 empty → no credit top-up restore from this query; keep monitoring next cycle
- [ ] Customer apology only if real paid user was affected

## Close stale PRs after merge

After #451 + credits-expire PR merge: close #371 and #374 as superseded (do not rebase).
