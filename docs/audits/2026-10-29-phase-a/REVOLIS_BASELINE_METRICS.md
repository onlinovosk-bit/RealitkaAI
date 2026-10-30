# Baseline metrics — Phase A 2026-10-29

Window: **not established**. No metric below has a numerator, denominator, and window measured in this session unless marked VERIFIED.

Rule: missing = **UNKNOWN**, never 0. “What would verify” is the next read, not a plan to invent.

Funnel requested: **outbound → demo booked → demo done → trial → first payment**.

## Access this session

| Source | Access | Consequence |
|---|---|---|
| GitHub Actions / git | yes | engineering metrics only |
| `https://app.revolis.ai` unauthenticated HTTP | yes | healthz, 401 on checkout-config |
| Stripe MCP | no (`needsAuth`) | no customers, invoices, MRR |
| Supabase MCP | no (`needsAuth`) | no `agencies` / `demo_bookings` / `events` counts |
| Vercel MCP | no (`needsAuth`) | no env-name re-read |
| GA4 MCP | no (discovery error) | no sessions, demo_cta_click, purchase |
| GSC MCP | no (discovery error) | no queries/clicks |
| Authenticated CRM | no | no in-app funnel UI |

## Funnel table

| Stage | Definition (fixed before a number) | Current value | Window / denominator | Status | Evidence that would verify |
|---|---|---|---|---|---|
| **Outbound** | Count of **successfully sent** outreach emails (Resend accepted), excluding suppressions | UNKNOWN | UNKNOWN | UNKNOWN | Read-only: Resend dashboard sent count **or** `SELECT count(*) FROM outreach_logs` / send audit where status=`sent` for a declared window. Code fail-closes without `UNSUBSCRIBE_TOKEN_SECRET` (E-28) so the count may be structurally 0 — still do not write 0 without the query |
| **Demo booked** | Count of Calendly (or equivalent) events persisted | UNKNOWN | UNKNOWN | UNKNOWN | `SELECT count(*) FROM demo_bookings` on PROD for window; or Calendly dashboard. Writer: `POST /api/webhooks/calendly` (code exists; volume unread) |
| **Demo done** | Booked demos with completed/happened status | UNKNOWN | UNKNOWN | UNKNOWN | Same table’s status/column **after** confirming schema on PROD (`information_schema.columns`). Do not assume a `completed` column |
| **Trial** | Agencies with `created_via` self-serve and `trial_ends_at` in the future, or started in-window | UNKNOWN | UNKNOWN | UNKNOWN | `SELECT count(*) FROM agencies WHERE trial_ends_at IS NOT NULL` (+ window). Flag `SELF_SERVE_SIGNUP_ENABLED` default **off** in code (E-37) — Production value unread |
| **First payment** | Agencies that gained a Stripe `stripe_subscription_id` (or first paid invoice) in-window | UNKNOWN **today**. Historical 2026-10-20: **0** agencies with `stripe_subscription_id` (n=7 agencies) | Historical snapshot 2026-10-20, not a rate | PARTIALLY VERIFIED (historical SQL in `docs/reports/2026-10-20-stripe-krok-c-blokator.md`); **UNKNOWN now** | Stripe list subscriptions (live) **or** `SELECT count(*) FILTER (WHERE stripe_subscription_id IS NOT NULL) FROM agencies`. Do not reuse 0 without a new query |
| **Conversion outbound→booked** | booked / outbound | UNKNOWN | needs both counts, same window | UNKNOWN | Both queries above |
| **Conversion booked→done** | done / booked | UNKNOWN | same | UNKNOWN | same |
| **Conversion done→trial** | trial starts / demos done | UNKNOWN | same | UNKNOWN | same |
| **Conversion trial→paid** | first payments / trials | UNKNOWN | same | UNKNOWN | same |

## Related engineering facts (not funnel KPIs)

These are **not** substitutes for the table above.

| Fact | Value | Status |
|---|---|---|
| Vitest on `main` tip CI | 3815 passed, 6 todo; 517 files passed, 6 skipped | VERIFIED E-06 |
| Nightly Playwright smoke | 41 passed; chromium auth failed non-blocking | VERIFIED E-07 |
| Test files in repo (no node_modules) | 610 | VERIFIED E-33 |
| POST API routes | 132 | VERIFIED E-26 |
| Open PRs | 23 | VERIFIED E-03 |
| Production healthz | 200, no SHA | VERIFIED E-10 |
| Production checkout-config (anon) | 401 | VERIFIED E-11 |
| BUS governor ceilings | $0.50 / $5 / $25 (internal policy, not an invoice) | VERIFIED E-29 |
| CRM AI $ / week | UNKNOWN | E-30 |
| CI red rate | UNKNOWN now. Historical 8/30 (27%) on 2026-09-26 benchmark doc — not re-measured | UNKNOWN |
| Product “≈ 51 %” in `docs/STATUS.md` | Author estimate, last table recompute 2026-10-05, Predaj/platby row **0 %** by author | NOT a measured KPI; do not cite as audit score |

## Historical numbers that must not be copied forward as current

| Source | Number | Why it is not today’s baseline |
|---|---|---|
| `docs/reports/2026-10-20-stripe-krok-c-blokator.md` | 7 agencies, 0 `stripe_subscription_id`, 1 `active` via `manual_plan` | Nine days old; PROD not re-queried |
| Same | No `STRIPE_PRICE_V3_*` in Vercel Production names | Env may have changed; MCP Vercel down |
| `memory/session-summary.md` | “105 of 143 tables” anon write | Not reproducible from migrations this session |
| `docs/reports/2026-09-26-baseline-benchmark.md` | CI 549 s median, 27% red | Prompt-stack study, not SaaS funnel |
| `docs/STATUS.md` Predaj/platby 0 % | Weighted estimate, not a payment query | |

## Minimum readout to turn UNKNOWN → VERIFIED (read-only)

1. Authenticated `GET /api/billing/checkout-config` JSON (booleans + missing **names**).
2. Vercel Production env **names** containing `STRIPE_PRICE_` / `PRICING_V2_`.
3. Stripe live: count of active subscriptions and whether lookup `revolis_v3_licence_month` exists (no price ID pasted into git).
4. SQL (service-role, SELECT): agencies, `stripe_subscription_id`, `trial_ends_at`, `demo_bookings` counts for a named window.
5. Optional: GA4 `demo_cta_click` / `generate_lead` for the same window.

Until (1)–(4) exist, **do not** start a paid-acquisition experiment. EXP-B1 is a configuration experiment whose primary metric is first Stripe-backed `stripe_subscription_id`, not a conversion rate.
