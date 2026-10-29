# Prioritized backlog — Phase A 2026-10-29

Ranking: Constitution v2 (will a customer pay / retain) then existing open work then new scope. **Phase B is one experiment. It is not started.**

## Do first (founder GO)

### EXP-B1 — Unblock first Stripe-backed payment (configuration only)

- **Hypothesis (pre-registered):** On current `main` (`03f6c719`), Production cannot complete the **active** checkout path because required Stripe price env IDs are missing or invalid. After the founder creates the live price object required by **today’s** code, writes the env **name** that code already reads, and redeploys, authenticated `GET /api/billing/checkout-config` will show `checkoutAvailable=true` on that path, and one live Checkout + webhook will persist `agencies.stripe_subscription_id`.
- **Primary metric:** binary in a 7-day window after redeploy — **at least one** agency row with non-null `stripe_subscription_id` created by Stripe webhook (not `manual_plan`). Secondary (not success): `pricingV2.checkoutAvailable` or `seatCheckoutAvailable` true in checkout-config JSON.
- **Which env the code actually reads (do not mix with #913):**
  - If `PRICING_V2_ENABLED` is on: `STRIPE_PRICE_V3_SEAT_MONTHLY` (always). Yearly is optional for monthly sales.
  - If that flag is off: all three `STRIPE_PRICE_SOLO_SEAT`, `STRIPE_PRICE_TEAM_SEAT`, `STRIPE_PRICE_OFFICE_SEAT`.
  - Preflight must read the flag **and** missing-name arrays from checkout-config. Do not assume 2026-10-20’s “v3 missing” is still true (E-17).
- **Guardrails:** no application code change; **do not merge #913**; no RLS/DDL; no new product; no outbound to real prospects; no ad spend; webhook fulfill stays fail-closed (existing 500 on failed pricing fulfill).
- **Cost ceiling:** one live Checkout of the **smallest** listed monthly licence, then **immediate refund**. Founder sets the euro cap at GO (this audit does not invent a price).
- **Rollback:** unset the new env var, redeploy **or** Vercel rollback to previous deployment; archive/deactivate the new Stripe price. No DB reverse required if the test agency is the founder’s.
- **Success criteria (fixed now):** (a) checkout-config shows available; (b) one `checkout.session.completed` processed without 500; (c) `stripe_subscription_id` set; (d) refund issued; (e) no other agencies mutated (SELECT before/after counts).
- **Fail criteria:** 503/unavailable after env+redeploy; webhook 400/500; entitlements missing; any non-test agency changed → stop, rollback, do not “fix forward” with #913.
- **Gate:** **GO REQUIRED** (Stripe live write + Vercel Production env + redeploy). This agent must not start EXP-B1.

### Repair green-enough reliability PRs (not the experiment)

Merge is still founder-only. Order if GO “merguj”:

1. **#930** (match-read fail-closed) — draft, CI green, directly closes R-02.
2. **#881** (acquire tenant dedup) — CI green, closes R-03.
3. **#925 / #923 / #929** — CI green, billing/outreach/starter-pack fail-closed. One GO each, not a bundle, if still up to date with `main`.

Do **not** merge **#924** or **#843** while `Lint, test, build` is red (lint). Fix on those branches.

Do **not** merge **#913** as a substitute for EXP-B1.

## Do not start (this phase)

| Candidate | Why not now |
|---|---|
| New matching-wipe PR | #930 / #924 / #843 already exist |
| New payments-audit PR besides this one | #806 exists; this Phase A supersedes the snapshot |
| Merge #913 | Red CI; changes env contract mid-experiment |
| Ads / PMax / CRO (#842) | Funnel denominators UNKNOWN; checkout unproven (Constitution Q8 timing + R-04) |
| RLS sweep / anon-grant DDL | Grants UNKNOWN; needs read-only SQL then founder GO (`prod-migration`) |
| healthz SHA | Public API change; own GO; not revenue |
| Model router / `selectRoute` apply | `applied: false` by design; spend unmeasured (E-29, E-30) |
| Sentry | Observability, not paying customer |
| Gmail pull activation | Needs secrets + DPA/consent; parallel to EXP-B1, not instead of it, and **not** Phase B |
| Outbound email experiment | Fail-closed/legal; prompt forbids real prospects |

## Ranked list (after EXP-B1 result is documented)

| Rank | Item | Gate | Depends on |
|---|---|---|---|
| 1 | EXP-B1 result write-up (PASS/FAIL vs criteria above) | AUTO-SAFE docs | EXP-B1 executed by founder |
| 2 | Merge #930 if still green and up to date | founder `merguj 930` | — |
| 3 | Merge #881 if still green and up to date | founder `merguj 881` | — |
| 4 | Read-only PROD grant/RLS query (anon INSERT count) | founder GO for SELECT | Supabase access |
| 5 | Gmail pull secrets so the workflow is not false-green | founder secrets | DPA #813 if still required |
| 6 | Decide #913 (rebase/fix CI) **or** close it | founder | EXP-B1 env contract must stay stable |
| 7 | Funnel dashboard from real SQL+Stripe (no invented %) | GO if new UI | EXP-B1 + access |
| 8 | Close or rebase stale PRs (#192, #189, #186, #806, #799, …) | founder | — |

## Constitution check for EXP-B1 (not a numeric score)

1. Would a customer pay? **Yes — they cannot pay today if checkout is unavailable.** Veto Q1 does not apply.
2. Timing too early? **No.** This is the measured bottleneck class (config vs code), not a new feature.
3. Better ROI than another agent-hour of CRM features? **Yes**, given Predaj/platby is the unpaid path and 23 open PRs already cover reliability.
4. Max VALIDATE if “nobody would pay”? Does not apply; the product already bills in code.

## One next task (task-loop)

```
ĎALŠIA ÚLOHA: Founder GO on EXP-B1 preflight — paste authenticated checkout-config JSON (booleans + missing env names) and/or allow read-only Vercel+Stripe MCP.
PREČO TERAZ: Without that JSON, “missing V3 price” is nine days old and must not be acted on blindly.
BRÁNA: GO REQUIRED (secrets/env/Stripe live). Phase B does not start in this PR.
```
