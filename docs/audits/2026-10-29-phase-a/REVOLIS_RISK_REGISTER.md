# Risk register — Phase A 2026-10-29

Code at `03f6c719`. Likelihood/severity are qualitative (High/Medium/Low) from evidence IDs, not numeric scores. “Owner” is who can close it; this agent does not.

| ID | Risk | Evidence | Likelihood | Severity | Owner | Mitigation already in repo / open PR | Residual | Phase |
|---|---|---|---|---|---|---|---|---|
| R-01 | No new self-serve paying customer because Stripe price env IDs for the **active** checkout path are missing or the wrong generation (`V2` vs `V3` vs seat) | E-11, E-15, E-16, E-17, E-18 | High if 2026-10-20 Vercel names still hold; **UNKNOWN today** | High (revenue) | Founder (Stripe live + Vercel env + redeploy) | Code fail-closed (`checkoutAvailable` / 503). Checklist `docs/reports/2026-10-15-checkout-env-01-founder-checklist.md`. **Do not merge #913 into this** | Cannot prove checkoutAvailable without a session JSON | **EXP-B1** (recommended, not started) |
| R-02 | `ai_recommendations` wiped when `lead_property_matches` read errors | E-20 | Medium (depends on how often the read errors) | High (tenant data) | Engineering on #930 | Partial LIST_MAX/empty-list guard already on `main`. Draft **#930** fail-closes match-read | Until #930 is on `main` and in PROD, wipe path remains | Reliability PR, not Phase B |
| R-03 | Two agencies sharing listing+contact+time collide on acquire dedup; one lead dropped | E-21 | Low–medium (needs overlapping inbound) | High (cross-tenant / lost lead) | Engineering on #881 | Open **#881** (CI green on head) | On `main` until merged | Reliability PR |
| R-04 | Decisions about ads, copy, or pricing tests without a measured funnel | E-13, E-36 | Certain (no numbers this session) | High (wasted spend) | Founder + audit | Internal `demo_bookings` / `agencies` exist; GA4 MCP down | Any conversion % in chat would be fiction | Measure after EXP-B1 or with read access |
| R-05 | Operators treat skipped jobs as healthy (Gmail pull `success` on skip; Preview smoke `skipped`) | E-08, E-09 | High (jobs run often) | Medium (missed inbound) | Founder (secrets) / CI design | Workflow documents skip; GitHub still paints green | Gmail labeled mail is not imported | Ops; not ads |
| R-06 | Tables without RLS (`credit_redemption_codes`, `demo_prefill_links`) readable/writable if grants exist | E-22, E-24 | UNKNOWN (grants unread) | High if `anon` can SELECT codes | Founder GO for DDL | Unique indexes on codes; app uses service role for starter-pack | Do not guess grant count “105/143” | After EXP-B1, read-only SQL then one RLS PR |
| R-07 | Service-role public routes (inbound, onboarding, webhooks) skip RLS | E-24, E-25, E-26 | Certain (by design) | High if a route forgets token/rate-limit | Engineering | Proxy allowlist + per-route secrets; inbound rate limit 10/min on one path | 132 POSTs not fully reviewed | Sample-harden; no sweep PR now |
| R-08 | Dual pricing stacks + open #913 (red CI) make the wrong env vars look “done” | E-15, E-16, E-34 | Medium | High (false “checkout fixed”) | Founder | `checkout-config` returns **names** of missing keys | EXP-B1 must use `main` contract, ignore #913 keys until that PR is green and GO | EXP-B1 preflight |
| R-09 | Stripe retries duplicate non-ledger side effects (activities) | E-27, E-19 | Medium | Medium (noisy CRM, not double charge if ledger unique) | Engineering | Credit `idempotency_key`; session-id keys on grants | No `evt_` store | After first live payment |
| R-10 | Paid Checkout with missing webhook secret / failed fulfill → customer charged, entitlements missing | E-18, webhook 500 on failed pricing fulfill (code) | Low if secret present (E-17 historical) | High | Founder + webhook | Route ACKs only on fulfill success for pricing sessions | Secret presence last measured 2026-10-20 | EXP-B1 includes webhook event proof |
| R-11 | AI/agent spend unbounded on the CRM request path | E-29, E-30 | UNKNOWN (no PROD token aggregate) | Medium (cash) | Founder | BUS governor if that consumer is what spends; CRM Claude unmetered | Do not assume $25/month covers Next.js AI routes | Measure; no router build |
| R-12 | Cannot prove which git SHA is in production; rollback is dashboard folklore | E-10, E-31, E-32 | Certain | Medium (incident MTTR) | Engineering | Vercel dashboard instant rollback exists as a product; not wired as `request_rollback` | EXP-B1 rollback = previous deployment + unset env | Separate GO from EXP-B1 |
| R-13 | Stale/red open PRs (#924 #843 lint; #192 old failure; #806 stale audit) invite duplicate “fixes” | E-03, E-34 | High (23 PRs) | Medium (wasted agent hours, merge conflicts) | Founder (close or repair) | This register | Agents must continue existing branches | Process |
| R-14 | Nightly “success” hides failed chromium auth suite | E-07 | Certain (this run) | Low–medium (false E2E confidence) | CI | Warning in log | Logged-in paths unproven nightly | Do not use nightly as auth proof |
| R-15 | Outreach cannot send (fail-closed) if unsubscribe secret missing — or **can** send if it is set; neither proven | E-12, E-28 | UNKNOWN | Medium (either silence or GDPR) | Founder | Fail-closed in `sendApprovedOutreach` | Do not email prospects as an experiment | Not EXP-B1 |

## Risks explicitly not claimed

- “105 of 143 tables grant anon INSERT” — historical memory, **UNKNOWN** this session (E-22).
- “Checkout is 503 in production today” — **UNKNOWN**; unauthenticated config is 401, not 503 (E-11).
- “Zero paying customers today” — last SQL 2026-10-20 (E-17), **not** re-run.
- Clean bill of RLS on PROD — **not claimed**.
