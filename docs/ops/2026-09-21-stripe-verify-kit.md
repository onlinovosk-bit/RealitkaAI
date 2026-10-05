# Stripe VERIFY kit — CHECKOUT-ENV-01 / -02

> **Stav 2026-09-29:** krok A **už prebehol 2026-09-22 → 0/9**
> (`docs/reports/2026-09-22-stripe-verify-prices.md`). Blokuje **krok C**:
> ceny v Stripe neexistujú. Čo presne vytvoriť: `bash scripts/ops/stripe-verify-prices.sh --spec`
> (bez kľúča). Po vytvorení spusti VERIFY znova — vypíše env patch pre krok B.
>
> **Objektov je 10, nie 9:** pribudol `STRIPE_PRICE_STARTER_PACK` (47 € one-time,
> marketing `/balik`), ktorý pôvodný zoznam nemal. Zoznam je teraz v
> `scripts/ops/stripe-expected-prices.json` a test
> `apps/crm/tests/verification/stripe-expected-prices.verification.test.ts`
> padne, keď sa rozíde s `program-tier-pricing.ts`. Tabuľky nižšie sú z 21. 9.;
> pri rozpore platí `--spec`.

**Krok A** z `memory/open-tasks.md`. Read-only. Nič nevytvára, nič nezapisuje.
Spúšťa **founder** s live secret key; agent kľúč nedostáva a price ID nehádže.

Hodnoty v tomto dokumente sú **vyčítané zo zdroja**, nie prepísané zo staršieho
reportu. Zdroje sú pri každej tabuľke.

---

## 0. Čo tento dokument opravuje oproti predchádzajúcemu zadaniu

Predošlý VERIFY (`docs/reports/2026-09-21-upgrade-checkout-config-root-cause.md`
§VERIFY) hovoril „tri ceny". `CHECKOUT-ENV-02` to posunul na „päť". Po prečítaní
kódu je zoznam iný v oboch smeroch:

| | predošlé zadanie | skutočnosť |
|---|---|---|
| `STRIPE_PRICE_OWNER_COCKPIT_PRO` | overiť | **netreba** — `enabled: false` (`program-tier-pricing.ts:116`), nepredáva sa |
| `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` | nespomenuté | **kritické dnes** — viď §3 |
| top-up ×4 | nespomenuté v kroku A | samostatná brána, viď §4 |

**Relevantných objektov je 9**, nie 3 a nie 5. Rozdelené podľa toho, čo blokujú.

---

## 1. Ako sa VERIFY spúšťa

**Použi hotový skript z #622** — kóduje presne tých istých deväť očakávaní ako
tento dokument a výstup dáva rovno v tvare `KĽÚČ=price_…`:

```bash
export STRIPE_SECRET_KEY=rk_live_…      # kľúč nikdy do chatu ani do repa
bash scripts/ops/stripe-verify-prices.sh
```

Stačí **restricted key** (Stripe Dashboard → Developers → API keys → Create
restricted key → *Prices: Read*, všetko ostatné *None*). Pridaj k nemu aj
*Account: Read* — potom prvý riadok výpisu povie stav účtu (`UCET OK
charges_enabled=true …`), čiže či je krok B1 naozaj hotový. Bez toho scope
vypíše `UCET nemerane` a pokračuje; **nemerané nie je OK** a exit kódom nehýbe.
Účet, ktorý neúčtuje, je exit 1 aj pri desiatich správnych cenách. Ak unikne, nevie nič
účtovať ani čítať zákazníkov. Testovací kľúč (`sk_test_`) skript odmietne — vrátil
by 0/N a zviedol by k záveru „ceny neexistujú".

Vypíše `N/10 resolved`, stav každej brány a na konci blok `KĽÚČ=price_…` pre
krok B (len jednoznačné zhody). Pri `MISSING` ukáže ceny s rovnakou sumou a
dôvod, prečo nesedia (`interval=1xyear`, `type=recurring`, `livemode=false`…).
Kľúč ide iba do HTTP hlavičky, nie do argumentu procesu.

Späť posielaj **iba výstup**. Price ID nie sú tajomstvo, secret key áno.

Zvyšok tohto dokumentu hovorí, **čo ten výstup znamená** a čo urobiť pri každom
z možných výsledkov.

<details>
<summary>Ručná alternatíva, ak skript nie je po ruke</summary>

Read-only `GET`. Vypíše všetky aktívne ceny na účte:

```bash
curl -s https://api.stripe.com/v1/prices \
  -u "sk_live_…:" \
  -d active=true -d limit=100 -G \
  -d "expand[]=data.product" \
| python3 -c "
import json,sys
rows=json.load(sys.stdin)['data']
print(f\"{'PRICE ID':32s} {'AMOUNT':>8s} {'CUR':>4s} {'INTERVAL':>9s} {'ACTIVE':>7s} {'LIVE':>5s}  PRODUCT\")
for p in sorted(rows, key=lambda x: (x.get('unit_amount') or 0)):
    r=p.get('recurring') or {}
    prod=p.get('product') or {}
    name=prod.get('name') if isinstance(prod,dict) else prod
    print(f\"{p['id']:32s} {str(p.get('unit_amount')):>8s} {str(p.get('currency')):>4s} \"
          f\"{r.get('interval','ONE-TIME'):>9s} {str(p.get('active')):>7s} {str(p.get('livemode')):>5s}  {name}\")
"
```

Alebo Stripe Dashboard → **Product catalog** → prepnúť na **live mode**
(vpravo hore) → každý produkt → sekcia Pricing. Rovnaké údaje.

</details>

---

## 2. Seat ceny — blokujú `/upgrade` (P0)

Brána: `areSeatCheckoutPricesConfigured()` vyžaduje **všetky tri**
(`program-tier-pricing.ts:313`). Kým čo i len jedna chýba,
`seatCheckoutAvailable=false` a tlačidlo „Pokračovať do Stripe" sa nevykreslí.

Session sa tvorí s `mode: "subscription"` (`credits-billing.ts:114`) →
**cena musí byť recurring**, one-time Stripe odmietne.

Line item je `{ price, quantity: počet_maklérov }` (`credits-billing.ts:72`) →
**cena je za jedného makléra**, nie balík.

| env premenná | `unit_amount` | `currency` | `recurring.interval` | min. seats |
|---|---|---|---|---|
| `STRIPE_PRICE_SOLO_SEAT` | `7900` | `eur` | `month` | 1 |
| `STRIPE_PRICE_TEAM_SEAT` | `7100` | `eur` | `month` | 3 |
| `STRIPE_PRICE_OFFICE_SEAT` | `6300` | `eur` | `month` | 10 |

Zdroj: `PLAN_PRICES_EUR` (`:9-13`), `SEAT_TIER_CONFIG.minSeats` (`:45,53,61`),
`SEAT_TIER_STRIPE_ENV` (`:19-23`).

**Vyplň:**

| env premenná | nájdené Price ID | amount | cur | interval | active | live | ✅/❌ |
|---|---|---|---|---|---|---|---|
| `STRIPE_PRICE_SOLO_SEAT` | | | | | | | |
| `STRIPE_PRICE_TEAM_SEAT` | | | | | | | |
| `STRIPE_PRICE_OFFICE_SEAT` | | | | | | | |

---

## 3. Owner Cockpit — ktorú z dvoch cien vlastne potrebuješ

`isFounderKancelariaEligible()` je **dnes `true`** — 20 miest celkovo, 13
zabraných, **7 voľných** (`program-tier-pricing.ts:200-208`). UI preto renderuje
**249 €**, nie 349 (`upgrade/page.tsx` → `ownerFounderPriceEur`).

**Prakticky to znamená: dnes je relevantný `_OWNER_COCKPIT_FOUNDER`.** Nastaviť
len `_OWNER_COCKPIT` cockpit nepredá — a to je zámer, nie chyba (viď nižšie).
`_OWNER_COCKPIT` má zmysel nastaviť súčasne, aby predaj nespadol vo chvíli, keď
sa founder miesta vyčerpajú.

### Ako sa systém správa, keď cena chýba (stav po #627, `2936c56`)

Pôvodne tu bola pasca: resolver pri nenastavenom `_FOUNDER` spadol späť na
`_OWNER_COCKPIT`, takže zákazník videl 249 € a zaplatil 349 €. A ak nebola ani
jedna cena, line item sa **ticho vynechal** — zákazník videl cockpit v sume a
zaplatil bez neho.

Oboje je zavreté:

- **žiadny fallback** medzi founder a štandardnou cenou — každá sa resolvuje
  len sama na seba; nenastavená znamená „nepredajné", nikdy „účtuj tú druhú"
- **`cockpit.ownerPurchasable`** z `/api/billing/checkout-config` sa počíta z
  **tej istej ceny, ktorú sa UI chystá zobraziť**, a `/upgrade` podľa neho
  checkbox vôbec nezobrazí
- **fail-closed** v `buildSeatCheckoutSessionParams`, ak by sa konfigurácia
  zmenila medzi načítaním stránky a odoslaním
- **`metadata.founderCockpit`** sa zapisuje podľa toho, čo sa naúčtovalo, nie
  podľa eligibility

**Pre VERIFY to nič nemení.** Cockpit ceny stále treba overiť, ak ho chceš
predávať. Mení to len to, čo sa stane, keď chýbajú: zákazník dostane funkčný
seat-only checkout namiesto nesprávnej sumy.

| env premenná | `unit_amount` | `currency` | `recurring.interval` | poznámka |
|---|---|---|---|---|
| `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` | `24900` | `eur` | `month` | **dnes aktívna cesta** (7/20 voľných) |
| `STRIPE_PRICE_OWNER_COCKPIT` | `34900` | `eur` | `month` | po vyčerpaní founder miest |
| ~~`STRIPE_PRICE_OWNER_COCKPIT_PRO`~~ | ~~`49900`~~ | | | **preskočiť** — `enabled: false` |

Zdroj: `COCKPIT_PRODUCTS.owner` (`:96-107`), `ownerPro` (`:109-117`),
`FOUNDER_KANCELARIE_POOL_*` (`:200-201`).

**Vyplň:**

| env premenná | nájdené Price ID | amount | cur | interval | active | live | ✅/❌ |
|---|---|---|---|---|---|---|---|
| `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` | | | | | | | |
| `STRIPE_PRICE_OWNER_COCKPIT` | | | | | | | |

---

## 4. Top-up kredity — samostatná brána, samostatná plocha

Brána: `areTopupCheckoutPricesConfigured()` vyžaduje **všetky štyri**
(`program-tier-pricing.ts:317`). Je **nezávislá** od seat brány
(`checkout-config/route.ts:17-21`), takže *nasadenie troch seat cien odblokuje
`/upgrade` aj keď top-up ostane nenastavený.* Top-up žije na `/billing#topup`.

Session je `mode: "payment"` (`credits-billing.ts:149`) → **ceny musia byť
one-time, nie recurring.** Presne opačne než seat.

| env premenná | `unit_amount` | `currency` | typ | kreditov |
|---|---|---|---|---|
| `STRIPE_PRICE_CREDITS_START` | `4900` | `eur` | one-time | 50 |
| `STRIPE_PRICE_CREDITS_RAST` | `12900` | `eur` | one-time | 150 |
| `STRIPE_PRICE_CREDITS_PRO` | `37900` | `eur` | one-time | 500 |
| `STRIPE_PRICE_CREDITS_MEGA` | `99900` | `eur` | one-time | 1500 |

Zdroj: `TOPUP_PACKAGES` (`:155-185`).

**Vyplň:**

| env premenná | nájdené Price ID | amount | cur | typ | active | live | ✅/❌ |
|---|---|---|---|---|---|---|---|
| `STRIPE_PRICE_CREDITS_START` | | | | | | | |
| `STRIPE_PRICE_CREDITS_RAST` | | | | | | | |
| `STRIPE_PRICE_CREDITS_PRO` | | | | | | | |
| `STRIPE_PRICE_CREDITS_MEGA` | | | | | | | |

---

## 5. Spoločné tvrdé podmienky

Platia pre každý riadok vyššie:

- **`active: true`**
- **`livemode: true`** — prod používa `STRIPE_SECRET_KEY` z production targetu
- **`currency: eur`**
- **formát ID** musí sedieť `^price_[a-zA-Z0-9]{8,}$` (`:275`), inak ho
  `isValidStripePriceId` odmietne aj keď je premenná správne nastavená
- amount je v **centoch** — 79 € je `7900`, nie `79`

---

## 6. Rozhodovací strom po VERIFY

```
Existujú všetky 3 seat ceny, recurring, eur, month, správne sumy?
├─ ÁNO  → krok B: env patch (len tieto tri) → §7
└─ NIE  → STOP. Krok C: samostatné GO na vytvorenie Stripe Products/Prices.
          Agent ceny nevytvára — vytvorenie ceny je obchodný kontrakt.

Existuje STRIPE_PRICE_OWNER_COCKPIT_FOUNDER (24900)?
├─ ÁNO  → zapíš ho spolu so seat cenami (a _OWNER_COCKPIT tiež, ak existuje,
│          aby predaj nespadol po vyčerpaní founder miest)
├─ NIE, ale _OWNER_COCKPIT (34900) existuje
│        → zapísať ho môžeš, cockpit sa jednoducho nebude ponúkať, kým sú
│          voľné founder miesta. Preplatok už nehrozí (#627). Ak ho chceš
│          predávať teraz, treba founder cenu vytvoriť — samostatné GO.
└─ NEEXISTUJE ani jeden
         → cockpit sa neponúkne, seat checkout funguje normálne. Bez akcie.

Existujú všetky 4 top-up ceny, one-time?
├─ ÁNO  → môžu ísť do toho istého env patchu
└─ NIE  → /upgrade to neblokuje. Nechaj na neskôr, /billing#topup ostane
          nedostupný. Nie je to dôvod zdržať P0.
```

---

## 6b. Stav Vercelu, odmeraný 2026-09-30 (nie odhad)

Doteraz bol odmeraný len Stripe (krok A → 0/9). **Vercel nikto nepozrel.**
Odmerané cez Vercel API na projekte `realitka-ai`
(`prj_gXxD0vtqXTtBdV3amGVspPJvQntW`), 85 premenných spolu, iba názvy a ciele —
hodnoty sa nedešifrovali.

Z desiatich premenných, ktoré dnešný kód číta, je vo Verceli **nula**:

| premenná | v Verceli | bráni |
|---|---|---|
| `STRIPE_PRICE_SOLO_SEAT` | ❌ | `/upgrade` seat checkout (P0) |
| `STRIPE_PRICE_TEAM_SEAT` | ❌ | to isté |
| `STRIPE_PRICE_OFFICE_SEAT` | ❌ | to isté |
| `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` | ❌ | cockpit checkbox |
| `STRIPE_PRICE_OWNER_COCKPIT` | ❌ | cockpit checkbox |
| `STRIPE_PRICE_CREDITS_START` | ❌ | `/billing#topup` |
| `STRIPE_PRICE_CREDITS_RAST` | ❌ | `/billing#topup` |
| `STRIPE_PRICE_CREDITS_PRO` | ❌ | `/billing#topup` |
| `STRIPE_PRICE_CREDITS_MEGA` | ❌ | `/billing#topup` |
| `STRIPE_PRICE_STARTER_PACK` | ❌ | marketing `/balik` |

Čo vo Verceli **je** — sedem premenných, žiadna z nich zo zoznamu vyššie:

```
STRIPE_SECRET_KEY                production
STRIPE_WEBHOOK_SECRET            development, preview, production
STRIPE_PRICE_STARTER             development, preview, production
STRIPE_PRICE_PRO                 production
STRIPE_PRICE_MARKET_VISION       production, preview, development
STRIPE_PRICE_PROTOCOL_AUTH       preview, production
STRIPE_PRICE_ONBOARDING          production
```

Päť `STRIPE_PRICE_*` premenných patrí **starému** plánovému modelu
(`billing-store.ts`), nie cenníku v `program-tier-pricing.ts`. Sú deklarované
v `apps/crm/src/config/env.ts:28-34`; desať nových tam deklarovaných **nie je**,
takže schéma prostredia dnes nepopisuje, čo aplikácia naozaj potrebuje.

Dôsledok pre poradie krokov: **krok B nie je čiastočne hotový, je nedotknutý.**
Po kroku C treba doplniť všetkých desať, nie dopĺňať chýbajúce.

Pozor pri upratovaní: `env.ts` deklaruje sedem starých cien, vo Verceli je päť.
`STRIPE_PRICE_SCALE` (`billing-store.ts:673`) a `STRIPE_PRICE_ENTERPRISE`
(`billing-store.ts:52`) sa čítajú, ale nastavené nie sú — mapovanie ceny na plán
cez tieto dva riadky teda nikdy nezaberie. Nie je to blokátor tržby, ale patrí
to na zoznam pri čistení starého modelu.

### Čo z toho zostáva na founderovi

1. **Krok C** — vytvoriť desať cien v Stripe LIVE. Presné sumy a typy:
   `bash scripts/ops/stripe-verify-prices.sh --spec` (kľúč netreba).
2. **Krok A znova** — `STRIPE_SECRET_KEY=rk_live_… bash scripts/ops/stripe-verify-prices.sh`
   vypíše riadky `KLUC=price_…`.
3. **Krok B** — vložiť ich do Vercelu (§7) a **redeploy**.
4. **Krok D** — smoke podľa §8.

Agent nedostáva live kľúč a ceny nevytvára. Bez kroku C nevie pohnúť ničím —
tri kroky zo štyroch stoja na účte, ku ktorému nemá prístup.

---

## 7. Krok B — env patch (zapisuje founder)

Vercel projekt `realitka-ai`, target **production** (a `preview`, ak chceš
smoke na preview). Hodnoty dopĺňa founder zo Stripe:

```
STRIPE_PRICE_SOLO_SEAT=price_…
STRIPE_PRICE_TEAM_SEAT=price_…
STRIPE_PRICE_OFFICE_SEAT=price_…
```

Voliteľne, len ak VERIFY potvrdil:

```
STRIPE_PRICE_OWNER_COCKPIT_FOUNDER=price_…
STRIPE_PRICE_OWNER_COCKPIT=price_…
STRIPE_PRICE_CREDITS_START=price_…
STRIPE_PRICE_CREDITS_RAST=price_…
STRIPE_PRICE_CREDITS_PRO=price_…
STRIPE_PRICE_CREDITS_MEGA=price_…
```

Po zápise **redeploy** — env premenné sa čítajú na serveri pri buildoch aj
runtime, existujúci deployment ich nezoberie.

---

## 8. Krok D — smoke po deployi

**Strojová časť — jeden príkaz, exit kód:**

```bash
bash scripts/ops/stripe-checkout-probe.sh          # default https://app.revolis.ai
```

Read-only, nezautentizovaný `GET /api/billing/checkout-config`. Vypíše stav
oboch brán (seat je P0, top-up samostatná), **názvy** chýbajúcich premenných
(nikdy hodnoty), ktorá z dvoch cockpit cien platí — a porovná sumy, ktoré
nasadený kód ponúka, proti `scripts/ops/stripe-expected-prices.json`.
Exit: `0` = obe brány OK a sumy sedia, `1` = niečo chýba alebo nesedí,
`2` = sieť / HTTP / nečitateľné telo.

Sonda **nedokazuje**, že Stripe cena za tou premennou má tú istú sumu — to je
krok A. Dokazuje, že PROD tie premenné vidí a za koľko predáva.

**Ručná časť — bez nej to nie je overené:**

1. Prihlásený `/upgrade` → tlačidlo „Pokračovať do Stripe" sa vykreslí
2. Klik → Stripe Checkout sa otvorí
3. **Skontroluj sumu na Stripe stránke proti sume v UI** — nielen že sa otvorí.
   Toto je jediné miesto, kde sa chytí trap z §3.
4. Ak je cockpit zaškrtnutý: Checkout musí ukázať **dva** line items

Krok E (`/porovnanie-programov` cleanup, `FUNNEL-PRICING-01`) sa sem **nemieša**.

---

## 9. Čo tento kit nerieši

- **Nevytvára ceny.** Ak chýbajú, je to krok C so samostatným GO.
- **Neopravuje fail-closed správanie cockpitu.** `if (!cockpitPrice) throw` je
  samostatný code fix, nie súčasť env patchu (`CHECKOUT-ENV-02`).
- **Nerieši `metadata.founderCockpit`**, ktorá klame pri fallbacku (§3). Tiež
  samostatný fix.
- **Nerieši `FUNNEL-PRICING-01`.**
- **Marketing je mimo manifest — vedomé rozhodnutie foundera (2026-10-05).**
  `apps/marketing` číta ďalších **šesť** cien, ktoré v
  `stripe-expected-prices.json` nie sú: `STRIPE_PRICE_AUDIT_149`,
  `STRIPE_PRICE_AUDIT_99` (`/api/revenue-scan/checkout`),
  `STRIPE_PRICE_SMART_START`, `STRIPE_PRICE_RADAR_MAKLERA`,
  `STRIPE_PRICE_STRAZCA`, `STRIPE_PRICE_REALITY_MONOPOL`
  (`/api/checkout/subscription`). Dôsledok, s ktorým sa počíta: VERIFY môže
  vypísať „10/10 resolved" a sonda z §8 skončiť na 0, **kým marketingové
  checkouty nepredajú nič**. Nie je to chyba merania, je to iný rozsah.
- **Chybný stavový kód pri chýbajúcej marketingovej cene.** Zmerané 2026-10-05:
  `apps/marketing/app/api/checkout/subscription/route.ts` vráti pri nenastavenej
  premennej **400 `unknown_plan`** (prázdny string je falsy), nie 503 — teda
  tvrdí „taký plán neexistuje" tam, kde len chýba konfigurácia.
  `/api/revenue-scan/checkout` to má správne (503 `price_not_configured`).
  Zapísané, **neopravené** — marketing je dnes mimo rozsahu, samostatné GO.
- **Neoveruje, či `#369` naozaj opravil consumer contract** — to sa dá potvrdiť
  až po kroku D, keď sa UI konečne dostane za checkout gate.
