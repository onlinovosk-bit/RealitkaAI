# Stripe krok C — plán (read-only audit, 2026-10-16)

> **OPRAVA 2026-10-20 (merané):** zoznam „8 plánových cien `STRIPE_PRICE_V2_*`" nižšie
> **už neplatí**. Kód odvtedy prešiel z pásiem v2 na tiered per-seat v3 a
> `STRIPE_PRICE_V2_*` v `apps/crm/src/` **nie je ani raz**. Povinná je jediná premenná
> **`STRIPE_PRICE_V3_SEAT_MONTHLY`** a tá vo Vercel Production **chýba** → checkout vracia 503.
> Zároveň: `STRIPE_WEBHOOK_SECRET` v produkcii **je** (bod nižšie tvrdil, že chýba).
> Aktuálny rozpis: `docs/reports/2026-10-20-stripe-krok-c-blokator.md`.

Nič sa nezapísalo do Stripe ani do PROD. Zdroje: repo `main` + vetva, Vercel (zoznam premenných z 2026-10-14, len názvy a ciele), Supabase PROD (SELECT), lokálny `vitest`.

## Čo je overené
- **Kód v2 je zapojený.** `POST /api/billing/credits/checkout` (cenník v2) → webhook `/api/billing/webhook` plní `checkout.session.completed` aj `async_payment_succeeded`, pri zlyhanom plnení vracia 500 (Stripe zopakuje), `syncAgencyBillingLifecycle` premieta zrušenie/zmenu miest/zlyhanú platbu. Starý komentár v `pricing-v2.ts` („zatiaľ nie je zapojený") je zastaraný.
- **Testy:** 116 z 116 (pricing-v2, billing-store, billing-lifecycle, credits-billing, starter-pack, billing routes), spustené lokálne.
- **Vercel Production (len prítomnosť premenných):** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `PRICING_V2_ENABLED`, `PRICING_V2_STRIPE_TAX`, osem `STRIPE_PRICE_V2_{START,TEAM,OFFICE,NETWORK}[_YEARLY]`. **Chýbajú** `STRIPE_PRICE_V2_PACK_*`, `STRIPE_PRICE_V2_CREDIT` a legacy seat/cockpit ceny. Balíky sa nepredávajú (režim „len plány" je predvolene zapnutý), takže chýbajú zámerne.
- **PROD DB:** 7 agentúr, 1 má `stripe_customer_id`, 0 má `stripe_subscription_id`, 2 majú `manual_plan`. Žiadna zaplatená Stripe subscription zatiaľ neexistuje.

## Čo NIE je overené (a prečo)
- Hodnoty premenných som nečítal; **neviem, či `PRICING_V2_ENABLED` je `true`**, ani či `price_…` ID existujú v LIVE Stripe, sú aktívne, majú správnu sumu, `tax_behavior=exclusive` a `tax_code`.
- Či je webhook endpoint v Stripe registrovaný na `https://app.revolis.ai/api/billing/webhook` a má udalosti: `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`.
- `docs/STATUS.md` („0 z 10 cien", 2026-09-22) je **zastaraný**: popisuje starú sadu; aktuálny katalóg má 14 cien v2 (`scripts/ops/stripe-v2/revolis-stripe-v2-catalog.json`), z nich pre predaj plánov treba 8.

## Čo treba od foundera (v tomto poradí)
1. Spustiť read-only overenie (restricted key „Prices: Read", kľúč len v premennej prostredia): `bash scripts/ops/stripe-verify-prices.sh` a poslať výstup (bez kľúča). Z neho vyjde, ktorých z 8 plánových cien chýba/je zle.
2. V Stripe Dashboard → Webhooks skontrolovať endpoint a 7 udalostí vyššie; poslať screenshot zoznamu udalostí (bez signing secret).
3. Potvrdiť s účtovníčkou Stripe Tax (registrácia SK, `tax_code` produktov) — platí pre `PRICING_V2_STRIPE_TAX=on`.
4. Povedať, či `PRICING_V2_ENABLED` je vo Verceli Production `true` (alebo otvoriť `https://app.revolis.ai/api/billing/checkout-config` a poslať odpoveď).

## Čo urobím ja po vstupoch
- Vyhodnotím rozdiel voči katalógu, opravím `docs/STATUS.md` a tabuľku Stripe bloku.
- Pripravím testovací nákup v Stripe test mode proti preview (jeden plán, platba → webhook → `agencies.subscription_status`) a overím riadok v PROD až po tvojom GO.

## Riziká
- Zapnutý `PRICING_V2_ENABLED` bez platných cien = checkout vráti 503 „chýbajú Stripe ceny" (bezpečné zlyhanie, nepredá sa).
- Cena `PACK_*`/`CREDIT` sa nesmie pridať do Vercelu, kým je režim „len plány" zámerný.
- Rozpor 1 vs 3 platiace kancelárie v `DEC-20260925-001` (founder rozhodol: platí 1) ešte nie je opravený v memory.
