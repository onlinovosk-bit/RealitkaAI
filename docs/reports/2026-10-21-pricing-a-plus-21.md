# Cenník A+ od 21. makléra (2026-10-21)

Variant A+, ktorý vybral Andrej. Graduated tarify, daň Exclusive. Draft, nie Live.

Pásma 1–20 sú tie, ktoré sú na `main` po #908 (GO B): 1 = základ 25 €, 2 makléri = základ 50 €, 3–5 = základ 65 €, potom +9 € a +6 € do 20. Tabuľka v zadaní „2–5: flat 48 / 480“ je staršie zloženie toho istého súčtu od 5. makléra (30+48 = 18+30+30). Skok 1→2 sa nevracia. Od 5. makléra sú súčty zhodné, preto kontrolné body 30 / 50 / 100 sedia aj na #908.

## Čo je v kóde

Zdroj fakturovanej sumy je `PRICING_V3_SEAT_TIERS` v `apps/crm/src/lib/pricing-v2.ts`. `licenseNetCents` ju počíta rovnako ako Stripe graduated (flat raz pri vstupe do tieru, unit × kusy v tieri).

Mesačne (`revolis_v3_licence_month`), centy bez DPH: 1 flat 3000 · 2 flat 3000 · 3–5 flat 1800 · 6–10 unit 1080 · 11–20 unit 720 · 21–30 unit 460 · 31–50 unit 480 · 51+ unit 360.

Ročne (`revolis_v3_licence_year`): 1 flat 30000 · 2 flat 30000 · 3–5 flat 18000 · 6–10 unit 10800 · 11–20 unit 7200 · 21–30 flat 3 + unit 5333 · 31–50 unit 4800 · 51+ unit 3600.

Kupón bez zmeny: 25 %, `duration=once`, len produkt Revolis licencia, `redeem_by` 1798757999 (2026-12-31T22:59:59Z). `catalog_version` je `revolis_v3_2026_10_21`. `lookup_key` sa nemení.

Pri 1–20 ostáva mesačná = základ × 1,2 a ročná = 12 × základ, akcia = 9 × základ. Od 21. ročná suma nie je deliteľná 12 a nie je 10× mesačná. `annualPromoNetCents` je ročná suma mínus `Math.round(ročná × 25 / 100)`.

## Kontrolné body (lokálny výpočet, centy)

| n | mesačne | ročne pred kupónom | ročne po kupóne |
|---|---:|---:|---:|
| 30 | 25000 (250,00 €) | 257333 (2 573,33 €) | 193000 (1 930,00 €) |
| 50 | 34600 (346,00 €) | 353333 (3 533,33 €) | — |
| 100 | 52600 (526,00 €) | 533333 (5 333,33 €) | — |

30 ročne: 30000 + 48000 + 5×10800 + 10×7200 + 3 + 10×5333 = 257333. Zľava `round(64333,25)` = 64333. Zostatok 193000.

## AIRAmax

Test v `pricing-v2.test.ts` berie cenník airamax.com z 21. 10. 2026 takto: 1 = 29 €, 2–5 = 69 €, +9 € pri 6–10, +6 € pri 11–25, +4 € pri 26–50, +3 € od 51, a to ako základ pri ročnej fakturácii; mesačná platba bez záväzku = základ × 1,2. Pre n = 1…200 platí Revolis mesačne < AIRAmax mesačne a Revolis ročne < AIRAmax ročne, bez kupónu. Test prešiel.

## Čo sa nespustilo

Brána pred Live neprešla, lebo sa nespustila.

- V prostredí agenta chýbajú `STRIPE_TEST_SECRET_KEY`, `STRIPE_SECRET_KEY` aj `STRIPE_LIVE_SECRET_KEY`.
- `apps/crm/.env.local` má `STRIPE_SECRET_KEY` s predponou `sk_test_`, dĺžka 29 znakov a slovo placeholder. Nie je to použiteľný kľúč. Hodnota sa nikam nevypisovala.
- Stripe MCP je `needsAuth`, nástroje prázdne. `mcp_auth` v katalógu nie je.
- `POST /v1/invoices/create_preview` sa nevolal. Stripe nedostal flat 0,03. Suma 1 930,00 € nie je potvrdená faktúrou.

Checkout posiela do Stripe `price` + `quantity`. Suma na faktúre vznikne z Price objektu, nie z TypeScriptu. Kým v TEST/LIVE neexistuje nová cena a env neukazuje na ňu, obrazovka a Stripe sa rozídu. `stripe_live_catalog.py --apply` sa nespustil (iba DRY-RUN, text „Nic sa neposlalo do Stripe“).

Web a VOP sa nemenili. Merge, Vercel nastavenia a PROD sa nerobili.

## Lokálny dôkaz

Vetva je nad `a04bc5eb` (#908). `vitest` v `apps/crm`: 5 súborov, 161 testov, všetky prešli (pricing-v2, pricing-v2-screens, stripe-expected-prices, stripe-v2-catalog, stripe-live-catalog).

`python3 scripts/ops/stripe-v2/stripe_test_catalog.py` skončil 0 a vypísal ročný tier `do 30: flat 0.03 + 53.33/ks` a riadok `30 | 250.00 | 2573.33`.

`python3 scripts/ops/stripe-v2/stripe_live_catalog.py` bez argumentov je DRY-RUN.
