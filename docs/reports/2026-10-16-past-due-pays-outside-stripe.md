# past_due + leftover plan → false paysOutsideStripe

**Dátum:** 2026-10-16  
**Závažnosť:** CRITICAL (paywall / access correctness)  
**Zdroj:** regression z #854 (`agencyPaysOutsideStripe`)

## Bug a dopad

Keď agentúra má v DB `subscription_status = past_due` a stále `plan` / `account_tier` platené (billing-lifecycle pri `payment_failed` plán zámerne necháva), `agencyPaysOutsideStripe()` vrátilo `true`, lebo `past_due` nebol v `ENDED_SUBSCRIPTION_STATES`.

Ak Stripe lookup pre aktuálnu session vráti „bez predplatného“ (`hasSubscription: false`) — typicky billing e-mail ≠ login e-mail, alebo zmena e-mailu po signup — `trialGraceFrom` berie vetvu `paysOutsideStripe` a vráti **`active`** (plný zápis), hoci agentúra je v skutočnosti `past_due`.

Billing owner s nájdeným Stripe customerom ostáva na správnej vetve `past_due` → grace/blocked.

## Root cause

`ENDED_SUBSCRIPTION_STATES` obsahoval `canceled`, `unpaid`, `incomplete_expired`, ale nie `past_due`. `isPayingAgency()` pri leftover `plan` vráti `true`.

## Fix

Pridané `past_due` do `ENDED_SUBSCRIPTION_STATES` — rovnaký fail-closed vzor ako pri `unpaid`.

## Validácia

```bash
cd apps/crm && npx vitest run src/lib/__tests__/trial-no-card.test.ts
```

Nový test: `past_due` + leftover plan → `paysOutsideStripe=false` → po triali `limited` / `read_only`.
