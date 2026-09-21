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

| env premenná | tier | `unit_amount` | `currency` | `recurring.interval` | min. množstvo |
|---|---|---|---|---|---|
| `STRIPE_PRICE_SOLO_SEAT` | solo | `7900` | `eur` | `month` | 1 |
| `STRIPE_PRICE_TEAM_SEAT` | team | `7100` | `eur` | `month` | 3 |
| `STRIPE_PRICE_OFFICE_SEAT` | office | `6300` | `eur` | `month` | 10 |

Zdroj čísel: `program-tier-pricing.ts` `PLAN_PRICES_EUR` (79/71/63) a
`SEAT_TIER_CONFIG.minSeats`.

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

Read-only `GET`, nič nevytvára. Beží s **live** secret key:

```bash
curl -s https://api.stripe.com/v1/prices \
  -u "sk_live_…:" \
  -d active=true -d limit=100 -G \
  -d "expand[]=data.product" \
| python3 -c "
import json,sys
for p in json.load(sys.stdin)['data']:
    r=p.get('recurring') or {}
    prod=p.get('product') or {}
    print(f\"{p['id']:32s} {str(p.get('unit_amount')):>7s} {p.get('currency')} \"
          f\"{r.get('interval','ONE-TIME'):>8s} active={p.get('active')} \"
          f\"live={p.get('livemode')} :: {prod.get('name') if isinstance(prod,dict) else prod}\")
"
```

Hľadáme tri riadky s `7900 eur month`, `7100 eur month`, `6300 eur month`.

### Ak existujú → env patch (krok B)

Hodnoty dopĺňa founder zo Stripe, agent ich nehádže ani negeneruje:

```
STRIPE_PRICE_SOLO_SEAT=price_…
STRIPE_PRICE_TEAM_SEAT=price_…
STRIPE_PRICE_OFFICE_SEAT=price_…
```

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

`STRIPE_PRICE_OWNER_COCKPIT` a `STRIPE_PRICE_OWNER_COCKPIT_PRO` sú v produkcii
**MISSING**.

Dnes je to neviditeľné, lebo sa nikto nedostane ani k seat checkoutu. Ale vo
chvíli, keď sa nastavia len tri seat premenné, zákazník zaškrtne Owner Cockpit,
uvidí vyššiu sumu a zaplatí iba seaty. Preto pri kroku A overiť **päť** price
objektov (seat ×3 + cockpit ×2), alebo pred krokom D skryť cockpit checkbox.

Fail-closed oprava (`if (!cockpitPrice) throw`) je samostatný code fix, nie
súčasť env patchu.
