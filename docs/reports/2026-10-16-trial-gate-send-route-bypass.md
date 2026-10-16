# Trial gate bypass — ghostwriter/send-email + playbook/confirm-viewing

> Read-only audit on `main` @ `80eb86b1` (branch tip = `origin/main`).  
> Context: WP-2 (2026-10-15) claimed expired trial can still send via these routes.  
> **No code changes in this report.**

## Verdict: **CRITICAL**

**Trigger scenario:** Authenticated broker whose trial has expired without a subscription (`trialGrace.state === "limited"` → `accessLevel === "read_only"` → `canUseFullApp === false`) can still:

1. `POST /api/ghostwriter/send-email` → Resend sends third-party email (arbitrary `recipientEmail` + HTML).
2. `POST /api/playbook/confirm-viewing` → `sendMessage` sends email and/or SMS to the lead’s contact.

Session auth and Control Contract (`authorizeSend`) still apply; **billing / trial write-gate does not.**

## Evidence

### Gate contract (what “limited” means)

| File | Lines | Fact |
|------|-------|------|
| `apps/crm/src/lib/feature-gating.ts` | 28–47 | `requireActiveAppAccess()` throws when `!snapshot.canUseFullApp` (read-only after trial/cancel). |
| `apps/crm/src/lib/feature-gating.ts` | 50–51 | `requireFeature()` **always** calls `requireActiveAppAccess()` first. |
| `apps/crm/src/lib/saas-ops.ts` | 74–95, 557–558 | `limited` / `blocked` → `read_only`; `canUseFullApp = accessLevel === "full"`. Hardcoded `true` from 2026-10-05 fail-open is **gone**. |
| `apps/crm/src/lib/saas-ops.ts` | 395–399 | Expired trial, no Stripe sub → `state: "limited"`. |
| `apps/crm/src/lib/__tests__/trial-no-card.test.ts` | 71–74 | Unit proof: day 14 → `read_only`. |

So the gate **works where called**. The hole is **call-site coverage**.

### Target routes — no trial gate

**`apps/crm/src/app/api/ghostwriter/send-email/route.ts`**

- Imports: auth, rate-limit, Resend, audit, `authorizeSend` — **no** `feature-gating`.
- POST flow (L20–159): `getUser` → rate limit → validate → `authorizeSend` → `resend.emails.send`.
- Zero calls to `requireActiveAppAccess` / `requireFeature` / `getSafeBillingStatus`.

**`apps/crm/src/app/api/playbook/confirm-viewing/route.ts`**

- Imports: auth, audit, `authorizeSend`, `sendMessage` — **no** `feature-gating`.
- POST flow (L38–211): `getCurrentUser` → lead lookup → `authorizeSend` + `sendMessage` for email/SMS.
- Zero calls to `requireActiveAppAccess` / `requireFeature`.

**`authorizeSend` is not a trial gate** (`apps/crm/src/lib/control-plane/authorize-send.ts` L32–58): Control Contract only (registry + human approval + kill switch). No `canUseFullApp` / billing.

### Who *does* call the gate (API)

Only **8** `route.ts` files under `apps/crm/src/app/api/**` import `requireFeature` (and thus `requireActiveAppAccess`). **None** import `requireActiveAppAccess` directly.

| Route | Gate |
|-------|------|
| `outreach/send` | `requireFeature("outreach")` L30 |
| `outreach/approve` | `requireFeature("outreach")` L30 |
| `outreach/preview` | `requireFeature("outreach")` L28 |
| `integrations/email/sync` | `requireFeature("integrations")` |
| `integrations/calendar/sync` | `requireFeature("integrations")` |
| `integrations/portal/import` | `requireFeature("integrations")` |
| `team/assign-lead` | `requireFeature("teamManagement")` |
| `scoring/recalculate` | `requireFeature("aiScoring")` |

Contrast: `/api/outreach/send` is blocked for expired trial; `/api/ghostwriter/send-email` and `/api/playbook/confirm-viewing` are not.

### Middleware / layout — no API trial enforcement

| Layer | Finding |
|-------|---------|
| `middleware.ts` | **Does not exist** in repo. |
| `apps/crm/src/proxy.ts` | Session gate only (`getUser` → 401 for `/api/*`). No `canUseFullApp` / trial / `feature-gating` (L119–213). |
| Dashboard `layout.tsx` | No trial/access imports found. |
| Page-level | `getFeatureGateState` on a few UI pages (`outreach`, `scoring`, …) — UI only; does not protect direct API POST. |

## Minimal fix (not applied)

**Yes:** adding `await requireActiveAppAccess()` (or `requireFeature("communicationHub"|"outreach")` if plan flags should also apply) near the top of both handlers, catching → 403, would close these two send holes the same way `outreach/send` already does.

Caveat: that is **route-local**. Many other write/send paths also skip the gate (below); a durable fix is shared enforcement (helper used by all mutation/send routes, or proxy-level for authenticated `/api` POST/PUT/PATCH/DELETE with an allowlist for billing/auth).

## Other high-blast-radius send/write routes that clearly skip the gate

Authenticated / product send paths (not public marketing webhooks):

| Route | Why high blast | Gate present? |
|-------|----------------|---------------|
| `POST /api/leads/[id]/drafts/[activityId]/approve` | Same `approveAndSendInboundDraft` as gated `outreach/send` | **No** `requireFeature` |
| `POST /api/stealth-recruiter/outreach` | Resend outreach to prospects | `checkCapabilityAccess` (license tier only) — **not** trial/`requireActiveAppAccess` |
| `POST /api/ghostwriter/generate` | AI letter gen + DB write / cost | No |
| `POST /api/leads` | Create leads (core write) | No |
| `POST /api/properties` | Create properties | No |
| `POST /api/tasks` | Create tasks | No |
| `POST /api/import` | Bulk import | No |

Lower priority for *this* WP (public or support, not “expired trial broker keeps paying features”):

- `neighborhood-watch/subscribe` — public-ish subscribe + confirmation email
- `guarantee/claim` — optional session + claim emails
- `founder/send-legal-update-email` — founder tooling

Cron/webhooks (`acquire/email`, `scheduled-outreach`, etc.) are intentionally non-session; trial gate is a different design question.

## WP-2 claim vs current main

| Claim | Result |
|-------|--------|
| ghostwriter + confirm-viewing skip `requireActiveAppAccess` | **Confirmed** |
| Expired trial can still send | **Confirmed** (gate live in saas-ops; these routes never call it; proxy does not enforce trial) |
| Gate itself still hardcoded open | **Falsified for current main** — `canUseFullApp` is derived from `accessLevel` (fixed after 2026-10-05 P1) |

## Method

1. Read `feature-gating.ts`, both routes fully.  
2. `rg requireActiveAppAccess|requireFeature|getSafeBillingStatus|trialGrace|limited` across `apps/crm/src/app/api/**/route.ts`.  
3. Compared gated set vs Resend/`sendMessage`/`authorizeSend` call sites.  
4. Inspected `proxy.ts` + absence of `middleware.ts` + layout grep.

HEAD verified: `git rev-parse HEAD` = `80eb86b1` = `origin/main`.
