# Critical bug hunt — scoped paths (2026-11-15)

**Head:** `da236672` (local tip; includes `c0ed01e9` + billing revoke fix)  
**Branch:** `cursor/critical-bug-hunt-2026-11-15` (report-only)  
**Scope:** matching-store, recommendations-store (post-#937), unsubscribe HMAC, starter-pack download HMAC, semantic search tenant isolation, gmail-pull/connect beyond markError/markPulled, public-capture, model-gateway cost governor, grant-engine/credits expiry beyond #859 repair.

**Skipped (open fix PRs):** #952 #951 #948 #946 #945 #944 #942 #934 #933 #930 #924 #923 #911 #902 #843 #859 #881

---

## NEW CRITICAL

### 1. model-gateway AppendOnlyJsonlLedger — serverless / multi-instance cost governor bypass

| | |
|---|---|
| **Location** | `packages/model-gateway/src/ledger.ts` (`AppendOnlyJsonlLedger`), `packages/model-gateway/src/gateway.ts` (`complete`: summarize → preflight → HTTP → append). Wiring in open PR #949: `apps/crm/src/lib/ai/outreach-cost-governance.ts` |
| **Root cause** | Daily/monthly budgets are enforced only from a local JSONL file. On Vercel serverless the filesystem is ephemeral and not shared across instances. There is also no in-flight reservation: concurrent `complete()` calls all read the same (often empty) `summarize()` then all pass `preflightCost` before any append. Spend is recorded **after** the paid HTTP call (`?? 0` if price missing). |
| **Concrete trigger** | Merge/deploy #949 (or any prod caller of `createModelGateway`) with `OPENAI_API_KEY` set; N parallel outreach/LLM requests across cold starts or concurrent lambdas. |
| **Impact** | `MODEL_GATEWAY_DAILY_LIMIT_EUR` / `MONTHLY_LIMIT_EUR` do not bind in production. Real OpenAI spend can exceed configured caps without BLOCK. Fake governance. |

**Not on CRM main import graph yet** — package is live (#947) and #949 wires it into paid outreach. Block #949 on durable shared ledger (or refuse live calls without one).

### 2. grant-engine expire TOCTOU — concurrent monthly grant wiped permanently

| | |
|---|---|
| **Location** | `apps/crm/src/lib/credits/grant-engine.ts` `expireGrantCreditsForAgency` (current-grant ledger SELECT then `expireGrantCreditsAtomic`); `expire_grant_credits` RPC in `apps/crm/supabase/migrations/20260804230000_atomic_credit_mutations.sql` (zeros **entire** `grant_credits_balance`, no current-period grant check under `FOR UPDATE`) |
| **Root cause** | TS guard `ledgerHasIdempotencyKey(currentGrantKey)` is outside the RPC transaction. `expire_grant_credits` only idempotency-keys the **expiry** row; it does not refuse when `monthly_grant` for the current period already exists. A grant that lands after the check and before/during the RPC is included in the zeroed pool. Grant ledger row remains → idempotent retry will not restore credits. Distinct from #859 (repair-path absolute `purchased` overwrite). |
| **Concrete trigger** | 1st-of-month `/api/cron/credits-cycle` expire phase in flight past the current-grant check for agency X, interleaved with `triggerInitialGrantAfterSeatCheckout` / `credits-grant` / sibling cycle grant for X (same `monthlyGrantIdempotencyKey`). |
| **Impact** | That month’s grant credits permanently disappear from `grant_credits_balance` / `credits_balance` while ledger claims the grant was applied. Customer locked out of grant pool until manual ops. |

**Fix shape:** Inside `expire_grant_credits`, under the same `FOR UPDATE` on `agencies`, abort (skip) if current-period monthly grant idempotency key exists; do not rely on a prior unlocked SELECT.

---

## Cleared in this pass (no NEW critical beyond tracked)

| Area | Result |
|---|---|
| **matching-store** | Wipe paths still delete-then-insert + Promise.race timeout soft-return (`#843`), global `.not(id)` multi-agency (`#948`), no LIST_MAX guard (`#924`). Empty inventory early-return present. No additional wipe path found. |
| **recommendations-store** | Post-#937 LIST_MAX + MATCHES_READ_MAX guards on global clear. Remaining: type-blind clear `#944`, match soft-fail `#930`, clear-then-insert `#952`, multi-agency `#948`. No fourth wipe class. |
| **unsubscribe + suppression HMAC** | GET no-op; POST HMAC-SHA256 + `timingSafeEqual`; secret min length fail-closed; outreach vs brief scopes; suppression upsert by hash. No forge / GET-unsub / silent success without write. |
| **starter-pack download HMAC** | Prod fail-closed without real secret; timing-safe verify; purchase row check via service_role; 503 if no DB in prod. Residual medium only: `STRIPE_WEBHOOK_SECRET` signing fallback, no token TTL (not CRITICAL). |
| **semantic search** | service_role/admin RPC candidates → session `agency_id` detail filter; no agency → throw → ILIKE fallback (RLS). No cross-tenant detail leak found. |
| **gmail-pull / gmail-connect-store** | Beyond `#911`/`#902` (markError/markPulled still unscoped by ciphertext): seen-store agency-keyed; permanent 4xx marked seen; transient acquire not marked; no new token/suppression wipe. |
| **public-capture** | API key server-side only; honeypot; Zod; rate limits (fail-open = spam risk, not CRITICAL data loss). |
| **grant expiry besides #859** | Atomic RPC path OK when guard holds; repair absolute write still `#859`. NEW item is the unlocked current-grant TOCTOU above (not the repair write). |

---

## Evidence notes

- CRM main does not import `@revolis/model-gateway` (rg clean under `apps/`).
- Open PR #949 adds `completeOutreachLlm` → `AppendOnlyJsonlLedger` with default path `var/model-gateway/crm-outreach.jsonl` and deploy note to “confirm serverless ledger writability”.
- `credits-expire` / `credits-grant` removed from `apps/crm/vercel.json`; only `credits-cycle` remains — race still reachable via checkout grant + cycle overlap / manual grant route.
