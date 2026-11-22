# Critical bug hunt — gateway / Control Tower / deliverability / auth (2026-11-22)

Head audited: `origin/main` @ `0437f80d` (+ this fix branch).
Mode: hunt → fix for findings that cleared the high-confidence bar.

## Skipped (open fix PRs — not re-investigated)

| Bug | PR |
|-----|-----|
| CSV import email overwrite | #961 |
| expire_grant_credits TOCTOU | #960 |
| unpaid→canceled | #953 |
| recommendations clear-then-insert | #952 |
| incomplete+past_due lockout | #951 |
| multi-agency RLS wipe | #948 |
| applySeatCheckoutEntitlements hardcodes active | #946 |
| incomplete_expired live | #945 |
| type-blind clear | #944 |
| licensing free entitlement | #942 |
| saas-ops NO_AGENCY_FACTS | #934 |
| pack_credits wipe | #933 |
| match-read soft-fail | #930 |
| LIST_MAX truncation | #924 |
| outreach SYSTEM_USAGE | #923 |
| gmail markError/markPulled | #911 / #902 |
| matching DELETE-then-INSERT | #843 |
| expireGrantCredits repair CAS | #859 |
| acquire_dedup_keys global PK | #881 |

---

## HIGH-CONFIDENCE BUGS (fixed in this PR)

### 1. Legacy `syncAccountTier` ignored subscription status → paid `profiles.account_tier` without payment / after unpaid

**Files (before):** `apps/crm/src/lib/billing-store.ts` — `syncAccountTier` (~77–131), callers `customer.subscription.created` (~617–619), `customer.subscription.updated` (~652–656), `checkout.session.completed` (~597–599).

**Root cause**
Mapped Stripe **price ID → paid tier** and wrote `profiles.account_tier` / `ui_role` with **no check of `subscription.status`**. Only `forceFree` on `subscription.deleted` downgraded. Agency lifecycle correctly revoked `agencies` on `unpaid` / `incomplete_expired`, then the same webhook re-granted the **profile** from the line-item price. Separately, customer→user resolve used unpaginated `auth.admin.listUsers()` (default 50) so cancel/`forceFree` could silently miss.

**Concrete triggers**
1. Legacy seat/plan Checkout creates `customer.subscription.created` with `status=incomplete` (3DS / abandon) → profile already `pro`/`enterprise` while agency fulfillment still waits for `payment_status=paid`.
2. Paying customer enters Stripe `unpaid` → lifecycle sets agency free → `syncAccountTier(customer, priceId)` restores/keeps paid profile → `checkCapabilityAccess` trusts profile tier.

**Impact**
Auth/entitlement bypass on gates that read `profiles.account_tier` / `ui_role` (`license/access.ts`, `resolveAccountTier`). Distinct from #946 / #953.

**Fix**
- Grant only when status ∈ `{active, trialing, past_due}`; clear on `{canceled, unpaid, incomplete_expired}`; no-op on `incomplete` / missing status.
- Classic Checkout grants only when `payment_status` is `paid` or `no_payment_required` (synthesizes entitling status).
- Resolve profile via `profiles.email` `ilike` (no `listUsers` page-1 truncation).

**Evidence:** `npx vitest run` billing-store + pricing-v2 suites — 32/32 PASS (incl. new incomplete/unpaid/async cases).

---

### 2. Public `/nehnutelnosti?intentId=` IDOR — service role reads any tenant’s `buyer_intents`

**Files (before):** `apps/crm/src/app/(public)/nehnutelnosti/page.tsx` `fetchIntent` (~103–110) — `createAdminClient().from("buyer_intents").select("*").eq("id", intentId)` with **no agency filter**. RLS on `buyer_intents` is bypassed by service role. Banner renders `raw_focus_text`, city, budget.

**Root cause**
Personalization URL uses `intentId` (by design — raw text must not sit in the query string), but the loader never constrained `leads.agency_id` to the public listing agency.

**Concrete trigger**
1. Victim completes `/buyer-onboarding` → redirect includes `intentId=<uuid>` (also embedded in CRM task `listingUrl`).
2. UUID leaks via Referer, history, shared link, or logs.
3. Attacker opens `/nehnutelnosti?intentId=<uuid>` — even a UUID from **another agency** — and sees that buyer’s focus text / budget on a public page.

**Impact**
Cross-tenant personal-data disclosure (GDPR). Not UUID guessing; exploit is leaked/redirected intent IDs under service-role bypass of tenant RLS.

**Fix**
`fetchPublicBuyerIntent` — UUID validate + `leads!inner(agency_id)` filtered to the public listing agency.

**Evidence:** `fetch-buyer-intent.test.ts` 3/3 PASS.

---

## Areas checked — no new HIGH bug clearing the bar

| Area | Result |
|------|--------|
| `packages/model-gateway` gateway/ledger/governor/rate-limit | JSONL ledger still ephemeral/non-shared on serverless; fail-closed when unreadable; **CRM does not call `createModelGateway().complete()` on main** (#949 open would wire outreach). Residual risk if #949 merges without durable spend — previously reported, not a live prod trigger today. |
| AI Control Tower `load.ts` / `subscription-write` / page auth | Page: `canViewFounderMetrics` (platform admin \|\| FOUNDER_EMAILS). Write API: `requirePlatformAdmin`. Snapshot validate + upsert OK. `limit(2000)` on audit/usage is display under-count only (ops), not user data wipe. |
| Deliverability `resend-webhook` / `suppression` / `unsubscribe-token` | Signature fail-closed; GET unsubscribe no-op; HMAC timing-safe; bounce→global suppression. Holds. |
| Starter-pack HMAC download (#929) | Prod requires real secret; DB purchase check; timing-safe. OK (medium: webhook-secret fallback still present). |
| Team create owner gate (#935), profiles PATCH role (#939), auth `ui_role` (#941), async fulfill (#925) | Gates hold; no new privilege mint found on those paths. |
| `createAdminClient` anon-key fallback | Misconfig footgun (ADAF); not a concrete prod trigger when `SUPABASE_SERVICE_ROLE_KEY` is set. |

---

## Test plan executed

```text
cd apps/crm && npx vitest run \
  src/lib/__tests__/billing-store.test.ts \
  src/lib/__tests__/billing-store-pricing-v2.test.ts \
  src/lib/public-listings/__tests__/fetch-buyer-intent.test.ts
# → 3 files, 35 tests PASS
```
