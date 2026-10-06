# Ročné platenie plánov (rozhodnutie foundera, 6. 10. 2026)

**A. Cena:** ročná = **12 × mesačná, bez zľavy**. Start 300 €, Team 720 €, Kancelária 1 788 €, Sieť od 4 188 € bez DPH (s 23 % DPH 369 / 885,60 / 2 199,24 / od 5 151,24 €). DPH sa počíta zo základu na cent.

## Ako to funguje
- **Stripe:** štyri ročné ceny sú druhá Price (interval `year`) na rovnakých štyroch produktoch ako mesačné. Env: `STRIPE_PRICE_V2_START_YEARLY`, `_TEAM_YEARLY`, `_OFFICE_YEARLY`, `_NETWORK_YEARLY`. Sumy, názvy a `exclusive` kontroluje `stripe_verify_prices.py` (nová pole `interval`) a drift-test katalógu.
- **Checkout:** požiadavka má `interval` (`month` predvolene, `year`). Ročný plán sa **nikdy nekombinuje s mesačným balíkom kreditov** (Stripe: všetky položky predplatného majú rovnaký interval), API vráti 400. Chýbajúca ročná cena = 503 `prices_not_configured` s názvom premennej, mesačná cena sa nikdy nepodstrčí.
- **Plán a grant:** ročná cena je to isté pásmo (rovnaký tier, rovnaké kredity 20 / 50 / 100 / 150). **Kredity sa prideľujú mesačne** (prvý grant po zaplatení, ďalšie cez mesačný cyklus), lebo faktúra príde raz ročne.
- **Ponuka:** `GET /api/billing/checkout-config` vracia `yearlyAvailable`. Kým nie sú nastavené všetky 4 ročné ceny, UI prepínač Mesačne/Ročne nie je vidieť a predaj ostáva mesačný.
- **Zobrazenie:** CRM `/upgrade` (prepínač), porovnanie pásiem a web revolis.ai (riadok „Ročne X € bez DPH (Y € s DPH)“). Slovo „zľava“ sa nepoužíva, zľava neexistuje.

## Neoverené
Reálny Stripe (ročná faktúra, webhook `invoice.paid` po 12 mesiacoch, obnova, zrušenie uprostred roka a vrátenie peňazí), dohodnutá výška vrátenia pri ročnom platení (**DOPLNIŤ do VOP**), mobilné zobrazenie.

## Skúšobné obdobie 14 dní (B, C): ešte nie je hotové
Founder: bez karty, 14 dní celý Revolis, po skončení sa skúška sama vypne a nič sa neúčtuje, malý skúšobný grant kreditov. CRM má už dnes výpočet skúšky (`saas-ops.ts`: dátum vzniku používateľa + `APP_TRIAL_DAYS`, stav `trial` a potom `limited`). Chýba **samoobslužné založenie agentúry** (registrácia dnes končí chybou, kým nie je bezpečné privilegované založenie tenanta). To je samostatná bezpečnostná stena. Web preto zatiaľ netvrdí „14 dní zadarmo“.
