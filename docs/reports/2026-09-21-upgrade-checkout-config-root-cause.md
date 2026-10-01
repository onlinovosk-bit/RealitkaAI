# `/upgrade` checkout nedostupný — root cause

**Dátum:** 2026-09-21
**Trigger:** founder prod smoke na prihlásenej session → FAIL
(`docs/reports/2026-09-18-upgrade-prod-smoke.md`, sekcia „Výsledok founder checku“)
**Metóda:** read-only. `git show`/`grep` nad `origin/main` `018071f`; Vercel API
`filter_project_envs` (bez `decrypt`, čítané len názvy premenných a ich targety).
**Zákazy dodržané:** žiadna zmena env, žiadny zápis do Stripe, žiadny merge, žiadny PROD DB zásah.

## Reťaz od symptómu k príčine

| Krok | Dôkaz |
|---|---|
| UI ukáže „Checkout momentálne nedostupný“ | `apps/crm/src/app/(dashboard)/upgrade/page.tsx:134` |
| Seat sekcia + tlačidlo „Pokračovať do Stripe“ sú pod flagom | `:158` (`config?.seatCheckoutAvailable`), tlačidlo `:267` |
| Flag prichádza z config routu | `:50` `fetch('/api/billing/checkout-config')` |
| Route ho počíta, nič iné | `apps/crm/src/app/api/billing/checkout-config/route.ts:17` |
| Vyžaduje **všetky tri** seat price IDs | `apps/crm/src/lib/program-tier-pricing.ts:314` `SEAT_TIERS.every(...)` |
| Názvy premenných | `:19-23` `STRIPE_PRICE_SOLO_SEAT` / `_TEAM_SEAT` / `_OFFICE_SEAT` |
| Validácia odmietne aj placeholder | `:277-283` (prázdne, `xxx`, `price_xxx` → false) |

## Stav produkčných env premenných (Vercel `realitka-ai`, 85 premenných)

Prítomné `STRIPE_*`:

| Premenná | Target |
|---|---|
| `STRIPE_SECRET_KEY` | production |
| `STRIPE_WEBHOOK_SECRET` | development, preview, production |
| `STRIPE_PRICE_STARTER` | development, preview, production |
| `STRIPE_PRICE_PRO` | production |
| `STRIPE_PRICE_MARKET_VISION` | production, preview, development |
| `STRIPE_PRICE_PROTOCOL_AUTH` | preview, production |
| `STRIPE_PRICE_ONBOARDING` | production |

Vyžadované kódom, **chýbajúce vo všetkých targetoch**:

`STRIPE_PRICE_SOLO_SEAT`, `STRIPE_PRICE_TEAM_SEAT`, `STRIPE_PRICE_OFFICE_SEAT`,
`STRIPE_PRICE_CREDITS_START`, `STRIPE_PRICE_CREDITS_RAST`,
`STRIPE_PRICE_CREDITS_PRO`, `STRIPE_PRICE_CREDITS_MEGA`

Preto `seatCheckoutAvailable = false` **aj** `topupCheckoutAvailable = false`.
Hodnoty existujúcich premenných neboli dešifrované ani čítané.

## Nález, ktorý to spája s funnelom

Prítomné price IDs zodpovedajú **program modelu**: `STARTER` / `PRO` /
`MARKET_VISION` / `PROTOCOL_AUTH` — presne tie štyri tiery, ktoré
`/porovnanie-programov` predáva za 49 / 99 / 199 / 449 €/mes.
Kód `program-tier-pricing.ts` stojí na **seat modeli** (79 / 71 / 63 € na makléra).

Produkčný Stripe je teda nakonfigurovaný na jeden obchodný model a aplikačný kód
na druhý. `CHECKOUT-ENV-01` a `FUNNEL-PRICING-01` nie sú dva nezávislé nálezy —
sú to dva symptómy tej istej nedokončenej migrácie pricing modelu.

Staré premenné sú v kóde stále čítané (`config/env.ts`, `billing-store.ts`,
`saas-ops.ts`), takže nejde o mŕtvy kód — obe vetvy koexistujú.

## Čo to znamená pre `#369`

`#369` opravil reálnu chybu (consumer čítal `data.data.result.url`, `okResponse`
spreaduje na top level) a kontrakt je zamknutý testom. Ale symptóm v produkčnom
UI je pred aj po `#369` **identický** — „Checkout momentálne nedostupný“ — lebo
config flag je `false` z iného dôvodu. Prod UI teda nie je dôkazom o `#369` ani
v jednom smere, kým platí `CHECKOUT-ENV-01`.

## Čo NEROBIŤ

- Nevytvárať a nehádať Stripe price IDs. Musia existovať v Stripe účte.
- Nenastavovať seat premenné pred rozhodnutím `FUNNEL-PRICING-01` — zabetónovalo
  by to model, ktorý ešte nie je vybraný.
- Nemeniť `okResponse` kontrakt ani `/porovnanie-programov`.

## Otvorené otázky pre foundera

1. Ktorý pricing model je kanonický — seat (79/71/63 € na makléra) alebo program
   (49/99/199/449 €/mes.)?
2. Existujú v Stripe účte recurring price objekty pre seat model, alebo ich treba
   najprv vytvoriť?
3. Ak je kanonický seat model: `/porovnanie-programov` komunikuje neplatný cenník
   — stiahnuť, prepísať, alebo označiť ako roadmapu?

---

## Founder rozhodnutie 2026-09-21 (`DEC-20260921-001`)

1. **Kanonický model = SEAT.** 79 / 71 / 63 € na makléra za mesiac. Programy
   Market Vision / Protocol Authority sú nadstavby, nie alternatívny základný
   checkout. 49/99/199/449 € nie je paralelný programový checkout.
2. **Stripe: najprv VERIFY, až potom prípadné CREATE.** Nikto nedostáva GO na
   vytváranie nových Stripe cien. Vytvorenie ceny = vytvorenie obchodného
   kontraktu, to nie je „oprava env".
3. **`/porovnanie-programov`** sa nesmie miešať do opravy checkoutu — samostatná
   úloha.

Hranica: AI diagnostikuje, pripravuje a overuje. Finálny obchodný kontrakt
a production payment configuration ostáva pod Founder GO.

## VERIFY — akceptačné kritériá (krok A)

Nie „pozri, či tam niečo je". Price objekt musí sedieť s kontraktom v kóde,
inak checkout spadne alebo bude účtovať inú sumu, než UI ukazuje.

> **Oprava 2026-09-21 (neskôr v ten deň).** Pôvodné znenie žiadalo overiť tri
> price objekty, sekcia `CHECKOUT-ENV-02` nižšie potom päť. Oboje je málo.
> Čítaním kódu je ich **deväť** — a tá pôvodná pätica menovala nesprávny
> cockpit kľúč. Detail a dôkaz v `§ Oprava rozsahu VERIFY` na konci reportu.

| env premenná | vrstva | `unit_amount` | `currency` | `recurring.interval` | min. množstvo |
|---|---|---|---|---|---|
| `STRIPE_PRICE_SOLO_SEAT` | seat | `7900` | `eur` | `month` | 1 |
| `STRIPE_PRICE_TEAM_SEAT` | seat | `7100` | `eur` | `month` | 3 |
| `STRIPE_PRICE_OFFICE_SEAT` | seat | `6300` | `eur` | `month` | 10 |
| `STRIPE_PRICE_OWNER_COCKPIT` | cockpit | `34900` | `eur` | `month` | 1 |
| `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` | cockpit | `24900` | `eur` | `month` | 1 |
| `STRIPE_PRICE_CREDITS_START` | top-up | `4900` | `eur` | — (one-time) | 1 |
| `STRIPE_PRICE_CREDITS_RAST` | top-up | `12900` | `eur` | — (one-time) | 1 |
| `STRIPE_PRICE_CREDITS_PRO` | top-up | `37900` | `eur` | — (one-time) | 1 |
| `STRIPE_PRICE_CREDITS_MEGA` | top-up | `99900` | `eur` | — (one-time) | 1 |

Zdroj čísel: `program-tier-pricing.ts` — `PLAN_PRICES_EUR` (79/71/63),
`SEAT_TIER_CONFIG.minSeats`, `COCKPIT_PRODUCTS.owner` (`priceEur: 349`,
`founderPriceEur: 249`), `TOPUP_PACKAGES` (49/129/379/999).

**Nepatrí sem:** `STRIPE_PRICE_OWNER_COCKPIT_PRO` (`COCKPIT_PRODUCTS.ownerPro`
má `enabled: false`, na self-serve checkout ceste nie je) a
`STRIPE_PRICE_STARTER_PACK` (iný povrch — `/balik`, vlastná brána
`isStarterPackCheckoutAvailable`). Ani jeden neblokuje `/upgrade`.

Ďalšie tvrdé podmienky:

- **`recurring` je povinné.** Session sa tvorí s `mode: "subscription"`
  (`credits-billing.ts:114`). One-time price tam Stripe odmietne.
- **Cena je per-seat, nie balík.** Line item je `{ price, quantity: qty }`
  (`:72-74`), kde `qty` = počet maklérov. Price musí byť za **jedného** makléra.
- **`active: true`.**
- **live mode**, nie test — prod používa `STRIPE_SECRET_KEY` z produkčného targetu.
- **Formát ID** musí sedieť `^price_[a-zA-Z0-9]{8,}$` (`:275`), inak ho
  `isValidStripePriceId` odmietne aj keď je správne nastavené.

Pri každom nájdenom price zdokumentovať: Price ID · Product · amount · currency ·
recurring interval · active/inactive · test/live.

### Príkaz na VERIFY (spúšťa founder — kľúč nedávať agentovi)

Read-only `GET /v1/prices`, nič nevytvára. Beží s **live** secret key:

```bash
export STRIPE_SECRET_KEY=sk_live_…
bash scripts/ops/stripe-verify-prices.sh
```

Kľúč ide cez premennú prostredia, **nie ako argument** — argument by skončil
v histórii shellu a v zozname procesov. Skript ho číta z `STRIPE_SECRET_KEY`
a bez nej odmietne bežať.

Vypíše `OK` / `MISSING` / `AMBIG` pre každý z deviatich očakávaných kľúčov,
zhrnie `N/9 resolved` a riadky `OK` sú rovno v tvare `KĽÚČ=price_…`, pripravené
na krok B. `AMBIG` = viac cien sedí na tú istú sumu aj interval; vtedy správnu
vyberá founder, agent nehádže.

Overené na mockovaných dátach pred odovzdaním: odmieta `livemode:false`, hlási
duplicity ako `AMBIG` a varuje pri `has_more=true` — nad 100 aktívnych cien je
výpis neúplný a treba stránkovať cez `starting_after`.

Späť sa posiela **iba výstup**. Price ID nie sú tajomstvo, secret key áno.

### Ak existujú → env patch (krok B)

Hodnoty dopĺňa founder zo Stripe, agent ich nehádže ani negeneruje:

```
STRIPE_PRICE_SOLO_SEAT=price_…
STRIPE_PRICE_TEAM_SEAT=price_…
STRIPE_PRICE_OFFICE_SEAT=price_…
STRIPE_PRICE_OWNER_COCKPIT=price_…
STRIPE_PRICE_OWNER_COCKPIT_FOUNDER=price_…
STRIPE_PRICE_CREDITS_START=price_…
STRIPE_PRICE_CREDITS_RAST=price_…
STRIPE_PRICE_CREDITS_PRO=price_…
STRIPE_PRICE_CREDITS_MEGA=price_…
```

**Čiastočný patch je horší než žiadny.** Dôvody v `§ Oprava rozsahu VERIFY`.

Target: `production` (pre preview smoke aj `preview`). Po zápise redeploy —
`process.env` sa číta pri builde/runtime funkcie, existujúci deploy sa sám
neaktualizuje.

### Ak neexistujú → STOP (krok C)

Samostatné GO na vytvorenie Products/Prices. Do tej doby `/upgrade` ostáva
korektne fail-closed — ukazuje „Checkout momentálne nedostupný", čo je pravda,
nie chyba.

## Nález pri príprave VERIFY: `CHECKOUT-ENV-02`

Krok A sa **nesmie** obmedziť na tri seat premenné.

`upgrade/page.tsx:225-234` ponúka checkbox „Owner Cockpit (+X €/mes)" a
pripočítava ho do zobrazenej sumy (`:80`). `buildSeatCheckoutSessionParams`
(`credits-billing.ts:77-82`) ale pridá cockpit line item **len ak**
`getOwnerCockpitStripePriceId()` vráti neprázdnu hodnotu — inak ho ticho
vynechá, bez chyby a bez varovania.

`STRIPE_PRICE_OWNER_COCKPIT` a `STRIPE_PRICE_OWNER_COCKPIT_FOUNDER` sú
v produkcii **MISSING**.

> **Oprava.** Pôvodne tu stálo `STRIPE_PRICE_OWNER_COCKPIT_PRO`. To je iný
> produkt (`COCKPIT_PRODUCTS.ownerPro`, `enabled: false`) a na checkout ceste
> nie je. Dvojica, medzi ktorou `getOwnerCockpitStripePriceId()` reálne vyberá,
> je `OWNER_COCKPIT` a `OWNER_COCKPIT_FOUNDER` — podľa
> `isFounderKancelariaEligible()` (`program-tier-pricing.ts:302-312`).

Dnes je to neviditeľné, lebo sa nikto nedostane ani k seat checkoutu. Ale vo
chvíli, keď sa nastavia len tri seat premenné, zákazník zaškrtne Owner Cockpit,
uvidí vyššiu sumu a zaplatí iba seaty. Preto pri kroku A overiť **deväť** price
objektov (seat ×3 + cockpit ×2 + top-up ×4), alebo pred krokom D skryť cockpit
checkbox.

Fail-closed oprava (`if (!cockpitPrice) throw`) je samostatný code fix, nie
súčasť env patchu.

## Oprava rozsahu VERIFY (2026-09-21, neskôr v ten deň)

**Metóda:** read-only čítanie `origin/main` (`aea1dd2`) + Vercel
`filter_project_envs` bez `decrypt`. Žiadny zápis, žiadny Stripe call.

### Produkčný env prečítaný znova

85 premenných, z toho päť `STRIPE_PRICE_*`: `STARTER`, `PRO`, `MARKET_VISION`,
`PROTOCOL_AUTH`, `ONBOARDING`. Zmienka o seat, cockpit alebo top-up kľúčoch:
**nula**. Oproti rannému čítaniu **bez zmeny** — `CHECKOUT-ENV-01` stále otvorený.

### Prečo deväť a nie tri

| # | Brána v kóde | Vyžaduje | Miesto |
|---|---|---|---|
| 1 | `areSeatCheckoutPricesConfigured()` | **všetky 3** seat ceny | `program-tier-pricing.ts:314` |
| 2 | `areTopupCheckoutPricesConfigured()` | **všetky 4** top-up ceny | `:318` |
| 3 | `getOwnerCockpitStripePriceId()` | `OWNER_COCKPIT` **aj** `_FOUNDER` | `:302-312` |

Tri dôsledky, ktoré pôvodný plán nepokrýval:

**a) `checkoutAvailable` je OR, nie AND.**
`checkout-config/route.ts:22` → `seatCheckoutAvailable || topupCheckoutAvailable`.
Banner teda zmizne už po nastavení troch seat cien. Lenže sekcia top-upov sa
rendruje pod vlastným flagom (`upgrade/page.tsx:295`), takže **ticho zmizne** a
kredity si nikto nekúpi. Vyzerá to opravené a nie je.

**b) Cockpit sa predá zadarmo.** — **OPRAVENÉ v #627 (`2936c56`).**
Pôvodný nález: `credits-billing.ts` → `if (cockpitPrice) lineItems.push(...)`.
Seat cena pri absencii hodila výnimku, cockpit sa **ticho preskočil** — zákazník
zaškrtol Owner Cockpit, videl ho v sume a zaplatil iba seaty.

Dva dodatky k pôvodnému popisu:

- Suma v UI **nie je +349 €**, kým sú voľné founder miesta.
  `isFounderKancelariaEligible()` je dnes `true` (7/20), takže
  `upgrade/page.tsx` renderuje **249 €**. Pôvodný resolver pritom pri
  nenastavenom `_OWNER_COCKPIT_FOUNDER` spadol späť na `_OWNER_COCKPIT` a
  naúčtoval 349 €. To nebol výpadok našej tržby, ale **preplatok zákazníka**.
- Oboje je zavreté: fallback medzi founder a štandardnou cenou je odstránený,
  `buildSeatCheckoutSessionParams` pri chýbajúcej cene **fail-closed hodí**, a
  `/api/billing/checkout-config` vracia `cockpit.ownerPurchasable`, podľa
  ktorého `/upgrade` checkbox vôbec nezobrazí. Zákazník s nastavenými seat
  cenami a chýbajúcimi cockpit cenami teda dostane funkčný seat-only checkout,
  nie chybu.

**Pre VERIFY to nič nemení** — cockpit ceny treba stále overiť, ak ich chceš
predávať. Mení to len to, čo sa stane, keď chýbajú.

**c) Typ ceny musí sedieť, nielen suma.**
Seat session je `mode: "subscription"` (`:114`), top-up `mode: "payment"`
(`:149`). Cockpit ide do **tej istej** session ako seaty → musí byť
`recurring.interval = month`. Jednorazová cockpit cena by celú seat session
zhodila. Obrátene pre top-upy: recurring cena v `mode: "payment"` je chyba.

### Dôsledok pre poradie krokov

Krok B (env patch) má zmysel iba ako **jeden zápis všetkých deviatich**.
Čiastočný patch neopraví `/upgrade`, iba vymení viditeľné zlyhanie
(„Checkout momentálne nedostupný“ — pravdivé) za tiché
(chýbajúce top-upy, nefakturovaný cockpit — nepravdivé a drahšie).

Hranica sa nemení: agent diagnostikuje a pripravuje, price ID zapisuje founder,
vytvorenie ceny je samostatné GO.
