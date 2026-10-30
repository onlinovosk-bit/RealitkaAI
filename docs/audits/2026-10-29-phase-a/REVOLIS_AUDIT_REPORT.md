# Revolis.AI Phase A audit

- **Repo:** `onlinovosk-bit/RealitkaAI`
- **Scope:** Phase A (read-only inspection + this docs-only draft PR). Phase B/C not started.
- **Default branch:** `main`
- **Commit audited:** `03f6c7199ae119b6811a717d378973a0d1db8b78`
- **Commit date:** `2026-10-28T12:34:52Z` (`feat(verify): evidence gate rejects assertion-only completion (#918)`)
- **Audit clock:** `2026-10-29T13:40:07Z` (production HTTP probes) / `2026-10-29` (GitHub API + repo)
- **Auditor:** Cursor cloud agent, docs-only. No merge, deploy, PROD write, RLS change, secret, Stripe write, or application code change.

Treat this file as a map. Claims live in `REVOLIS_EVIDENCE_REGISTER.md`. Numbers that were not measured in this session are `UNKNOWN`, never zero.

## Tools and permissions actually used

| Tool | Status this session | Used for |
|---|---|---|
| Git (local + `git fetch origin main`) | VERIFIED | SHA, files |
| GitHub CLI `gh` (read) | VERIFIED | PRs, Actions runs/logs |
| `curl` to `https://app.revolis.ai` | VERIFIED | public HTTP |
| Repo grep/read | VERIFIED | code, migrations, workflows |
| MCP `Stripe` | BLOCKED `needsAuth` | live prices / customers |
| MCP `Supabase` | BLOCKED `needsAuth` | PROD RLS, grants, funnel tables |
| MCP `Vercel` | BLOCKED `needsAuth` | Production env **names**, deploy SHA |
| MCP `ga4-readonly` | BLOCKED discovery error | marketing funnel |
| MCP `gsc-readonly` / `gsc-onlinovo` | BLOCKED discovery error | search demand |
| GitHub branch protection API | BLOCKED HTTP 403 | required checks |
| Authenticated `GET /api/billing/checkout-config` | BLOCKED 401 | live checkout flags |

RAU router (`scripts/ops/rau-route.mjs`) returned `GO_REQUIRED` because the prompt **mentions** merge/deploy/PROD/RLS/secrets/Stripe. Those words are prohibitions, not actions. This PR is documentation only.

## Exit gate

| Gate | Result |
|---|---|
| Scope and commit identified | **PASS** — `main` @ `03f6c719` |
| Existing work reconciled | **PASS** — 23 open PRs listed; this PR does not duplicate #930, #925, #924, #923, #929, #913, #806 |
| Material findings evidenced | **PASS** — each in the evidence register |
| Unknowns and access limits explicit | **PASS** — MCP + PROD SQL + live Stripe/Vercel env |
| One revenue experiment choosable | **PASS** — `EXP-B1` in the backlog (not started) |
| Clean bill of health | **FAIL** — not claimed. Checkout path, tenant-wipe PRs, and funnel metrics are open. |

## PASS / FAIL / BLOCKED / NOT VERIFIED checklist

| Area | Verdict | Note |
|---|---|---|
| Default branch + SHA | **PASS** | Matches coordinator baseline |
| Open PR census | **PASS** | 23 open; `pushed_at` 2026-10-28T23:09:18Z is #930, not a new `main` tip |
| CI on `main` tip — Lint/test/build, Control Contract, BUS | **PASS** | run `40688986369` conclusion `success` |
| CI on `main` tip — in-job `next build` + Playwright smoke | **NOT VERIFIED** | fastpath skipped (tip commit touches only `docs/reports/…`) |
| Nightly Playwright on same SHA | **PASS** with caveat | run `40848926451` success; **41 passed**; chromium auth suite failed non-blocking |
| Preview Playwright on `main` tip | **NOT VERIFIED** | run `40689324389` `skipped` |
| Production `/api/healthz` reachable | **PASS** | HTTP 200 `{"ok":true,"status":"healthy"}` — no git SHA |
| Production self-serve checkout availability | **BLOCKED** | checkout-config 401 without session; Vercel/Stripe MCP unauthenticated |
| Production Stripe catalog / paying agencies | **BLOCKED** | needs Stripe + Supabase read |
| Funnel outbound → demo booked → demo done → trial → first payment | **NOT VERIFIED** | no accessible denominator this session |
| Repo RLS on two tables (`credit_redemption_codes`, `demo_prefill_links`) | **FAIL** (repo) | no `ENABLE ROW LEVEL SECURITY` in migration chain |
| PROD grant matrix / anon INSERT count | **BLOCKED** | needs `information_schema.table_privileges` on PROD |
| Match-read fail-closed | **FAIL** on `main` | `listPersistedMatches` returns `[]` on error; #930 open |
| Acquire dedup tenant scope | **FAIL** on `main` | global `key` PK; #881 open |
| Agent USD governor in BUS package | **PASS** (code) | limits exist; `selectRoute.applied` always `false` |
| CRM Anthropic token ledger | **FAIL** (code) | Claude usage logged to stderr only |
| Rollback identity (`healthz` SHA / `request_rollback`) | **FAIL** (code) | SHA absent live; `request_rollback` not in code |
| Phase B experiment | **NOT STARTED** | recommendation only |

## What was verified in this session

1. **`main` did not move.** Fetch of `origin/main` equals `03f6c719`. GitHub `pushed_at=2026-10-28T23:09:18Z` is draft PR #930 (`fix/recommendations-matches-read-fail-closed`), not a new default-branch commit.
2. **Required-looking CI on that SHA is green** for jobs named `Lint, test, build`, `Control Contract (authority + closed loop)`, `BUS (transport authority boundary)`. Vitest in that job: **517 test files passed, 6 skipped (523); 3815 tests passed, 6 todo (3821)**. Build and in-job Playwright were skipped by `scripts/ci/classify-diff.sh` because the tip commit is a 2-line docs edit.
3. **Nightly Playwright** on the same SHA: **41 passed (8.0s)** then `chromium auth suite failed (non-blocking)`.
4. **Gmail inbound pull** workflow reports `success` every 10 minutes while skipping: `CRM_BASE_URL / CRON_SECRET nie sú nastavené — pull sa preskakuje.` (run `40785408083`).
5. **Production** `https://app.revolis.ai/api/healthz` is up and does not identify the deployed git SHA. Unauthenticated `GET /api/billing/checkout-config` is **401**. `POST /api/unsubscribe` without token is **400**. `GET /api/resend-webhook` is **405**.
6. **Checkout in current code** still requires valid `price_*` env IDs. Legacy path: all three `STRIPE_PRICE_{SOLO,TEAM,OFFICE}_SEAT`. Pricing v3 path (flag `PRICING_V2_ENABLED` default **off**): `STRIPE_PRICE_V3_SEAT_MONTHLY` always. Missing webhook secret throws and the webhook route returns **400**.
7. **Security in repo SQL:** most CRM tables enable RLS; two created tables never do. Service-role clients bypass RLS. `public.events` still grants `INSERT` to `anon` under profile-scoped RLS. Application session gate is `apps/crm/src/proxy.ts` (no `middleware.ts` at this SHA).
8. **Open reliability PRs already exist** for wipe/dedup/billing fail-closed. Three of them have red `Lint, test, build` on their current heads (#924 lint, #843 lint, #913 tests/lint — exact assertion for #913 not isolated). Do not re-open parallel PRs.

## What was not verified

- Live Vercel Production env **names** after 2026-10-20 (historical report `docs/reports/2026-10-20-stripe-krok-c-blokator.md` is not today’s reading).
- Live Stripe prices, webhook endpoint event set, customer/subscription counts.
- PROD `pg_policies`, table grants, agency counts, `stripe_subscription_id` population, `events` row counts.
- Branch-protection required checks (API 403). Whether automerge’s sole check `Lint, test, build` is also GitHub’s only required check is **UNKNOWN**.
- Whether Next.js on Vercel actually mounts `src/proxy.ts` as the request gate (code exists; runtime wiring not traced beyond public 401/200 behaviour).
- GA4 / Search Console conversion counts.
- Independent review of this audit (same agent wrote it).

## Top risks (ranked)

1. **Self-serve payment is not proven available** (R-01). Code can refuse checkout when price env IDs are missing. Production checkout-config is behind auth. Last measured Vercel names (2026-10-20) had **no** `STRIPE_PRICE_V3_*`. Today’s live env is UNKNOWN. This is the revenue bottleneck.
2. **Recommendation wipe on match-read error** (R-02). On `main`, `listPersistedMatches` returns `[]` on error; `recalculateAllRecommendations` can then clear and rebuild from an empty match set if the lead list looks “safe”. Draft #930 addresses this. Do not duplicate.
3. **Cross-agency acquire dedup** (R-03). Dedup PK is a global hash of listing+contact+time. Open #881. Do not duplicate.
4. **Unmeasured funnel** (R-04). No stage in outbound → first payment has a current numerator/denominator from this session. Decisions about ads, copy, or pricing tests would be unfalsifiable until EXP-B1 or a read of Stripe/CRM.
5. **False-green operational jobs** (R-05). Gmail pull `success` without calling the endpoint. Preview Playwright on `main` tip `skipped`. Nightly marks auth-suite failure as warning.

## Recommended Phase B experiment (do not start)

**EXP-B1 — Unblock first Stripe-backed payment (configuration, not code).**

See `REVOLIS_PRIORITIZED_BACKLOG.md`. Hypothesis, primary metric, guardrails, cost ceiling, and rollback are fixed there. This audit does not create Stripe prices, write Vercel env, or merge #913.

## Reconcile with existing open work

| PR | Why it is not this audit | What to do instead |
|---|---|---|
| **#930** draft | Fail-closed match-read (wipe). CI green on head. | Merge only on founder GO after up-to-date `main`. |
| **#924** | LIST_MAX wipe. `main` already has a partial guard. Current head **lint FAIL**. | Fix lint on the PR; do not open a third matching PR. |
| **#843** | Upsert-then-orphan matching. Head **lint FAIL**. | Same. |
| **#881** | Tenant-scope acquire dedup. CI green. | Founder GO to merge; not Phase B. |
| **#925** | Legacy async fulfill fail-closed. CI green. | Keep; billing reliability, not the first-payment experiment. |
| **#923** | Outreach fail-closed if agency unresolved. CI green. | Keep. |
| **#929** | Starter-pack HMAC public download. CI green. | Keep. |
| **#913** draft | Plan-specific v3 price env keys. Head **Lint, test, build FAIL**. Changes which env vars EXP-B1 would set. | Do **not** merge as part of EXP-B1. Experiment uses **current `main` contract**. |
| **#806** draft | Payments E2E audit dated 2026-10-02. Stale vs `billing-lifecycle.ts` now writing cancel/past_due onto `agencies`. | Cite; do not rewrite inside #806. This Phase A supersedes its snapshot. |
| **#911 / #902** | Gmail OAuth token races. | Separate from Gmail **pull secrets** (R-05). |
| **#842** | Onlinovo PMax/CRO VALIDATE docs. | Other product; not Revolis first payment. |
| Older #813–#186 | DPA, working-style, env, automerge-stale features | Out of Phase A scope. |

## Inspection notes (short)

### Security boundaries

Repo migrations enable RLS on most `public` tables and later close historic `demo_*` anon policies. Two tables are created with **no RLS** in the chain: `credit_redemption_codes`, `demo_prefill_links`. Effective exposure depends on table grants, which are UNKNOWN on PROD. Service-role is used on public inbound/onboarding/webhook routes; tenant safety there is application logic. Session APIs generally `getUser()` then scope by `agency_id`. RLS tests exist (`apps/crm/tests/rls/`, 7 files) and CI greps that they ran; this session did not re-execute them locally.

### Events and integrity

Product analytics use `public.events` via `logEvent` (optional service-role `client` after EVENTS-WRITE-PATH-01). Realtime uses `platform_events`. `event_store` / `EventStore` exist and are not the CRM runtime path. Stripe webhook verifies signature; missing secret → 400. Credit ledger uses `idempotency_key`; there is **no** `stripe_event_id` store. Public inbound lead POSTs create a new lead per call (no dedup).

### API validation

**132** route files export `POST`. **20** of them import `validateBody` / `validateQuery`. Majority parse JSON ad hoc. Sample, not a 132-route review.

### Tests and CI

Inventory excluding `node_modules`: **610** `*.test.ts(x)|*.test.mjs|*.spec.ts` files; **99** verification tests; **7** RLS tests. Main-tip vitest: 3815 passed / 6 todo. Fastpath is documented and fail-safe: unknown diff → full run. Docs-only PRs (this one) will skip Build and in-job smoke by design; Test still runs. Preview smoke only runs when `deployment_status` is success, environment is `Preview`, and URL contains `realitka-ai`.

### Agents, loops, spend

`packages/bus-core` `INTERNAL_GOVERNOR_LIMITS`: $0.50 / task, $5 / UTC day, $25 / month, 0 retries, 10 min timeout. `DAILY_EXECUTION_CAP = 100`. `selectRoute` never applies a model switch (`applied: false`). CRM OpenAI path increments `ai_openai_tokens`; Claude path does not. Whether BUS consumer is the runtime that spends production model budget is UNKNOWN without ledger/PROD.

### Rollback and observability

Live healthz has no SHA, so “this deploy is commit X” cannot be proven from the endpoint. `request_rollback` is documentation only. No `@sentry` in `apps/crm`. Pulse/probes exist in code.

## Verdict

Phase A is **complete as an audit, not as a clean bill of health**. The rational next move is founder GO on **EXP-B1** (config-only first payment), in parallel with merge consideration of already-open fail-closed PRs that are green. Do not start a new code PR for wipe/dedup/checkout. Do not start ads or a pricing-v3 refactor (#913) until checkout on **current `main`** is proven available.
