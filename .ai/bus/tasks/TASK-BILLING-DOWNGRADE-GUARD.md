---
id: TASK-BILLING-DOWNGRADE-GUARD
type: task
status: done
owner: claude
created_at: 2026-09-22T00:00:00Z
closed_at: 2026-09-23T00:00:00Z
reassigned_from: cursor
reassignment_reason: "cursor never picked the card up — it ran WALL 2 (UPTM-004) in uptm-runner instead; founder reassigned on 2026-09-23"


scope:
  repo_paths:
    - apps/crm/src/lib/billing-store.ts
    - apps/crm/src/lib/__tests__/billing-store.test.ts
    - .ai/bus/tasks/TASK-BILLING-DOWNGRADE-GUARD.md
  forbidden_paths:
    - apps/crm/src/lib/program-tier-pricing.ts
    - apps/crm/src/lib/credits-billing.ts
    - apps/crm/src/app/**
    - apps/crm/supabase/**
    - packages/bus-core/**
    - scripts/**
    - .github/workflows/**

acceptance:
  - id: A1
    desc: "regresny test padne na SUCASNEJ implementacii a prejde po oprave"
    expect: "oba vystupy v reporte — cerveny pred, zeleny po"
  - id: A2
    desc: "cely lib suite prechadza"
    cmd: "npx vitest run src/lib/__tests__/"
    expect: exit_code == 0
  - id: A3
    desc: "lint cisty"
    cmd: "npm run lint"
    expect: exit_code == 0
  - id: A4
    desc: "typecheck baseline sa nezhorsil"
    cmd: "node scripts/typecheck-baseline.mjs"
    expect: exit_code == 0
  - id: A5
    desc: "diff nevysiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
  - id: A6
    desc: "skutocny downgrade Enterprise -> PRO NADALEJ zamyka"
    expect: "test to dokazuje, oprava nesmie zrusit spravne spravanie"

budget:
  max_iterations: 6
  max_cost_usd: 4
  max_runtime_minutes: 45

risk: high

evidence:
  files:
    - apps/crm/src/lib/billing-store.ts
    - apps/crm/src/lib/l99/entitlements.ts
---

# BILLING GUARD — falosny downgrade lock

## Chyba

`billing-store.ts`, handler `customer.subscription.updated` (~`:548-563`):

```ts
const previousPriceId = (event.data.previous_attributes as any)?.items?.data?.[0]?.price?.id;
const wasEnterprise =
  previousPriceId === process.env.STRIPE_PRICE_ENTERPRISE ||
  previousPriceId === process.env.STRIPE_PRICE_MARKET_VISION;
```

Stripe plni `previous_attributes` **iba pre polia, ktore sa zmenili**. Pri beznom
update (obnova, zmena platobnej metody, `cancel_at_period_end`) sa polozka
nemeni, takze `previousPriceId` je `undefined`.

`STRIPE_PRICE_ENTERPRISE` **nie je nastavene v produkcii** — overene citanim
Vercel env (85 premennych; su tam len `STARTER`, `PRO`, `MARKET_VISION`,
`PROTOCOL_AUTH`, `ONBOARDING`).

Takze `undefined === undefined` → `true` → `wasEnterprise = true` pre kazdeho.

## Dosledok

Pre zakaznika, ktoreho cena **nie je** `MARKET_VISION`:

  wasEnterprise = true, isEnterprise = false
  → isDowngradeFromEnterprise = true
  → syncAccountTier(..., { lockDowngrade: true })
  → do profilu sa zapise tier_locked_at + tier_downgraded_from = "enterprise"

`entitlements.ts:25` kontroluje `isLocked` **pred** tierom, takze zakaznik
dostane hlasku „Enterprise data su zamknute. Obnovit Enterprise plan" namiesto
„vyzaduje Enterprise plan". A do DB sa zapise, ze klesol z Enterprise — hoci
nim nikdy nebol.

`account_tier` ostava spravny: `resolvePlanKeyFromStripePriceId` ma na zaciatku
`if (!priceId) return "unknown"`, ten guard je v poriadku. Chyba je **iba** v
tom handleri.

## Uloha

Oprav porovnanie tak, aby sa downgrade logika aktivovala **iba pri skutocne
rozpoznanych production price ID**, nie pri `undefined === undefined`.

Pridaj regresny test, ktory na **sucasnej** implementacii padne.

## Testy, ktore maju vzniknut

| # | Scenar | Ocakavanie |
|---|---|---|
| 1 | `subscription.updated` bez zmeny polozky (`previous_attributes` bez `items`), zakaznik na PRO | **ziadny lock** — dnes sa zapise, to je ta chyba |
| 2 | to iste, ale `STRIPE_PRICE_ENTERPRISE` je nastavene | ziadny lock |
| 3 | skutocny downgrade `MARKET_VISION` → PRO | **lock ostava** — spravne spravanie sa nesmie zrusit |
| 4 | upgrade PRO → `MARKET_VISION` | `resetLock` |

## Hranice

- **Ziadne Stripe API mutacie.** Ziadne vytvaranie cien.
- **Ziadny env patch.**
- **Ziadna migracia Smolka.**
- **Ziadne BUS/runner zmeny.**
- Legacy program env premenne sa **nemazu** — Smolko je na nich. Resolver je
  aditivny, seat ceny pribudnu vedla nich, nie namiesto nich.
- Ak by oprava vyzadovala zmenu vo `forbidden_paths`, **zastav a napis preco**.

## Otvorena otazka — nezodpovedaj ju kodom

Ma `STRIPE_PRICE_ENTERPRISE` vobec existovat? Ak je Enterprise dnes
reprezentovany cez `MARKET_VISION`, ta vetva moze byt mrtvy kod. **Neodstranuj
ju** — iba to uved v reporte ako zistenie pre foundera.

## Vystup

- cerveny vystup pred opravou, zeleny po
- testy
- co si NEurobil a preco (najma ta otvorena otazka)

**STOP.** Po dodani nepokracuj.
