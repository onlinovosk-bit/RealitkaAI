# Revolis v2 — podklady pre Stripe podľa PR #822

**Aktualizácia 6. 10. 2026:** zahrnuté kredity plánov sú **20 / 50 / 100 / 150** (rozhodnutie foundera, `docs/pricing/2026-10-06-pricing-v2-credits-20-50-100-150.md`); ceny, balíky a kredit sa nezmenili. Katalóg `scripts/ops/stripe-v2/revolis-stripe-v2-catalog.json` má `catalog_version` `revolis_v2_2026_10_06` a drift voči kódu stráži test `apps/crm/tests/verification/stripe-v2-catalog.verification.test.ts`. Súbory sú v repozitári v `scripts/ops/stripe-v2/` (testovací skript spúšťať odtiaľ).

**Pôvodný referenčný stav:** 5. 10. 2026, PR #822 (zlúčený), commit `3bb4233fcccb317414aa9e1ddc7d7039f115e5cc`, W4 = **NOT READY**. Tento podklad je prípravou katalógu, nie potvrdením vytvorenia cien ani povolením predaja. Ak sa PR zmení, znovu porovnať manifest s HEAD. Zdroj pravdy: `apps/crm/src/lib/pricing-v2.ts`, `pricing-v2-contract.ts` a `scripts/ops/stripe-expected-prices.json` na uvedenom commite.

## Oprava oproti skoršiemu návrhu

Predošlý podklad v tejto konverzácii mal 11 cien a balíky 50/100/150/200/250/300. **Nepoužiť ho.** Kód a Stripe manifest v PR #822 definujú **10 nových v2 cien**: štyri plány, päť mesačných balíkov 60/120/180/240/300 a jeden jednorazový kredit. Tento súbor, vedľajší JSON a testovací skript už používajú tieto čísla aj presné názvy env kľúčov. Staré Stripe produkty/ceny ostávajú zachované.

## Vytvoriť 10 nových produktov a cien

Všetky sumy sú **bez DPH**, mena `eur`, Stripe `unit_amount` v eurocentoch, `billing_scheme=per_unit`, `tax_behavior=exclusive`. Pri mesačných položkách `recurring.interval=month`, `interval_count=1`, licencované používanie a pri checkoute `quantity=1`. Kredit za 0,70 € je one-time a `quantity=počet kreditov`. Na jednom produkte jedna príslušná cena a `lookup_key` z [JSON katalógu](revolis-stripe-v2-catalog.json). Raz nastavený režim `exclusive` na Stripe Price nemožno zmeniť na `inclusive`; nová suma potrebuje nové Price ID. [Stripe Price API](https://docs.stripe.com/api/prices/create)

| Produkt presne podľa manifestu | Env kľúč presne podľa kódu | Bez DPH | Príklad s 23 % | Centy | Kredity |
|---|---|---:|---:|---:|---:|
| Revolis v2 Start | `STRIPE_PRICE_V2_START` | 25,00 € | 30,75 € | 2500 | 20/mesiac |
| Revolis v2 Team | `STRIPE_PRICE_V2_TEAM` | 60,00 € | 73,80 € | 6000 | 50/mesiac |
| Revolis v2 Kancelária | `STRIPE_PRICE_V2_OFFICE` | 149,00 € | 183,27 € | 14900 | 100/mesiac |
| Revolis v2 Sieť | `STRIPE_PRICE_V2_NETWORK` | **od** 349,00 € | **od** 429,27 € | 34900 | 150/mesiac v základe |
| Revolis v2 Balík 60 kreditov | `STRIPE_PRICE_V2_PACK_60` | 34,00 € | 41,82 € | 3400 | 60/mesiac |
| Revolis v2 Balík 120 kreditov | `STRIPE_PRICE_V2_PACK_120` | 62,00 € | 76,26 € | 6200 | 120/mesiac |
| Revolis v2 Balík 180 kreditov | `STRIPE_PRICE_V2_PACK_180` | 86,00 € | 105,78 € | 8600 | 180/mesiac |
| Revolis v2 Balík 240 kreditov | `STRIPE_PRICE_V2_PACK_240` | 108,00 € | 132,84 € | 10800 | 240/mesiac |
| Revolis v2 Balík 300 kreditov | `STRIPE_PRICE_V2_PACK_300` | 129,00 € | 158,67 € | 12900 | 300/mesiac |
| Revolis v2 Kredit (1 ks) | `STRIPE_PRICE_V2_CREDIT` | 0,70 €/ks | 0,86 €/ks* | 70 | 1/kus |

*Pri `quantity > 1` Stripe vypočíta daň z príslušného celku a zaokrúhli faktúru. Uvedená hrubá cena je príklad pre jeden kus. Start je pre 1, Team pre 2–6, Kancelária pre 7–25 a Sieť pre 26+ používateľov. Sieť je individuálna ponuka **od** 349 €, nie neobmedzený samoobslužný nákup. Grant patrí kancelárii, nie každému používateľovi.

## DPH a daňové podmienky

- Pred live vytvorením potvrdiť právnu entitu, status DPH, registrácie a produktové `tax_code` pre SaaS aj kredity s účtovníčkou. V podklade sa nijaký tax code nehádal. Stripe odporúča kód produktu pri automatickej dani. [Products API](https://docs.stripe.com/api/products/create)
- `PRICING_V2_STRIPE_TAX=on` je samostatný prepínač v CRM. `tax_behavior=exclusive` na produkte/Price samo osebe nezapne Stripe Tax. Overiť **Tax → Registrations**, fakturačnú adresu a číslo DPH zákazníka; Stripe Tax vyberá daň len tam, kde je aktívna registrácia. [Stripe Tax subscriptions](https://docs.stripe.com/tax/subscriptions)
- Slovenských 23 % je len vzor pre prípad, keď táto sadzba platí; na webe uviesť čistú cenu aj podmienenú konečnú cenu a pred zaplatením skutočný Stripe total podľa zákazníka. [Finančná správa SR](https://www.financnasprava.sk/sk/podnikatelia/dane/dan-z-pridanej-hodnoty/sadzby-dane)

**Pozor na existujúci verifikačný skript repa:** `bash scripts/ops/stripe-verify-prices.sh --spec` vypíše celú špecifikáciu (aj 10 v2 položiek), ale text v `stripe_verify_prices.py:print_spec` ešte vraví „amount = presne čo zákazník zaplatí (checkout nemá automatic_tax)“. To pre v2 s `exclusive` a zapnutým Stripe Tax neplatí. Samotná živá verifikácia aktuálne kontroluje sumu, menu, live režim, typ a interval, **nekontroluje `tax_behavior` ani tax code**. Po jej behu teda treba tieto polia zvlášť prečítať v Dashboarde alebo doplniť verifikátor pred GO.

## Testovací postup

Súbory `revolis-stripe-v2-catalog.json` a `stripe_test_catalog.py` patria do rovnakého priečinka. Skript používa iba štandardný Python; predvolene len overí aritmetiku. Pri `--test-create` prijme výlučne `sk_test_`, overí očakávané `acct_...`, vyžaduje potvrdené `txcd_...` pre oba typy produktu a vytvorí najviac 10 produktov/cien **iba v test režime**. Pri opakovaní zhodné položky znovu použije a nezhodnú cenu odmietne. Stripe kľúč zadáte skryto v konzole alebo cez `STRIPE_TEST_SECRET_KEY`.

```powershell
python .\stripe_test_catalog.py
python .\stripe_test_catalog.py --inspect-account
python .\stripe_test_catalog.py --test-create --expect-account acct_SKUTOCNE_ID --plan-tax-code txcd_12345678 --credit-tax-code txcd_87654321 --output .\stripe-v2-test-price-ids.json
```

**Príkladové** `txcd_...` vyššie nie sú odporúčané daňové kódy: nahradiť oboma skutočne potvrdenými. Žiadny kľúč ani výsledné ID netreba posielať cez chat v tajnom tvare; Price ID sa dajú bezpečne skontrolovať. Testovacie Price ID sa nikdy nevkladajú do produkčných env. Ak testovací účet z minulého pokusu obsahuje iné ceny s rovnakými lookup keys, skript sa zastaví a treba konflikt manuálne vyriešiť.

V testovacom Stripe overiť aspoň Start + Balík 60 = **59 € bez DPH**, orientačne **72,57 € pri 23 % DPH**; Checkout má dve mesačné položky s `quantity=1`. Potom overiť druhú zaplatenú faktúru, grant práve raz, zlyhanú/oneskorenú platbu, zrušenie a odlišný režim DPH. Existujúca DB testovacia schéma a webhook podpis ešte nie sú overené; test cien je len jedna časť toku.

## Živý Stripe: vykonávací checklist pre foundera

1. Na **aktuálnom heade PR** spustiť `bash scripts/ops/stripe-verify-prices.sh --spec`. Je to len výpis; krok C zahŕňa aj existujúce legacy ceny, takže vytvoriť iba chýbajúcich **10 v2** položiek. V live Stripe Dashboarde nastaviť presný názov, menu EUR, cents, monthly/one-time, `exclusive`, daňový kód a lookup key. Staré ceny neprepisovať ani nemažte.
2. Overiť live ceny read-only nástrojom repa s **restricted live key na Prices: Read** v `STRIPE_SECRET_KEY`: `bash scripts/ops/stripe-verify-prices.sh`. Výstup obsahuje `STRIPE_PRICE_V2_*=price_...`. Ručne alebo opraveným verifikátorom potvrdiť navyše `tax_behavior=exclusive` a product tax code. Kľúč necommitovať, neposielať ako argument.
3. Do bezpečnej konfigurácie CRM uložiť presne **10** `STRIPE_PRICE_V2_*` env kľúčov z tabuľky. Marketing a CRM potrebujú `PRICING_V2_ENABLED`, zatiaľ **vypnutý**; ak sa zvolí Stripe Tax, v CRM `PRICING_V2_STRIPE_TAX=on` až po daňovom teste. Nový manifest a staré seat ceny majú vlastné kľúče.
4. Založiť webhook endpoint `/api/billing/webhook`, uložiť podpísaný `STRIPE_WEBHOOK_SECRET`; odoberať `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `customer.subscription.created/updated/deleted`, `invoice.paid`, `invoice.payment_failed`. **Samotné prihlásenie udalosti nestačí:** v2 spracovanie `async_payment_succeeded` musí byť aj v kóde. [Stripe webhooks](https://docs.stripe.com/billing/subscriptions/webhooks)
5. Pred otvorením predaja dokončiť FUNNEL-V2 (web → registrácia → onboarding → zvolený plán), právne VOP, migráciu DB a test na reálnej testovacej DB/Stripe. Reality Smolko s.r.o. zachovať na existujúcej dohode 199 € + historický onboarding 99 €; nič automaticky nemigrovať. Živé zapnutie CRM + marketingu a rollback sú podrobne v `docs/pricing/2026-10-05-pricing-v2-w4-production-gate.md` na PR #822.

### Kredity pri prvom vydaní

Odporúčanie z W4 je predávať **len štyri plány** a päť balíkov aj jednorazový kredit **skryť, kým sa nezapne `CREDITS_ENFORCEMENT` a nezmeria náklad na kredit**. Aktuálny kontrakt však vyžaduje platné ID všetkých 10 cien pre `checkoutAvailable` a v2 UI s balíkmi ráta. Ak sa rozhodnete pre „len plány“, treba pred zapnutím upraviť aj UI, API checkout a dostupnosť podľa env; nestačí skryť kartu na webe. Ceny balíkov možno pripraviť v Stripe bez ich predaja.

Pri pracovnom cieli 70 % príspevkovej marže je pri Balíku 300/129 € limit priamych nákladov **38,70 € celkom**, teda **0,129 € na kredit** pri plnom využití vrátane platobných poplatkov, AI, infraštruktúry a podpory. Skutočná marža nie je zmeraná. Start/25 € má limit 7,50 € priamych nákladov na kanceláriu mesačne. Až meranie umožní finálne potvrdiť cenotvorbu balíkov.

## Stav a odovzdanie

| Položka | Stav |
|---|---|
| Katalóg 10 cien a aritmetika | lokálne overené podľa PR `3bb4233` |
| Skript na testovacie vytvorenie | pripravený, simulovaný; proti účtu Stripe nespustený |
| Tax codes a registrácie | potrebuje účtovníčku / Stripe účet |
| Live produkty, Price ID, webhook secret | nevytvorené/neoverené |
| FUNNEL-V2, VOP, DB, reálny end-to-end, meranie marže | W4 blokery, NOT READY |
| Prepnutie a produkčný predaj | nevykonané |
