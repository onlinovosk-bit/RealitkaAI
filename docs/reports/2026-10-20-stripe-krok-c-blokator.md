# Stripe krok C — prečo sa dnes nedá kúpiť nič, aj keby bolo všetko ostatné zapnuté

**Dátum:** 2026-10-20 · **GO:** founder „GO STRIPE-C" · **Nič sa nezapísalo do Stripe ani do PROD.**
Zdroje merané v tomto behu: Vercel API (názvy a ciele premenných, **hodnoty som nečítal**),
Supabase PROD (SELECT), `main` v repozitári, lokálny `vitest`.

## Záver najskôr

V produkcii chýba **`STRIPE_PRICE_V3_SEAT_MONTHLY`** — jediná povinná cena, bez ktorej
`/api/billing/checkout` vracia **503**. Osem premenných `STRIPE_PRICE_V2_*`, ktoré v produkcii
sú, **kód už vôbec nečíta**: `grep -rn "STRIPE_PRICE_V2_" apps/crm/src/` nevráti ani jeden
výskyt mimo testov. Cenník sa v kóde posunul z pásiem v2 na tiered per-seat v3, premenné vo
Verceli ostali pri v2.

**Dôsledok: nezáleží na tom, či je `PRICING_V2_ENABLED` zapnuté.** Aj keby bolo, checkout
spadne na chýbajúcu cenu. Preto som hodnotu tej premennej ani nepotreboval čítať —
a nečítal som ju.

Toto je presne tá medzera, ktorú opisuje preflight audit z tohto rána: kód je zmergovaný,
otestovaný a nasadený, ale v produkcii nemá účinok, lebo konfigurácia zaostala za kódom.

## Čo kód skutočne vyžaduje (merané v `main`)

`apps/crm/src/lib/pricing-v2-contract.ts`:

| premenná | povinná? | čo bez nej |
|---|---|---|
| `STRIPE_PRICE_V3_SEAT_MONTHLY` | **áno, vždy** | `missingPricingV2PriceEnvKeys()` ju vráti → `checkoutAvailable: false` → checkout **503** |
| `STRIPE_PRICE_V3_SEAT_YEARLY` | len pre ročné | `yearlyAvailable: false`; mesačný predaj **neblokuje** |
| `STRIPE_COUPON_V3_ANNUAL_PROMO` | len pre akciu 9/12 | ročné sa neponúkne, kým akcia beží |
| `STRIPE_PRICE_V3_PACK_{50..300}`, `STRIPE_PRICE_V3_CREDIT` | **nie** | režim „len plány" je predvolene zapnutý (fail-closed), balíky sa nepredávajú zámerne |

Katalóg `scripts/ops/stripe-v2/revolis-stripe-v2-catalog.json` je s kódom v zhode — má presne
tieto `env_key` (9 cien + 1 kupón, všetky `v3`).

## Čo je vo Vercel Production (merané dnes, len názvy a ciele)

| premenná | target |
|---|---|
| `STRIPE_SECRET_KEY` | production |
| `STRIPE_WEBHOOK_SECRET` | production |
| `PRICING_V2_ENABLED` | production |
| `PRICING_V2_STRIPE_TAX` | preview, production |
| `STRIPE_PRICE_V2_{START,TEAM,OFFICE,NETWORK}` + `_YEARLY` (8×) | production |
| `STRIPE_PRICE_MARKET_VISION`, `_ONBOARDING`, `_PRO`, `_PROTOCOL_AUTH`, `_STARTER` (legacy) | production |

**Žiadna `STRIPE_PRICE_V3_*` tam nie je.** Z 96 premenných projektu je 17 Stripe/pricing a ani
jedna nie je tá, ktorú kód hľadá.

Dve veci z predošlého plánu tým padajú:
- `STRIPE_WEBHOOK_SECRET` **nechýba** (STATUS.md tvrdil opak — opravené).
- „8 plánových cien `STRIPE_PRICE_V2_*`" z plánu z 2026-10-16 už **nie je správny zoznam**;
  kód odvtedy prešiel na v3. Plán je opravený v tom istom PR.

## Stav platieb v PROD (merané)

| | |
|---|---|
| agentúr | **7** |
| so `stripe_customer_id` | 1 |
| so `stripe_subscription_id` | **0** |
| so `subscription_status = 'active'` | 1 — ale **bez** `stripe_subscription_id`, s `manual_plan = market_vision` |
| s `manual_plan` | 2 (`market_vision`, `protocol_authority`) |

Čiže **cez Stripe neplatí nikto**. Jediné „active" je ručne nastavené, nie zaplatené.
Tým sa zároveň uzatvára spor z `DEC-20260925-001` („1 vs 3 platiace kancelárie"): cez Stripe
je to **0**; ak niekto platí, je to mimo Stripe (faktúra/ručne) a v `agencies` to ako Stripe
predplatné nevyzerá.

## Kód sám je v poriadku

`npx vitest run` na `pricing-v2`, `pricing-v2-contract`, `credits-billing-v2` a billing routes:
**69 z 69 prešlo** (5,62 s, v tomto behu). Blokátor je konfigurácia, nie kód — preto sa to dá
odblokovať bez nasadenia.

## Čo musí spraviť founder (a prečo to nemôžem ja)

Na vytvorenie cien v LIVE Stripe treba live secret key s právom zápisu. Ten v tejto session nie
je a **nemá byť** — vytvorenie ceny je nezvratný zápis do fakturačného systému.

1. V Stripe (LIVE) vytvoriť podľa katalógu minimálne **licenciu mesačne**
   (`lookup_key = revolis_v3_licence_month`, tiered graduated podľa `V3_SEAT_TIERS`,
   `tax_behavior = exclusive`), ideálne aj ročnú a kupón 9/12.
2. Vo Vercel Production pridať `STRIPE_PRICE_V3_SEAT_MONTHLY` = to `price_…` ID
   (a `STRIPE_PRICE_V3_SEAT_YEARLY`, `STRIPE_COUPON_V3_ANNUAL_PROMO`, ak sa robí aj ročné).
   **`STRIPE_PRICE_V3_PACK_*` ani `STRIPE_PRICE_V3_CREDIT` nepridávať** — režim „len plány"
   je zámerný, kým nie je meraný náklad na kredit.
3. Redeploy (env premenné sa načítajú až novým buildom).
4. Poslať mi výstup `GET /api/billing/checkout-config` (vracia len booleany a NÁZVY premenných,
   nikdy hodnoty) — z tejto session sa naň nedostanem, sieťová politika kontajnera neprepustí
   ani `app.revolis.ai`, ani `realitka-ai.vercel.app` (`ENOTFOUND`).

Čakám na `pricingV2.checkoutAvailable: true`. Potom overím webhook a pripravím testovací nákup.

## Čo zostáva nezmerané

- Či `PRICING_V2_ENABLED` má hodnotu `true` — **nečítal som ju** a pre tento záver nebola
  potrebná (viď vyššie).
- Či sú legacy `price_…` v Stripe ešte aktívne a s akými sumami — potrebuje live kľúč.
- Či je webhook endpoint v Stripe zaregistrovaný na `https://app.revolis.ai/api/billing/webhook`
  a má 7 potrebných udalostí. `STRIPE_WEBHOOK_SECRET` existuje, čo naznačuje, že endpoint
  vznikol — ale „premenná existuje" nie je dôkaz, že endpoint je živý a má správne udalosti.
