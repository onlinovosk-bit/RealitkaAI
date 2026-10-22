## Rozsah
- Migrovat CRM pricing v3 checkout z jednej licencnej Stripe Price ID pre interval na 8 Price ID podla pasma a fakturacneho obdobia.
- Zachovat stare `STRIPE_PRICE_V3_SEAT_MONTHLY` a `STRIPE_PRICE_V3_SEAT_YEARLY` ako docasny fallback, bez logovania hodnot.
- Aktualizovat cisty cenovy vypocet pre zadane hranice a pridat jednotkove testy pre 1, 5, 6, 10, 11, 20, 21, 30 a 31 maklerov v oboch obdobiach.
- Upravit dokumentaciu env premennych a offline Stripe manifest/verifikacne testy bez volania Stripe API.

## Znovupoužitie
- Rozsirit existujuce `apps/crm/src/lib/pricing-v2.ts`, `pricing-v2-contract.ts` a `credits-billing-v2.ts`.
- Pouzit existujuce route testy pre `/api/billing/checkout-config` a `/api/billing/credits/checkout`.
- Zachovat existujuci model: pocet maklerov sa parsuje z checkout requestu a pasmo sa odvodi cez `resolvePricingV2Band`.

## Akceptačné kritériá
- `npx vitest run src/lib/__tests__/pricing-v2-contract.test.ts src/lib/__tests__/credits-billing-v2.test.ts src/app/api/billing/checkout-config/__tests__/route.test.ts src/app/api/billing/credits/checkout/__tests__/route.test.ts tests/verification/stripe-expected-prices.verification.test.ts` v `apps/crm` prejde.
- Testy explicitne pokryju ceny pre 1, 5, 6, 10, 11, 20, 21, 30 a 31 maklerov pre `month` aj `year`.
- Chybajuca nova Price ID vrati len nazov env pre konkretne pasmo/obdobie a Stripe checkout sa nevytvori.
- Stare generic env pre interval stale funguju ako fallback, aby migracia nespadla naraz.
- Repo neobsahuje novu verejnu marketingovu publikaciu cien.

## Riziká
- Nespravne mapovanie fallbacku by mohlo zakryt chybajucu novu konfiguraciu; testy musia pomenovat prioritu novej env a fallback.
- Ak Stripe ceny budu vytvorene inym billing modelom nez manifest, offline verify to musi zachytit.
- UI ma globalny `checkoutAvailable`; najbezpecnejsi rez je fail-closed pri chybajucej mesacnej cene ktorehokolvek pasma.

## Brány
- FOUNDER GO je potrebne na merge, produkcny deploy, zapis Vercel env, Stripe objekt alebo akekolvek live/test zmeny.
- V tejto ulohe su povolene iba zmeny kodu, testy, dokumentacia, commit, push a draft PR.

## Kroky
1. Zmapovat vsetky citania starych env a checkoutAvailable logiku.
2. Zaviest zoznam pasiem a env nazvov `STRIPE_PRICE_V3_{START,TEAM,KANCELARIA,SIET}_{MONTHLY,YEARLY}`.
3. Upravit missing-env kontrolu, price role resolver a checkout line item builder.
4. Prepisat cisty kalkulator cien na zadane hranice a pridat hranicne testy.
5. Aktualizovat `.env.example`, env schema, Stripe manifest/verifikacne testy a report.
6. Spustit relevantne testy a completion gate, potom commit/push/draft PR.

## Mimo rozsahu
- Ziadne Stripe API volania, vytvaranie produktov/cien/kodov ani zapis do live/test prostredia.
- Ziadny merge, deploy, Vercel env zapis ani produkcna zmena.
- Ziadne ceny na marketing webe.
