# Critical bug — public buyer_intents IDOR on /nehnutelnosti (2026-11-22)

Head audited: `origin/main` @ `0437f80d`.

## Bug and impact

`/nehnutelnosti?intentId=` used `createAdminClient()` (service role) to
`select *` from `buyer_intents` by id with **no agency filter**. Service role
bypasses tenant RLS. The personalization banner renders `raw_focus_text`,
city, and budget — cross-tenant personal-data disclosure on a public page.

## Concrete trigger

1. Victim completes `/buyer-onboarding` → redirect (and CRM task `listingUrl`)
   includes `intentId=<uuid>`.
2. UUID leaks via Referer, history, shared link, or logs.
3. Attacker opens `/nehnutelnosti?intentId=<uuid>` for another agency’s intent
   and sees that buyer’s focus text / budget.

Not UUID guessing — exploit is leaked intent IDs under service-role bypass.

## Root cause

Personalization intentionally puts `intentId` (not raw text) in the URL, but
the loader never constrained `leads.agency_id` to the public listing agency.

## Fix

`fetchPublicBuyerIntent` — UUID shape check + `leads!inner(agency_id)` scoped
to the public listing agency.

## Validation

```text
cd apps/crm && npx vitest run \
  src/lib/public-listings/__tests__/fetch-buyer-intent.test.ts
# → 3/3 PASS
```
