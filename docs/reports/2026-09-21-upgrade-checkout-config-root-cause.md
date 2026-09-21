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
