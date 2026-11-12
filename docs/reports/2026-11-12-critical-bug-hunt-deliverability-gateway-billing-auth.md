# Critical bug hunt 2026-11-12 — deliverability / gateway / billing / auth

Head audited: `origin/main` @ `c0ed01e9` (+ fix on hunt branch).  
Scope: areas requested after open fix PRs excluded.

## Skipped already-tracked (do not re-report)

#948 #946 #945 #944 #942 #934 #933 #930 #924 #923 #911 #902 #843 #859 #881

## CRITICAL (high confidence)

### 1. Invoice `manual_plan` still write-locked by Stripe leftover after #938

- **Where:** `billing-store.ts` `pickRelevantStripeSubscription` kept `incomplete`; `saas-ops.ts` `trialGraceFrom` ignored `paysOutsideStripe` whenever `hasSubscription` was true (`past_due` / `unpaid` / fall-through `incomplete`).
- **Trigger:** Agency with non-empty `manual_plan` (invoice tenant). Owner login email matches a Stripe Customer that only has `incomplete` (abandoned Checkout) or `past_due`/`unpaid` leftover from a self-serve experiment. After trial window → `limited`/`blocked` → `requireActiveAppAccess` read-only despite paying outside Stripe.
- **Why distinct from #938:** #938 stopped picking `canceled` / `incomplete_expired` only. `incomplete` stayed relevant; `past_due`/`unpaid` still short-circuited past `manual_plan`.
- **Fix (this branch):** drop `incomplete` from relevant statuses; when `paysOutsideStripe`, non-active Stripe statuses resolve to `active`.

### 2. model-gateway EUR governor is not durable under serverless / multi-instance (#949 wiring)

- **Where:** `packages/model-gateway` `AppendOnlyJsonlLedger` + open CRM wiring in PR #949 (`completeOutreachLlm` → relative `var/model-gateway/crm-outreach.jsonl`).
- **Trigger:** Deploy #949 to Vercel. Concurrent serverless outreach completions each read an empty or instance-local ledger → `preflightCost` always sees ~0 spend → `MODEL_GATEWAY_DAILY_LIMIT_EUR` / monthly caps do not bind → unbounded OpenAI spend. Same class as in-process TOCTOU, amplified by ephemeral FS.
- **Note:** No CRM caller on `main` yet; defect is in the package and becomes production blast radius when #949 merges without a shared durable ledger.
- **Fix:** not in this PR (needs durable shared spend store before prod wiring GO).

## Cleared (no new CRITICAL)

| Area | Result |
|------|--------|
| Deliverability / unsubscribe / bounce (a2e42ace) | Signature fail-closed; GET no write; HMAC + timingSafeEqual; agency-scoped unsub; global only for hard bounce/complaint/suppressed; no wipe path on `email_suppressions`. Residual SYSTEM_USAGE fallback still #923. |
| Starter-pack HMAC (#929) | timingSafeEqual; prod refuses missing secret; token bound to `stripe_session_id` + DB purchase row; no cross-purchase forge without secret. |
| Auth after #941/#939/#935 | profiles PATCH allowlist + self-role block; team create owner + caller agency; ceo-command / auth-email-tests DB `role` only. |
| billing incorrectly **granting** after #938 | No new path found where canceled leftover restores paid access. |

## Medium (suspicious, not filed as CRITICAL)

1. model-gateway records spend **after** provider HTTP — append failure / crash under-counts (retry double-charge possible).
2. auth-email-tests invite still lacks invite-route cross-agency email precheck (usually fail-closed by Supabase unique email).
3. Starter-pack signing falls back to `STRIPE_WEBHOOK_SECRET` when dedicated download secret unset (compromise of webhook secret forges download tokens).

## Validation

```bash
cd apps/crm && npx vitest run \
  src/lib/__tests__/trial-no-card.test.ts \
  src/lib/__tests__/billing-store.test.ts \
  src/lib/__tests__/billing-store.memo.test.ts
```
