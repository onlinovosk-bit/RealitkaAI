# Critical bug — syncAccountTier ignored Stripe status (2026-11-22)

Head audited: `origin/main` @ `0437f80d`.

## Bug and impact

Legacy `syncAccountTier` in `apps/crm/src/lib/billing-store.ts` wrote paid
`profiles.account_tier` / `ui_role` from a Stripe **price ID** with **no**
`subscription.status` check. Agency lifecycle correctly freed the agency on
`unpaid` / `incomplete_expired`; the same webhook then re-granted the profile.
`checkCapabilityAccess` (`license/access.ts`) trusts that profile tier.

Distinct from open #946 (legacy seat entitlements) and #953 (v2 unpaid→canceled).

## Concrete triggers

1. Legacy seat/plan → `customer.subscription.created` with `status=incomplete`
   (3DS / abandon) → profile already paid while payment is pending.
2. Paying customer → Stripe `unpaid` → agency free → `syncAccountTier(customer, priceId)`
   restores/keeps paid profile entitlements.
3. Classic Checkout `session.completed` with `payment_status=unpaid` (async methods)
   previously minted paid tier before payment confirmed.

## Root cause

Price→tier mapping without a live-status gate; cancel path also used
unpaginated `auth.admin.listUsers()` (page size 50).

## Fix

- Grant only for `active|trialing|past_due`; clear on `canceled|unpaid|incomplete_expired`;
  no-op on `incomplete` / missing status.
- Checkout grants only when `payment_status` is `paid` or `no_payment_required`.
- Resolve profile via escaped `ilike` on `profiles.email`, then update by unique
  `auth_user_id` (no `listUsers` truncation / no LIKE mass-update).

## Validation

```text
cd apps/crm && npx vitest run \
  src/lib/__tests__/billing-store.test.ts \
  src/lib/__tests__/billing-store-pricing-v2.test.ts
# → PASS (incl. incomplete / unpaid / async checkout cases)
```
