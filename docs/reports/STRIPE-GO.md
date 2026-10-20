# STRIPE-GO — checklist pre live predaj (cenník v3)

**Dátum:** 2026-10-19 (cenník v3, GO foundera 2026-10-19). **Prostredie cien:** Vercel projekt `realitka-ai`, len **Production**.
**Tento dokument nezakladá ceny a nemení env.** Live katalóg som v tomto behu
**NEZMERANÉ** (žiaden `sk_live_` / `rk_live_` kľúč, Stripe sa nevolal).

> **Live skript spúšťa iba Andrej (founder) a až po merge PR „Cenník v3“.**
> `scripts/ops/stripe-v2/stripe_live_catalog.py` nikdy nespúšťa agent ani CI. Predvolene je **DRY-RUN**
> (vypíše plán, nepotrebuje kľúč). Zápis vyžaduje naraz `--apply --yes-live --expect-account acct_… --plan-tax-code txcd_…
> --credit-tax-code txcd_… --i-am-the-founder`. Kľúč sa nedáva do chatu ani do argumentu.

Očakávané hodnoty (sumy v centoch bez DPH, tiers, kupón) sú **ZMERANÉ** čítaním
`scripts/ops/stripe-expected-prices.json` a `scripts/ops/stripe-v2/revolis-stripe-v2-catalog.json`
a pinuje ich test voči kódu (`apps/crm/src/lib/pricing-v2.ts`). Hodnota každej premennej je
`price_…` (resp. ID kupónu) z live účtu — do repozitára ani do chatu ju nevkladaj.

## Čo sa vytvára (v3)

- 1 produkt **Revolis licencia** s **2 cenami** `billing_scheme=tiered`, `tiers_mode=graduated`, EUR,
  `tax_behavior=exclusive`, `quantity` = počet maklérov (ročná a mesačná).
- **1 kupón** akcie 9/12 (`STRIPE_COUPON_V3_ANNUAL_PROMO`).
- **6 balíkov kreditov** (mesačné opakované) na samostatnom produkte **Revolis balíky kreditov**.
- **1 cena kreditu** 0,75 € (`one_time`, `quantity` = počet kreditov), produkt **Revolis Kredit (1 ks)**.

Spolu 3 produkty, 9 nových cien, 1 kupón. Legacy ceny (Solo/Team/Office seat, Owner Cockpit, top-upy, štartovací balík)
ostávajú bez zmeny.

## Postup pre Andreja (poradie je záväzné)

0. **Najprv merge** PR „Cenník v3“ (merge robíš ty, nie agent). Skôr nič z nižšie.
1. **Test mode.** `python3 scripts/ops/stripe-v2/stripe_test_catalog.py` (bez argumentov = výpis plánu a offline
   validácia). Zápis do **test** účtu: `--test-create --expect-account acct_… --plan-tax-code txcd_… --credit-tax-code txcd_…`
   s `STRIPE_TEST_SECRET_KEY=sk_test_…` v env. Skript odmietne iný ako `sk_test_` kľúč a livemode odpoveď.
   V test účte prejdi Checkout s `quantity` 1, 3, 6, 11, 21 a over sumy podľa tabuľky nižšie (vrátane kupónu pri ročnej platbe).
2. **Verify (test mode je len ručná kontrola).** `bash scripts/ops/stripe-verify-prices.sh` beží výlučne proti **live**
   (test kľúč odmietne). Pred live zápisom ho spusti raz na zistenie východiskového stavu: očakávaj `MISSING` pri v3
   riadkoch. Offline výpis toho, čo má existovať: `bash scripts/ops/stripe-verify-prices.sh --spec`.
3. **Live — najprv DRY-RUN.** `python3 scripts/ops/stripe-v2/stripe_live_catalog.py` (bez argumentov) vypíše plán.
   `--inspect-account` s `STRIPE_LIVE_SECRET_KEY` v env prečíta len ID účtu a či je live.
4. **Live — zápis.** Až keď plán sedí a daňové kódy potvrdila účtovníčka:
   `python3 scripts/ops/stripe-v2/stripe_live_catalog.py --apply --yes-live --expect-account acct_… --plan-tax-code txcd_… --credit-tax-code txcd_… --i-am-the-founder`.
   Skript je idempotentný (`lookup_key` pre ceny, metadata pre kupón); nič existujúce nemení ani nemaže. Ak niečo
   existuje s inými tiers/parametrami, zastaví sa.
5. **Verify po zápise.** `STRIPE_SECRET_KEY=rk_live_…` (Prices: Read + **Coupons: Read**) a
   `bash scripts/ops/stripe-verify-prices.sh`. Exit 0 = všetky ceny (každý tier `up_to`/`flat_amount`/`unit_amount`,
   interval, mena, `tax_behavior`) aj kupón (`percent_off`, `duration`, `redeem_by`, `applies_to`) sedia so súbormi v repe.
   Výpis „Krok B“ obsahuje riadky `KLUČ=price_…` a `STRIPE_COUPON_V3_ANNUAL_PROMO=…`.
6. **Vercel env.** Projekt `realitka-ai` → Settings → Environment Variables → **Production**: vlož všetky premenné
   z tabuľky nižšie (riadky z kroku 5). Redeploy Production.
7. **Webhook** — endpoint `https://app.revolis.ai/api/billing/webhook`, signing secret ako `STRIPE_WEBHOOK_SECRET`
   v tom istom scope (viď nižšie). Hodnotu neposielaj.
8. **Až teraz flagy, v tomto poradí:**
   1. `PRICING_V2_ENABLED=true` — interná appka a checkout (iba keď sú nastavené **všetky** v3 premenné; inak checkout
      fail-closed `prices_not_configured`).
   2. `PRICING_PUBLIC_ENABLED=true` — **neskôr**, až keď checkout overíš naživo; zapína verejné zobrazenie cien na webe.

`STRIPE_SECRET_KEY` (`sk_live_…`) musí v Production už byť, inak checkout session nevznikne.
Či tam je, je **NEZMERANÉ** v tomto behu.

## Premenné a očakávané sumy (názvy bez hodnôt)

Interval `month`, ak stĺpec nehovorí inak. Jednorazové nemajú interval. Sumy bez DPH.

### Cenník v3 (gate `pricing_v2`, flag `PRICING_V2_ENABLED`)

| Env | Produkt | Suma bez DPH | Typ |
|---|---|---|---|
| `STRIPE_PRICE_V3_SEAT_YEARLY` | Revolis licencia | tiered graduated, tabuľka nižšie | recurring `year` |
| `STRIPE_PRICE_V3_SEAT_MONTHLY` | Revolis licencia | tiered graduated, tabuľka nižšie | recurring `month` |
| `STRIPE_COUPON_V3_ANNUAL_PROMO` | kupón (ID kupónu, nie Price) | −25 %, jedenkrát | coupon |
| `STRIPE_PRICE_V3_PACK_50` | Revolis balíky kreditov | 26,00 € / mesiac | recurring |
| `STRIPE_PRICE_V3_PACK_100` | Revolis balíky kreditov | 51,00 € / mesiac | recurring |
| `STRIPE_PRICE_V3_PACK_150` | Revolis balíky kreditov | 74,00 € / mesiac | recurring |
| `STRIPE_PRICE_V3_PACK_200` | Revolis balíky kreditov | 94,00 € / mesiac | recurring |
| `STRIPE_PRICE_V3_PACK_250` | Revolis balíky kreditov | 114,00 € / mesiac | recurring |
| `STRIPE_PRICE_V3_PACK_300` | Revolis balíky kreditov | 131,00 € / mesiac | recurring |
| `STRIPE_PRICE_V3_CREDIT` | Revolis Kredit (1 ks) | 0,75 € (quantity = počet kreditov) | one_time |

### Tiers licencie (centy bez DPH; `quantity` = počet maklérov)

Pri `graduated` sa `flat_amount` pripočíta **raz**, keď množstvo zasiahne daný tier; `unit_amount` sa násobí počtom kusov v tieri.
Preto 1 = 25 €, 2–5 = 25 + 40 = 65 € a od 6. makléra sa pripočítava cena za kus.

`STRIPE_PRICE_V3_SEAT_YEARLY` (12 × základ):

| tier `up_to` | `flat_amount` | `unit_amount` |
|---|---|---|
| 1 | 30000 | 0 |
| 5 | 48000 | 0 |
| 10 | 0 | 10800 |
| 20 | 0 | 7200 |
| inf | 0 | 6000 |

`STRIPE_PRICE_V3_SEAT_MONTHLY` (základ × 1,2):

| tier `up_to` | `flat_amount` | `unit_amount` |
|---|---|---|
| 1 | 3000 | 0 |
| 5 | 4800 | 0 |
| 10 | 0 | 1080 |
| 20 | 0 | 720 |
| inf | 0 | 600 |

Kontrolné body (bez DPH): n=1 → 25 € základ (ročne 300 €, mesačne 30 €); n=3 a 5 → 65 € (780 € / 78 €); n=6 → 74 € (888 € / 88,80 €);
n=10 → 110 € (1 320 € / 132 €); n=11 → 116 € (1 392 € / 139,20 €); n=20 → 170 € (2 040 € / 204 €); n=21 → 175 € (2 100 € / 210 €);
n=30 → 220 € (2 640 € / 264 €). Test `stripe-expected-prices.verification.test.ts` prepočíta graduated výpočet z JSON tiers
a porovná s `licenseNetCents(n, interval)` pre n = 1…60 (ročne aj mesačne).

### Kupón akcie 9/12

| Pole | Hodnota |
|---|---|
| `percent_off` | 25 |
| `duration` | `once` (iba prvá ročná faktúra) |
| `applies_to.products` | iba produkt **Revolis licencia** (nie balíky ani kredit) |
| `redeem_by` | `2026-12-31T22:59:59Z` = unix `1798757999` (31. 12. 2026 23:59:59 Europe/Bratislava) |

Server ho pridá do Checkout Session cez `discounts:[{coupon}]` **iba** pri `interval=year` a iba pred termínom
(`PRICING_V3_PROMO_UNTIL`); `allow_promotion_codes` je vypnuté. Mesačná platba a balíky kupón nikdy nedostanú.

### Legacy (bez zmeny)

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

**ZMERANÉ:** manifest má 10 legacy + 10 v3 cenových riadkov a 1 kupón (`jq '.prices | length'` = 20, `jq '.coupons | length'` = 1).
Posledný zapísaný live verify 2026-09-22 bol 0/9 (`docs/reports/2026-09-22-stripe-verify-prices.md`) — starý zápis, nie meranie z tohto behu.

## Webhook

`STRIPE_WEBHOOK_SECRET` — hodnota je signing secret endpointu, nie Price ID.

Udalosti, ktoré kód očakáva (zo `docs/STATUS.md` a
`docs/pricing/2026-10-05-pricing-v2-w4-production-gate.md`, **nie** z živého
Stripe dashboardu):

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded` (cenník v2/v3)
- `customer.subscription.created`
- `customer.subscription.updated` (zmena `quantity` v Stripe prepíše počet maklérov a pásmo)
- `customer.subscription.deleted`
- `invoice.paid`
- `invoice.payment_failed`

`/api/billing/checkout-config` vracia len `webhookSecretConfigured: true|false`.
Či je secret v Production nastavený, je **NEZMERANÉ**.

## Čo už robí kód (bez live kľúča)

- Price ID sa číta z env (`program-tier-pricing.ts`, `pricing-v2-contract.ts`).
  Placeholder `price_xxx` neprejde.
- `GET /api/billing/checkout-config` vracia `missingPriceEnvKeys` — len názvy.
- Checkout bez nakonfigurovaných v3 premenných je vypnutý (fail-closed, kód `prices_not_configured`).
- `POST /api/billing/credits/checkout` pri chýbajúcom Price ID vráti 503 a pole `missingPriceEnvKeys` (názvy). Stripe sa nevolá.
- Verejný web nezobrazí žiadnu sumu, kým `PRICING_PUBLIC_ENABLED` nie je zapnuté.

## Otvorené otázky pre foundera

1. **Kredity podľa pásma.** Mesačný grant kancelárie (`monthlyCredits`) ostáva zatiaľ 25 / 60 / 120 / 175 (v3 ho nemení).
   Majú sa kredity viazať na pásmo (1 / 2–5 / 6–10 / 11+) takto, alebo na počet maklérov? Rozhodnutie nie je v tomto PR.
2. **Proration v prvom roku.** Kupón je `duration=once`, takže zľava platí iba na prvú ročnú faktúru. Miesta dokúpené počas prvého roka
   (zmena `quantity` s proration) idú **bez akcie**. Je to v poriadku, alebo má dokúpenie dostať aj 9/12?
3. **Osud legacy v2 env.** `STRIPE_PRICE_V2_*` (4 pásma, 4 ročné, 5 starých balíkov 60–300 a kredit 0,70 €) v Stripe live nikdy neexistovali
   a v3 ich nahrádza. Ostanú v `env.ts` / Vercele ako mŕtve premenné, alebo ich zmažeme (odporúčanie: zmazať po overení v3)?
4. **Daňové kódy.** Pred zápisom treba potvrdené `txcd_…` pre plány a kredity (účtovníčka); skript ich vyžaduje a nevymýšľa.
5. **Coupons: Read.** Verify kľúč musí mať právo čítať kupóny (restricted key: Coupons → Read), inak verify skončí chybou Stripe.
