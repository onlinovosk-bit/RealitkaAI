# Critical bug hunt — recent WP / billing / signup commits

**Date:** 2026-10-12  
**Scope:** behavioral commits only (WP-2, WP-3, billing admin key, self-serve signup, FAIL-OPEN-SWEEP, pricing/credits webhook).  
**Method:** read diffs + current callers; adversarial review (Kontrolór).  
**Severity filter:** data loss, auth bypass, silent drop of user/paid data, race losing writes, security holes, crashes on critical paths. UX/docs ignored.

**Verdict:** **3 critical findings**, 1 high operational footgun, rest of scoped paths OK or intentional fail-open with documented tradeoff.

---

## CRITICAL-1 — Trial / write gate bypass on WP-2 send routes

**Files / lines**
- `apps/crm/src/app/api/ghostwriter/send-email/route.ts` — entire `POST` (auth + rate-limit + `authorizeSend`, **no** `requireActiveAppAccess` / `requireFeature`)
- `apps/crm/src/app/api/playbook/confirm-viewing/route.ts` — `POST` from ~L38 (same gap)
- Contrast (working): `apps/crm/src/app/api/outreach/send/route.ts` L29–33 calls `requireFeature("outreach")`

**Evidence**
- `rg requireActiveAppAccess|requireFeature` under `api/ghostwriter` and `api/playbook` → **no matches**.
- FAIL-OPEN-SWEEP (`d03cc475`) made `requireActiveAppAccess()` enforceable (`canUseFullApp` from trial/active/grace only). WP-2 (`b8f1d1f5`) wired kill switch but did not attach that gate.

**Trigger**
1. Agency user finishes trial → `getTrialGraceState` → `limited` → `accessLevel = read_only` → `canUseFullApp = false`.
2. `POST /api/outreach/send` → 403 (gated).
3. Same user `POST /api/ghostwriter/send-email` or `POST /api/playbook/confirm-viewing` with valid session + agency → email/SMS still sent (Resend / `sendMessage`) if kill switch off.

**Blast radius**
- Unpaid / expired accounts keep sending externally visible mail/SMS.
- Paywall and “read-only after trial” promise are bypassable on two production send paths WP-2 just hardened for kill switch — false sense of closure.

**Minimal fix sketch**
```ts
// both routes, after auth + agency resolve:
try {
  await requireFeature("outreach"); // or requireActiveAppAccess()
} catch (e) {
  return NextResponse.json({ error: ... }, { status: 403 });
}
```
Add regression tests: limited snapshot → 403, Resend/`sendMessage` not called.

**Kontrolór:** FAKT (code absence + contrast route). **STOP** for “WP-2 closed send surface”.

---

## CRITICAL-2 — `getFeatureFlagsForPlan` still hard-coded all-true (same class as fixed P1)

**Files / lines**
- `apps/crm/src/lib/saas-ops.ts` L144–158 — `// DEV OVERRIDE: Always enable all features for development/testing` then every flag `true`
- Consumers: `requireFeature` → `requireActiveAppAccess` then `snapshot.flags[feature]` (`feature-gating.ts` L50–57); used by outreach, scoring, integrations, team assign-lead APIs

**Evidence**
- Sweep report `docs/reports/2026-10-05-fail-open-sweep.md` fixed **only** `canUseFullApp = true` (P1). Twin DEV OVERRIDE on feature flags was left in the same file.
- Function ignores `plan` argument entirely.

**Trigger**
1. Stripe live, agency on cheapest paid / starter-equivalent plan (`canUseFullApp === true`).
2. Call `POST /api/outreach/send`, scoring recalculate, integrations sync, etc.
3. `requireFeature("…")` always sees `flags.* === true` → paid / higher-tier features never denied by plan.

**Blast radius**
- Plan differentiation is a no-op for every API behind `requireFeature`.
- Combined with intentional `unknown` → full write when Stripe lookup fails (`saas-ops.ts` L74–91, L298–305): any period without Stripe key still grants full feature set (documented tradeoff for access; flags make it worse once write is allowed).

**Minimal fix sketch**
- Replace DEV OVERRIDE with a real per-`PlanKey` matrix (or fail-closed: unknown plan → all false except whatever Free/trial product allows).
- Mutation test: `getFeatureFlagsForPlan("free"|"starter")` must not equal full enterprise matrix.
- Do **not** leave a second `canUseFullApp`-style override in this file.

**Kontrolór:** FAKT. Same failure mode the sweep claimed to close for paywall. **STOP** before treating plan gating as done.

---

## CRITICAL-3 — Expire “repair” path can wipe concurrent purchased credits

**Files / lines**
- `apps/crm/src/lib/credits/grant-engine.ts` L173–190 — repair when expiry ledger row exists, current grant absent:
  - `newTotal = agency.purchased_credits_balance` from **caller snapshot**
  - absolute `UPDATE agencies SET grant_credits_balance=0, credits_balance=newTotal`
- Callers pass snapshot rows: `monthly-cycle.ts` L65–78, `api/cron/credits-expire/route.ts`
- Happy path correctly uses `expireGrantCreditsAtomic` (FOR UPDATE); repair intentionally bypasses RPC (test L211–213)

**Trigger**
1. Prior run wrote expiry ledger key but left `grant_credits_balance > 0` (partial failure).
2. Cron loads agency snapshot (`purchased_credits_balance = 80`).
3. Customer top-up / `apply_credit_purchase` completes → purchased becomes 180.
4. Repair UPDATE sets `credits_balance = 80` from stale snapshot → **−100 paid credits lost** (ledger may still show purchase; balance disagrees).

**Blast radius**
- Silent loss of paid credit balance on any agency hitting the repair branch under concurrency.
- Exactly the lost-update class CREDITS-RELAND claimed to fix for the main expire/grant path; repair reintroduced absolute write.

**Minimal fix sketch**
- Repair via SQL that re-reads under lock, e.g. single RPC/`UPDATE … SET grant_credits_balance = 0, credits_balance = purchased_credits_balance` **without** binding purchased from Node snapshot; or call a dedicated `repair_expire_grant_balance` RPC with `FOR UPDATE`.
- Test: after snapshot, mutate purchased upward, run repair → balance must reflect post-purchase purchased pool.

**Kontrolór:** FAKT (code + test documents absolute write). **STOP** for credit integrity on expire cron.

---

## High (ops) — Kill switch does not treat `on` as enabled

**Files / lines**
- `apps/crm/src/lib/control-plane/system-state.ts` L16–19 — only `"1"` / `"true"`
- Contrast: `isSelfServeSignupEnabled` accepts `"true"|"1"|"on"` (`self-serve.ts` L23–26)
- Test explicitly: unrecognized values → kill switch **off** (`system-state.test.ts` L4–8)

**Trigger:** Operator sets `AGENT_KILL_SWITCH=on` (common boolean env) during incident → WP-2 `authorizeSend` still allows sends.

**Blast radius:** Emergency stop fails open; WP-2 kill-switch work ineffective for that env spelling.

**Fix sketch:** Accept `on`/`yes` (same as self-serve) **or** fail-closed if value is set-but-unrecognised (stricter). Align docs + tests.

Not classed CRITICAL alone (docs say `1`/`true`), but directly in WP-2 kill-switch threat model.

---

## Areas reviewed — no critical bug found

### 1. WP-2 auth / tenant / kill-switch mechanics (aside from CRITICAL-1 / High)
- Session required; agency from profile not body; kill switch → 503 via real `authorizeSend` + control-contract I-007.
- `confirm-viewing`: `getLead(leadId, supabase)` + `filterRowsByAgency` (production no fixture fallback).
- Self-minted approval object is by design for human-click brokers; kill switch still wins.
- Ghostwriter letter `profile_id` null update (L164–169): weak ownership for `sent_at` metadata only — not send auth bypass; not elevated to critical.

### 2. WP-3 inbound outcomes — cross-tenant
- Agency from session profile only; query `agency_id` ignored (test covers).
- Service-role read + explicit `.eq("agency_id", …)`; empty agencyId throws.
- Allow-list `toSafeRow`; no message body / PII columns.
- Guard `if (!process.env.SUPABASE_SERVICE_ROLE_KEY)` before `createAdminClient` avoids anon fallback in `server.ts` L20.  
  **Note (non-critical inconsistency):** if prod migrates to **only** `SUPABASE_SECRET_KEY` (see billing fix), this route 503s while checkout works — availability, not leak.

### 3. Billing `createServiceRoleClient` fallback (`5eba5c39`)
- `admin.ts` L12: `SERVICE_ROLE_KEY || SECRET_KEY`; both missing → `null` (fail-closed).
- Does **not** fall back to anon/publishable (unlike `createAdminClient` in `server.ts`).
- Equivalent privileged key by design; does not weaken to client key.

### 4. Self-serve signup (`81b4b45e`, flag default off)
- App path gated `isSelfServeSignupEnabled`; provision only after `email_confirmed_at` + metadata flag.
- SQL `bootstrap_self_serve_agency`: SERVICE_ROLE only; re-checks confirmed email + consent; advisory lock; refuse invite email collision; safe defaults (seats 0, free, balances 0); trial credits capped.
- `profile_agencies_for_auth` email match requires **confirmed** email (anti account-join).
- Flag-off `register` invite link uses user client + `profiles_self_update` (`id = auth.uid()`) — cannot attach to arbitrary invite row under RLS; fail-closed redirect when no agency bootstrap.
- Auth callback/confirm call `resolvePostConfirmUrl` for all flows; non-self-serve → skip. No privilege escalation found when flag off or on under stated constraints.  
  **PROD note:** migration “neaplikované” per commit — code present, RPC absent on PROD until applied (fail closed at RPC).

### 5. FAIL-OPEN-SWEEP remainder (aside from CRITICAL-2)
- `canUseFullApp` no longer hard-true; derived from access level.
- `UNKNOWN_TEAM_PERMISSIONS` all `false` (`navigation.ts` L90–98) — P2 closed.
- Intentional fail-open: `unknown` billing → full write (`saas-ops.ts` L78–91) — documented founder tradeoff; not a silent bug.

### 6. Pricing / credits webhook (aside from CRITICAL-3)
- Signature required; pricing fulfillment failure → HTTP 500 (Stripe retries), not silent ACK.
- Checkout `agencyId` set server-side from session profile (`credits-billing-v2.ts` create path), not client-trusted at fulfill time beyond Stripe-signed metadata.
- Plan/credits fulfillment idempotent (`grant:agency:YYYYMM`, `purchase:agency:sessionId`); unpaid session returns true (wait for async); live subscription status checked before activate; legacy agencies refused.
- Double `completed` + `async_payment_succeeded` → same idempotency keys.

---

## Commits traced

| Commit | Topic |
|--------|--------|
| `b8f1d1f5` | WP-2 send gate |
| `e31588fb` | WP-3 outcomes reader |
| `5eba5c39` | service-role / secret key fallback |
| `81b4b45e` | self-serve signup + annual (flag off) |
| `d03cc475` | FAIL-OPEN-SWEEP / trial gate |
| `93edf694` (+ fulfill paths in tree) | pricing v2 / credits webhook / grant-engine |

---

## Recommended next fix PR (single logical change each)

1. **Gate WP-2 routes** with `requireFeature("outreach")` + tests (closes CRITICAL-1).  
2. **Remove feature-flag DEV OVERRIDE** (closes CRITICAL-2) — may need product matrix GO.  
3. **Atomic expire repair** (closes CRITICAL-3).  
4. Optional: kill-switch accept `on` / reject unknown (High).

Do not merge all four into one PR (L99: 1 PR = 1 logical change).
