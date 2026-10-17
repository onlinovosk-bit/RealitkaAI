# STRIPE-GO — checklist pre live predaj

**Dátum:** 2026-10-16. **Prostredie cien:** Vercel projekt `realitka-ai`, len **Production**.
**Tento dokument nezakladá ceny a nemení env.** Live katalóg som v tomto behu
**NEZMERANÉ** (žiaden `sk_live_` / `rk_live_` kľúč, Stripe sa nevolal).

Sumy nižšie sú **ZMERANÉ** čítaním `scripts/ops/stripe-expected-prices.json`
(centy, `tax_behavior=exclusive`, sumy bez DPH). Hodnota každej premennej je
`price_…` z live účtu — do repozitára ani do chatu ju nevkladaj.

## Čo máš kliknúť

1. V Stripe **live** založ ceny z tabuľky (alebo spusti sám
   `python3 scripts/ops/stripe-v2/stripe_live_catalog.py --apply --yes-live`
   podľa `docs/runbooks/2026-10-15-trial-a-ceny-live.md`). Kľúč agenta nedávaj.
2. Vercel → projekt `realitka-ai` → Settings → Environment Variables → **Production**.
   Pre každý riadok tabuľky vlož príslušné `price_…`. Redeploy Production.
3. Stripe → Webhooks → endpoint `https://app.revolis.ai/api/billing/webhook`.
   Signing secret (`whsec_…`) ulož ako `STRIPE_WEBHOOK_SECRET` v tom istom
   Production scope. Do chatu ho neposielaj.
4. `PRICING_V2_ENABLED=true` zapni **až keď sú nastavené všetky** `STRIPE_PRICE_V2_*`
   z tabuľky. Skôr nie: cenník v UI by nemal funkčné tlačidlo.
5. Overenie bez zápisu: `bash scripts/ops/stripe-verify-prices.sh` s kľúčom len
   v env (Prices: Read stačí). Výstup bez kľúča pošli do chatu. Exit 0 = všetky
   ceny sedia so súbormi v repe.

`STRIPE_SECRET_KEY` (`sk_live_…`) musí v Production už byť, inak checkout session
nevznikne. Hodnotu neposielaj. Či tam je, je **NEZMERANÉ** v tomto behu.

## Premenné a očakávané sumy

Interval `month`, ak stĺpec nehovorí inak. Jednorazové nemajú interval.

| Env | Produkt | Suma bez DPH | Typ | Brána |
|---|---|---|---|---|
| `STRIPE_PRICE_SOLO_SEAT` | Solo Seat | 79,00 € / mesiac | recurring | seat |
| `STRIPE_PRICE_TEAM_SEAT` | Team Seat | 71,00 € / mesiac | recurring | seat |
| `STRIPE_PRICE_OFFICE_SEAT` | Office Seat | 63,00 € / mesiac | recurring | seat |
| `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` | Owner Cockpit (founder) | 249,00 € / mesiac | recurring | cockpit |
| `STRIPE_PRICE_OWNER_COCKPIT` | Owner Cockpit | 349,00 € / mesiac | recurring | cockpit |
| `STRIPE_PRICE_CREDITS_START` | Kredity Štart (50) | 49,00 € | one_time | topup |
| `STRIPE_PRICE_CREDITS_RAST` | Kredity Rast (150) | 129,00 € | one_time | topup |
| `STRIPE_PRICE_CREDITS_PRO` | Kredity Pro (500) | 379,00 € | one_time | topup |
| `STRIPE_PRICE_CREDITS_MEGA` | Kredity Mega (1500) | 999,00 € | one_time | topup |
| `STRIPE_PRICE_STARTER_PACK` | Maklérsky štartovací balík | 47,00 € | one_time | starter_pack |
| `STRIPE_PRICE_V2_START` | Revolis Start | 25,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_TEAM` | Revolis Team | 60,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_OFFICE` | Revolis Kancelária | 149,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_NETWORK` | Revolis Sieť | 349,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_START_YEARLY` | Revolis Start | 300,00 € / rok | recurring year | pricing_v2 |
| `STRIPE_PRICE_V2_TEAM_YEARLY` | Revolis Team | 720,00 € / rok | recurring year | pricing_v2 |
| `STRIPE_PRICE_V2_OFFICE_YEARLY` | Revolis Kancelária | 1 788,00 € / rok | recurring year | pricing_v2 |
| `STRIPE_PRICE_V2_NETWORK_YEARLY` | Revolis Sieť | 4 188,00 € / rok | recurring year | pricing_v2 |
| `STRIPE_PRICE_V2_PACK_60` | Balík 60 kreditov | 34,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_PACK_120` | Balík 120 kreditov | 62,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_PACK_180` | Balík 180 kreditov | 86,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_PACK_240` | Balík 240 kreditov | 108,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_PACK_300` | Balík 300 kreditov | 129,00 € / mesiac | recurring | pricing_v2 |
| `STRIPE_PRICE_V2_CREDIT` | Kredit (1 ks) | 0,70 € | one_time | pricing_v2 |

**ZMERANÉ:** 24 riadkov v manifeste (pole `prices`, súčet `jq '.prices | length'`).
Posledný zapísaný live verify 2026-09-22 bol 0/9
(`docs/reports/2026-09-22-stripe-verify-prices.md`) — to je starý zápis, nie
meranie z tohto behu.

## Webhook

`STRIPE_WEBHOOK_SECRET` — hodnota je signing secret endpointu, nie Price ID.

Udalosti, ktoré kód očakáva (zo `docs/STATUS.md` a
`docs/pricing/2026-10-05-pricing-v2-w4-production-gate.md`, **nie** z živého
Stripe dashboardu):

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded` (cenník v2)
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

`/api/billing/checkout-config` vracia len `webhookSecretConfigured: true|false`.
Či je secret v Production nastavený, je **NEZMERANÉ**.

## Čo už robí kód (bez live kľúča)

- Price ID sa číta z env (`program-tier-pricing.ts`, `pricing-v2-contract.ts`).
  Placeholder `price_xxx` neprejde.
- `GET /api/billing/checkout-config` vracia `missingPriceEnvKeys.seat` a
  `.topup` — len názvy.
- `/upgrade` pri vypnutom cenníku v2 a nedostupnom checkoute vypíše tieto názvy.
  Reťazec, ktorý nie je `STRIPE_PRICE_*`, sa na stránku nedostane.
- `POST /api/billing/credits/checkout` pri chýbajúcom seat alebo top-up Price ID
  vráti 503 a pole `missingPriceEnvKeys` (názvy). Stripe sa nevolá.
- Cenník v2 naďalej zákazníkovi názvy env neukazuje (existujúci kontrakt UI).
  Chýbajúce v2 názvy sú v odpovedi `pricingV2.missingPriceEnvKeys`.
