# CHECKOUT-ENV-01 — read-only balík pre foundera

**Dátum:** 2026-10-15  
**Úloha po Cost Governor v1.** Žiadne Stripe Price ID som nevytvoril. Produkčný env som nemenil a dnes som ho ani nečítal.

## Čo je dnes fakt v repe

1. Seat checkout v kóde stále stojí na troch kľúčoch. `areSeatCheckoutPricesConfigured()` v `apps/crm/src/lib/program-tier-pricing.ts` vyžaduje `STRIPE_PRICE_SOLO_SEAT`, `STRIPE_PRICE_TEAM_SEAT`, `STRIPE_PRICE_OFFICE_SEAT`. `/api/billing/credits/checkout` bez nich vráti null a checkout nespustí.
2. V2 checkout je druhá brána. `apps/crm/src/app/api/billing/checkout-config/route.ts` skladá `pricingV2.checkoutAvailable` z chýbajúcich `STRIPE_PRICE_V2_*`. Test „flag on, prices missing“ čaká `checkoutAvailable: false`.
3. Posledný live výpis Stripe v repe je `docs/reports/2026-09-22-stripe-verify-prices.md`: **0/9 resolved**. To je stav z 22. 9. 2026, nie dnešný účet.
4. `docs/pricing/2026-10-05-stripe-v2-priprava.md` (aktualizácia 13. 10. 2026) hovorí, že katalóg 10 v2 cien je príprava a **nie je potvrdenie, že ceny existujú**. W4 je NOT READY. Skript `--test-create` proti účtu v tom dokumente nebežal.
5. `docs/architecture/2026-10-05-mega-poplach-airamax-roadmap.md` drží konflikt: `DEC-20260924-001` (199 € / kancelária, „Stripe Products/Prices sa nevytvárajú“) verzus starý seat model, ktorý kód ešte stráži. Ako platia tri kancelárie, dokument označuje ako UNVERIFIED.
6. `docs/STATUS.md` stále dáva predaju 0 % a ako prvý krok foundera Stripe krok C. To je zápis z októbra, nie dnešný dump Vercelu.

## Čo nie je známe

- Či na live Stripe účte medzitým pribudli v2 alebo seat ceny. Dnes som Stripe API nevolal.
- Či sú `STRIPE_PRICE_V2_*` alebo seat kľúče vo Vercel Production. Dnes som Vercel env nečítal.
- Či je `STRIPE_WEBHOOK_SECRET` a endpoint `/api/billing/webhook` nastavený. V repe na to dôkaz z dneška nie je.

Kým toto nie sú čerstvé výpisy, checkout **nie je** PRODUCTION-VERIFIED a CHECKOUT-ENV-01 **nie je** zatvorený.

## Rozhodnutie, ktoré treba od foundera

Jedna voľba. Ďalší kód bez nej len rozmnoží cenníky.

| Voľba | Čo znamená | Čo agent nesmie |
|---|---|---|
| A. Fakturácia, checkout zostane zatvorený | Žiadne nové Price ID. UI má ďalej hovoriť, že samoobslužná platba nie je zapnutá | nevymýšľať Price ID „aby tlačidlo zmizlo“ |
| B. Zapnúť v2 katalóg | Človek vytvorí ceny podľa `docs/pricing/2026-10-05-stripe-v2-priprava.md` a potom read-only overí účet | agent nespúšťa `--test-create` na live kľúč a nezapisuje env |
| C. Najprv znova odmerať | Restricted live kľúč len na Prices: Read, `bash scripts/ops/stripe-verify-prices.sh`, výstup do nového reportu | kľúč nepatri do chatu, do argumentu ani do gitu |

**Odporúčanie (2026-10-15, agent):** najprv **C**. Ak nový read-only výpis stále neukáže seat ani v2 Price ID, zvoliť **A** a samoobslužný checkout nechať zatvorený. **B** až keď founder pomenuje v2 ako predávaný cenník a je tu konkrétny klient, ktorý dnes zaplatí kartou. Septemberový 0/9 a októbrový v2 manifest sú dva rôzne kľúče. Seat trojicu podľa starého kitu nezakladať.

## Checklist, keď padne voľba B

Toto je skrátený odkaz na existujúci postup, nie nový cenník. Sumy neopakujem, aby sa tu nerozišli s `docs/pricing/2026-10-05-stripe-v2-priprava.md`.

1. Spustiť `bash scripts/ops/stripe-verify-prices.sh --spec` na aktuálnom `main`. Je to výpis, nie zápis do Stripe.
2. V Stripe Dashboarde založiť len chýbajúce položky z toho výpisu. Staré ceny nemazať.
3. Znova `bash scripts/ops/stripe-verify-prices.sh` s restricted kľúčom na čítanie. Výsledok uložiť ako nový `docs/reports/YYYY-MM-DD-stripe-verify-prices.md`.
4. Ručne doplniť `tax_behavior` a tax code. Skript ich dnes nekontroluje (viď ten istý v2 dokument).
5. Env kľúče zapísať do Vercelu človek. Samostatné GO. Potom prihlásený checkout smoke.
6. Reality Smolko zmluvu 199 € nemigrovať automaticky. To isté hovorí v2 dokument.

Kým kroky 3 a 5 nemajú čerstvý výpis, stav ostáva: **checkout v kóde zatvorený, produkcia cien neoverená.**
