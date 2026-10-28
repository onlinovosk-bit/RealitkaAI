# Pricing v3 Price ID po pláne a období

## Nález použitia

- `pricing-v2-contract.ts` definoval pôvodné env názvy `STRIPE_PRICE_V3_SEAT_MONTHLY` a `STRIPE_PRICE_V3_SEAT_YEARLY`, missing-env logiku a verejný `pricingV2.checkoutAvailable`.
- `credits-billing-v2.ts` používal intervalový env názov pri stavbe Stripe line itemu, pri rozpoznaní v2 price ID vo webhookoch a pri kontrole chýbajúcich cien pre konkrétny checkout request.
- `/api/billing/checkout-config` vracia iba názvy chýbajúcich env premenných; hodnoty Price ID sa nikdy neposielajú klientovi.
- `/api/billing/credits/checkout` najprv parsuje `checkoutType: "pricing_v2"`, overí flag, plans-only režim a missing env; Stripe session sa tvorí až potom.

## Ako aplikácia vyberá plán a počet maklérov

- Klient posiela `seats` (starší názov `users` sa ešte prijíma) a voliteľný `interval`.
- `parsePricingV3CheckoutBody` povoľuje celé číslo 1-500.
- `resolvePricingV2Band` odvádza pásmo z počtu maklérov: 1 Start, 2-5 Team, 6-10 Kancelária, 11+ Sieť.
- Checkout line item ponecháva `quantity = počet maklérov`; Stripe Price ID sa vyberá podľa pásma a obdobia.
- Webhook pri plnení predplatného verí primárne Stripe `quantity` na licenčnej položke; metadáta sú záloha.

## Rozhodnutie Stripe modelu

Zvolený model: jeden Stripe Product `Revolis licencia` a viac Price objektov. Dôvod: produkt je tá istá licencia, mení sa iba obchodný variant ceny. Tento model sedí s existujúcim quantity-based checkoutom, reportingom a entitlement logikou. Štyri produkty by duplikovali rovnakú licenciu bez aplikačnej výhody.

## Env zoznam

Nové Price ID:

- `STRIPE_PRICE_V3_START_MONTHLY`
- `STRIPE_PRICE_V3_START_YEARLY`
- `STRIPE_PRICE_V3_TEAM_MONTHLY`
- `STRIPE_PRICE_V3_TEAM_YEARLY`
- `STRIPE_PRICE_V3_KANCELARIA_MONTHLY`
- `STRIPE_PRICE_V3_KANCELARIA_YEARLY`
- `STRIPE_PRICE_V3_SIET_MONTHLY`
- `STRIPE_PRICE_V3_SIET_YEARLY`

Dočasný fallback:

- `STRIPE_PRICE_V3_SEAT_MONTHLY`
- `STRIPE_PRICE_V3_SEAT_YEARLY`

## Overenie

- `node scripts/ci/revolis-verify.mjs plan-lint docs/briefs/plans/2026-10-22-pricing-v3-plan-price-envs.md` → PASS.
- `npx vitest run ...pricing/checkout targeted set...` v `apps/crm` → 237/237 PASS.
- `npx vitest run billing pricing-v2` v `apps/crm` → 26 súborov / 471 testov PASS.
- `npx vitest run tests/verification/stripe-v2-catalog.verification.test.ts` v `apps/crm` → 9/9 PASS.
- `node scripts/ci/revolis-verify.mjs completion --base origin/main --scope "**/*" --criteria /tmp/pricing-v3-criteria.json --run --out /opt/cursor/artifacts/verify-completion` → PASS, 661 related testov + 473 billing testov.
- `npm run typecheck` v `apps/crm` → PASS, baseline ostala 54 typových chýb.
- `npm run lint` v `apps/crm` → PASS.
- `npm run build` v `apps/crm` → PASS.

## Otvorené otázky pre foundera

- Potvrdiť, či sa nové Price objekty majú vytvoriť ručne v Stripe ako jeden Product `Revolis licencia` s 8 Price ID podľa dokumentu.
- Potvrdiť, či fallback `STRIPE_PRICE_V3_SEAT_*` odstránime hneď po nastavení nových env vo Verceli alebo až po prvom úspešnom nákupe.
- Potvrdiť, či granty kreditov 25 / 60 / 120 / 175 ostávajú bez zmeny aj pri novom Team paušáli 65 €.
