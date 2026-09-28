# Stripe VERIFY kit — CHECKOUT-ENV-01 / -02

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
export STRIPE_SECRET_KEY=sk_live_…      # kľúč nikdy do chatu ani do repa
bash scripts/ops/stripe-verify-prices.sh
```

Vypíše `N/9 resolved`. Riadky `OK` sa dajú priamo použiť v kroku B.

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

1. `GET /api/billing/checkout-config` → `seatCheckoutAvailable: true`
2. Prihlásený `/upgrade` → tlačidlo „Pokračovať do Stripe" sa vykreslí
3. Klik → Stripe Checkout sa otvorí
4. **Skontroluj sumu na Stripe stránke proti sume v UI** — nielen že sa otvorí.
   Toto je jediné miesto, kde sa chytí trap z §3.
5. Ak je cockpit zaškrtnutý: Checkout musí ukázať **dva** line items

Krok E (`/porovnanie-programov` cleanup, `FUNNEL-PRICING-01`) sa sem **nemieša**.

---

## 9. Čo tento kit nerieši

- **Nevytvára ceny.** Ak chýbajú, je to krok C so samostatným GO.
- **Neopravuje fail-closed správanie cockpitu.** `if (!cockpitPrice) throw` je
  samostatný code fix, nie súčasť env patchu (`CHECKOUT-ENV-02`).
- **Nerieši `metadata.founderCockpit`**, ktorá klame pri fallbacku (§3). Tiež
  samostatný fix.
- **Nerieši `FUNNEL-PRICING-01`.**
- **Neoveruje, či `#369` naozaj opravil consumer contract** — to sa dá potvrdiť
  až po kroku D, keď sa UI konečne dostane za checkout gate.
