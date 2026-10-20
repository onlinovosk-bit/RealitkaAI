# Stripe VERIFY na Windowse (read-only)

Postup pre foundera: lokálne overiť, ktoré ceny existujú v LIVE Stripe. Skript robí iba `GET /v1/prices`. Nič nevytvára ani nemení. Kontext a poradie krokov: `docs/plans/2026-10-16-stripe-krok-c-plan.md`.

## 1. Čo potrebuješ

- Windows s Pythonom 3 (príkaz `python --version` vypíše 3.x). Skript používa len štandardnú knižnicu, nič sa neinštaluje cez `pip`.
- Repo stiahnuté lokálne (terminál otvor v koreňovom priečinku `RealitkaAI`).
- Restricted key `rk_live_...` s oprávnením **Prices: Read** (Stripe Dashboard, Developers, API keys, Create restricted key). Skript pri načítaní cien žiada aj rozbalenie produktu (`expand[]=data.product`). Ak Stripe vráti chybu oprávnenia, skript ju vypíše ako `STRIPE ERROR 403: ...`. V tom prípade kľúču pridaj aj **Products: Read**.
- Skript príjme len live kľúč (`rk_live_` alebo `sk_live_`). Testovací kľúč (`_test_`) odmietne so správou a skončí s kódom 2.

Kľúč nikdy nevkladaj do chatu, do repozitára ani do príkazu ako argument.

## 2. Nastav kľúč len pre toto okno terminálu

### PowerShell 7+

```powershell
$env:STRIPE_SECRET_KEY = Read-Host "Stripe rk_live kluc" -MaskInput
```

### Windows PowerShell 5.1

```powershell
$sec = Read-Host "Stripe rk_live kluc" -AsSecureString
$env:STRIPE_SECRET_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
Remove-Variable sec
```

Premenná platí iba v tomto okne a zmizne po jeho zatvorení. Nepoužívaj `setx` (uloží kľúč trvalo).

### cmd (ak nie je iná možnosť)

```cmd
set /p STRIPE_SECRET_KEY=Stripe rk_live kluc:
```

Pri `cmd` sa zadaný kľúč zobrazuje na obrazovke. Uprednostni PowerShell.

## 3. Spusti overenie

```powershell
python scripts\ops\stripe_verify_prices.py
```

Ak `python` nie je v PATH, skús `py -3 scripts\ops\stripe_verify_prices.py`. (Súbor `scripts/ops/stripe-verify-prices.sh` je len obal pre bash a na Windowse ho nepotrebuješ.)

Skutočné prepínače skriptu:

| Prepínač | Čo robí |
|---|---|
| (žiadny) | Načíta ceny z LIVE Stripe a porovná ich s `scripts/ops/stripe-expected-prices.json`. Vyžaduje `STRIPE_SECRET_KEY`. |
| `--spec` | Vypíše zoznam, čo má v Stripe existovať. Kľúč ani sieť nepotrebuje. |
| `--fixture <súbor>` | Offline mód pre testy. Pre teba nie je potrebný. |

Kód skončenia (PowerShell `$LASTEXITCODE`, cmd `%ERRORLEVEL%`): `0` = všetko nájdené, `1` = niečo MISSING alebo AMBIG, `2` = chyba konfigurácie, kľúča alebo siete.

## 4. Po skončení odstráň kľúč

```powershell
Remove-Item Env:STRIPE_SECRET_KEY
```

V `cmd`: `set STRIPE_SECRET_KEY=`. Potom kľúč v Stripe Dashboarde zruš (Roll/Delete), ak ho už nepotrebuješ.

## 5. Ako čítať výstup

Skript prejde 24 položiek z manifestu (jedna cena = jeden riadok). Cena sa páruje podľa **sumy** a musí spĺňať všetko: mena `eur`, `active`, `livemode`, správny typ a interval (mesačne alebo ročne), `licensed`, `per_unit` a aktívny produkt. Pre skupinu `pricing_v2` navyše `tax_behavior=exclusive` a produkt s `tax_code`.

Riadky:

```
OK       STRIPE_PRICE_V2_START=price_...   (25.00 EUR mesacne (recurring month), produkt: Revolis Start)
MISSING  STRIPE_PRICE_SOLO_SEAT   -- treba 79.00 EUR mesacne (recurring month), eur, active, live
           blizko: price_... (nazov) -- dovod zamietnutia
AMBIG    STRIPE_PRICE_...   -- 2 kandidati: price_... (nazov), price_... (nazov). Archivuj nespravne v Stripe.
```

- **OK** = presne jedna zodpovedajúca cena, vypíše sa jej `price_...` ID (ID nie je tajomstvo).
- **MISSING** = žiadna cena nespĺňa podmienky. Riadky `blizko:` ukazujú ceny s rovnakou sumou a dôvod, prečo neprešli (napr. `tax_behavior=unspecified, treba exclusive`, `product.tax_code chyba`).
- **AMBIG** = viac zhodných kandidátov, treba archivovať nesprávny v Stripe.

Na konci je súhrn `N/24 resolved` a po skupinách (brány) riadok `OK` alebo `NIE`:

| Skupina (brána) | Čo to je |
|---|---|
| `seat` | Legacy miesta 79 / 71 / 63 EUR (`SOLO_SEAT`, `TEAM_SEAT`, `OFFICE_SEAT`) |
| `cockpit` | Owner Cockpit add-on |
| `topup` | Dobíjanie kreditov (jednorazovo) |
| `starter_pack` | Štartovací balík /balik |
| `pricing_v2` | Cenník v2, sumy bez DPH |

Skupina je `OK` len vtedy, ak sú všetky jej položky OK.

## 6. Ako to vyhodnotiť pre Production

Stav z Vercelu: `PRICING_V2_ENABLED=true`, existujú len ceny plánov v2: Start 25, Team 60, Kancelária 149, Sieť 349 EUR bez DPH.

**Čo rozhoduje:** osem plánových položiek v skupine `pricing_v2`:

- `STRIPE_PRICE_V2_START`, `_TEAM`, `_OFFICE`, `_NETWORK` (mesačne 2500, 6000, 14900, 34900 centov),
- `STRIPE_PRICE_V2_START_YEARLY`, `_TEAM_YEARLY`, `_OFFICE_YEARLY`, `_NETWORK_YEARLY` (ročne 30000, 72000, 178800, 418800 centov).

Tieto riadky majú byť `OK`. Ak je niektorá `MISSING`, prečítaj si riadok `blizko:`. Najčastejšie ide o chýbajúci `tax_behavior=exclusive` alebo `tax_code` na produkte.

**Čo sa očakáva ako MISSING (nie je to chyba Production):**

- Skupina `seat` (79 / 71 / 63 EUR) je starý, legacy spôsob a vo Verceli Production nie je nakonfigurovaná. Riadky `MISSING STRIPE_PRICE_*_SEAT` a `NIE seat` sú teda očakávané, nie defekt.
- Skupiny `cockpit`, `topup`, `starter_pack` a v2 balíky `STRIPE_PRICE_V2_PACK_*` s `STRIPE_PRICE_V2_CREDIT` vo Verceli tiež nie sú (podľa plánu sa balíky zámerne nepredávajú, režim „len plány"). Ich MISSING je očakávané, ak ich v Stripe nemáš vytvorené.

**Pozor na to, čo skript naozaj robí.** Skript vyhodnocuje všetkých 24 položiek rovnako a nepozná „očakávaný legacy stav":

- Pri akomkoľvek MISSING alebo AMBIG končí s kódom `1`. V tomto nastavení teda kód `1` dostaneš aj pri zdravom stave Production.
- Vypíše vetu `Seat brana NEUPLNA -> krok C (STOP, samostatne GO)`. Táto veta pochádza zo starej logiky, kde seat brána bola povinná. Pri `PRICING_V2_ENABLED=true` ju čítaj ako očakávanú, nie ako pokyn vytvárať legacy ceny.
- Blok `# Krok B - env patch` vypíše riadky `KLUC=price_...` len pre položky, ktoré našiel. To je súpis, ktoré `price_...` ID patria do Vercelu. Nič sa do Vercelu nezapisuje samo.
- Skript porovnáva ceny v Stripe s manifestom. **Neporovnáva** ich s tým, čo je vo Verceli. Či ID v premenných `STRIPE_PRICE_V2_*` zodpovedá ID z výstupu, treba skontrolovať zvlášť.

## 7. Čo poslať späť

Pošli **iba stdout výstup skriptu** (celý, od prvého riadku po posledný), skopírovaný z terminálu.

- Skript kľúč nikde nevypisuje. Číta ho z premennej prostredia a posiela len v hlavičke `Authorization` HTTP požiadavky (overené v `scripts/ops/stripe_verify_prices.py`). Do výstupu ide len `price_...` ID, názvy produktov a sumy.
- Chyby (`STRIPE ERROR ...`, `NETWORK ERROR ...`, hlásenia o kľúči) idú na stderr. Ak sa objavia, pošli aj ich. Chybová správa od Stripe môže obsahovať zamaskovaný kľúč (napr. `rk_live_***...abcd`). Pred odoslaním ju rýchlo prečítaj a ak by tam bol plný kľúč, neposielaj ho (v praxi Stripe kľúč maskuje).
- Neposielaj: samotný kľúč, obsah premennej prostredia, screenshot príkazu `Read-Host` po zadaní.
- Pošli aj hodnotu `$LASTEXITCODE` (0, 1 alebo 2).

Späť dostaneš: vyhodnotenie 8 plánových cien (OK alebo čo presne chýba/nesedí), zoznam `price_...` ID na kontrolu proti Vercelu a rozdelenie ostatných MISSING na očakávané legacy a skutočné nálezy.
