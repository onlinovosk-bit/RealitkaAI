# PLATBY-E2E: implementácia

Kontrakt a audit sú v PR #806 (`docs/reports/2026-10-02-platby-e2e-audit-a-kontrakt.md`). Tento dokument opisuje, čo sa implementovalo a v čom sa kontrakt zmenil.

- `apps/crm/src/lib/billing-lifecycle.ts` (nový): `syncAgencyBillingLifecycle(event)`, volaná z `api/billing/webhook/route.ts` pred starou cestou. Reaguje na `customer.subscription.updated/deleted`, `invoice.paid`, `invoice.payment_failed`; kanceláriu nájde podľa `stripe_subscription_id` (fallback `stripe_customer_id`).
- **Odchýlka od kontraktu (lepšia):** namiesto „ochrany poradia" cez `billing_updated_at` sa stav berie z `subscriptions.retrieve`, nie z udalosti. Poradie a opakovanie udalostí tak nerozhodujú; `billing_updated_at` (čas spracovania) na porovnanie udalostí nesedí.
- Stavy: `canceled`, `unpaid`, `incomplete_expired` odoberú plán (`account_tier='free'`, cockpit vypnutý); `past_due` iba uloží stav (Stripe ešte platbu opakuje, plán ostáva). Seat položka zo Stripe nastaví `seats` a tier podľa balíka.
- Staré zrušené predplatné toho istého zákazníka neodoberie plán kancelárii, ktorej platí iné. Neznáme predplatné nič nemení.
- Chyba zápisu alebo nedostupný Stripe vráti 500, Stripe udalosť zopakuje. Zmazané predplatné, ktoré Stripe už nevydá (`resource_missing`), sa berie z udalosti.
- `STRIPE_WEBHOOK_SECRET` je v `DEGRADED_WITHOUT` (hlási ho `[env] degraded` aj `/system`); `/api/billing/checkout-config` vracia `webhookSecretConfigured` (len boolean).
- Dôkaz: `src/lib/__tests__/billing-lifecycle.test.ts` (15 testov cez skutočný route handler), `env-validate.test.ts` upravený. Mutation proof 9/9 (bez odobratia plánu, stav z udalosti, bez ochrany cudzieho predplatného, polykanie chyby, bez záznamu v `DEGRADED_WITHOUT`, ignorované miesta, `past_due` odoberá, únik hodnoty secretu, vynechané volanie). `prepush-gate`: PASS.
- **Nezmenené, zámerne:** stará cesta `planKey` (F3), logika triálu, ceny. Stav v PROD (trigger, endpoint v Stripe, secret) ostáva UNVERIFIED.

## Čo musí urobiť founder (UNVERIFIED, overí len on)
1. Stripe → Webhooks: endpoint `https://<produkčná doména>/api/billing/webhook` s udalosťami `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`.
2. `STRIPE_WEBHOOK_SECRET` (`whsec_…`) vo Vercel production a redeploy. Hodnotu nikomu neposielať.
3. Stripe krok C (ceny), potom smoke nákup a zrušenie. Overenie: `/api/billing/checkout-config` hlási `webhookSecretConfigured: true` a prázdne `missingPriceEnvKeys`.
