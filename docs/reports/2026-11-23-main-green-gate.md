# 2026-11-23 — Main Green Gate

Draft PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/964
Branch: `cursor/main-green-gate-6178`
Code commit: `f100d7e3` (docs commit follows in the same PR).
No merge, no ready-for-review, no Vercel/Stripe/Supabase prod, no secrets, no RLS, no new dependency.

## 1. Code Contract Guard

Workflow: `.github/workflows/code-contract-guard.yml`, job `Zmluva kódu (ratchet)`.
Rule script: `apps/crm/scripts/check-api-contract.mjs` (`--ci` fails only on violations absent from `apps/crm/scripts/api-contract-baseline.json`).
Rule source: `.cursor/rules/revolis-api.mdc`, section `Povinné importy`.

On `main` `0437f80d` the script exited 1:

```
NOVÉ porušenia:             2
  apps/crm/src/app/api/ai-control-tower/snapshots/route.ts
      chýba: @/lib/rate-limit — POVINNÉ na verejných endpointoch
  apps/crm/src/app/api/ai-control-tower/snapshots/route.ts
      chýba: @/lib/usage-metrics (incrementUsageMetric)
```

The route arrived in #957. `validate` and `response` were already present. The ratchet treats a POST as public unless the route file matches `auth.getUser`, `createClient()`, cron auth, `checkCapabilityAccess`, or `revolisGuard`. `requirePlatformAdmin()` does check the session, in another file, so `ratelimit` still applies. The guard script and the workflow were not weakened.

After the route change, the same command exits 0 with `NOVÉ porušenia: 0`.

What the route does now:

- rate limit only after the platform-admin gate (`ai-control-tower-snapshot:<ip>`, 30/min), so an anonymous call still returns 401 without touching the service role
- on a successful write, `incrementUsageMetric` with metric `ai_control_tower_snapshot` and `SYSTEM_USAGE_AGENCY_ID` (not a customer agency)

Local proof:

- `node apps/crm/scripts/check-api-contract.mjs --ci` exit 0
- `node apps/crm/scripts/check-cron-observability.mjs --ci` exit 0
- `node apps/crm/scripts/check-schema-gap.mjs --ci` exit 0
- `node apps/crm/scripts/typecheck-baseline.mjs` — 53 source errors, baseline 54, exit 0
- vitest: snapshot route + `ai-control-tower-subscription.verification.test.ts` — 7 passed
- eslint on the touched TS files — exit 0

GitHub: check `Zmluva kódu (ratchet)` on `f100d7e3` completed **success** (run https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/45196753182, job `137769131512`).

Pre-existing, not touched: baseline still lists `events/route.ts#validate` and `properties/route.ts#response`, which the script already counts as fixed (`Opravené od baseline: 2`). Baseline was not rewritten.

## 2. Nightly Playwright

Hypothesis (ubuntu-latest moved, Playwright 1.59.1 cannot install Chromium) is **confirmed** in the job log, not only by the comment already in `saas-grade-pipeline.yml`.

| Run | When | Job | Step |
|---|---|---|---|
| [44511986576](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/44511986576) | 2026-11-19 | `135518273981` | Install Playwright Chromium |
| [45168513746](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/45168513746) | 2026-11-23 | `137671632584` | Install Playwright Chromium |

Both logs:

```
BEWARE: your OS is not officially supported by Playwright; installing dependencies for ubuntu26.04-x64 as a fallback.
Cannot install dependencies for ubuntu26.04-x64 with Playwright 1.59.1!
Failed to install browsers
Error: ERROR: Playwright does not support chromium on ubuntu26.04-x64
```

The step was already `npx playwright install chromium --with-deps`. The OS is what Playwright 1.59.1 rejects. Lockfile `apps/crm/package-lock.json` resolves `playwright` to `1.59.1`.

Change: `nightly-playwright.yml` and the sibling `preview-playwright-smoke.yml` (same install command, still on `ubuntu-latest`) are pinned to `ubuntu-24.04`, matching `saas-grade-pipeline.yml`. The job is not skipped or deleted. No Playwright upgrade (that would be a new dependency).

### Nightly verification

`workflow_dispatch` on this branch was attempted and **refused**:

```
gh workflow run nightly-playwright.yml --ref cursor/main-green-gate-6178
HTTP 403: Resource not accessible by integration
```

This token cannot start Actions. The nightly workflow has no `pull_request` trigger, so the PR does not run it. The install fix on the nightly file itself is **UNVERIFIED** until the next schedule (`0 3 * * *`) or a dispatch by someone who can start Actions.

Related, not a substitute: the required job `Lint, test, build` already runs `npx playwright install chromium --with-deps` on `ubuntu-24.04` (`saas-grade-pipeline.yml`). A green smoke step on this PR shows that this Playwright version installs Chromium on 24.04. It does not execute `nightly-playwright.yml`.

## Deploy settings

No Vercel Build/Install/Output change.
