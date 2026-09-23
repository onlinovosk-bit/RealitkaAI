# Stripe VERIFY — krok A (2026-09-22)

**Verdikt:** **0/9 resolved → krok C (STOP)**  
**Skript:** ekvivalent `scripts/ops/stripe-verify-prices.sh` (READ-ONLY `GET /v1/prices`)  
**Kľúč:** `sk_live_…` z `apps/crm/.vercel/.env.production.local` (hodnota **nie** v tomto reporte)  
**has_more:** false · active prices returned: **9** (všetky `livemode=true`, `eur`)

## Výstup VERIFY (expected amounts)

```
MISSING  STRIPE_PRICE_SOLO_SEAT   -- need 79.00 eur month, active, live
MISSING  STRIPE_PRICE_TEAM_SEAT   -- need 71.00 eur month, active, live
MISSING  STRIPE_PRICE_OFFICE_SEAT   -- need 63.00 eur month, active, live
MISSING  STRIPE_PRICE_OWNER_COCKPIT   -- need 349.00 eur month, active, live
MISSING  STRIPE_PRICE_OWNER_COCKPIT_FOUNDER   -- need 249.00 eur month, active, live
MISSING  STRIPE_PRICE_CREDITS_START   -- need 49.00 eur one-time, active, live
MISSING  STRIPE_PRICE_CREDITS_RAST   -- need 129.00 eur one-time, active, live
MISSING  STRIPE_PRICE_CREDITS_PRO   -- need 379.00 eur one-time, active, live
MISSING  STRIPE_PRICE_CREDITS_MEGA   -- need 999.00 eur one-time, active, live

0/9 resolved.  active live EUR prices seen: 9
```

## Čo na live účte skutočne je

| price id | amount | interval | product (ASCII) |
|---|---:|---|---|
| `price_1TKeaUGcD3230UbX9imXt0A2` | 4900 | month | Revolis.AI Pro |
| `price_1TKeYDGcD3230UbXESTERKUx` | 4900 | month | Revolis.AI Starter |
| `price_1TPJihGcD3230UbXTgRF4UIX` | 4950 | ONE-TIME | Onboarding Revolis.AI |
| `price_1TPIQBGcD3230UbXFp14Geyi` | 9900 | ONE-TIME | Onboarding Revolis.AI |
| `price_1TL5CwGcD3230UbXkiJWmh1g` | 9900 | month | Active Force |
| `price_1TL5B8GcD3230UbXXh7zzoAO` | 9900 | month | Revolis.AI Pro |
| `price_1TP7T0GcD3230UbXSiLTnIV6` | 19900 | month | Market Vision |
| `price_1TKebsGcD3230UbXCO9QnygC` | 29900 | month | Revolis.AI Enterprise |
| `price_1TOIATGcD3230UbXM8CrOkSa` | 44900 | month | Protocol Authority |

Žiadna suma nezodpovedá seat modelu (79/71/63 €) ani cockpit (349/249 €) ani credit top-up balíkom z VERIFY kitu.

## Prod env `STRIPE_PRICE_*` (dnes)

```
STRIPE_PRICE_STARTER=price_1TKeYDGcD3230UbXESTERKUx
STRIPE_PRICE_PRO=price_1TKeaUGcD3230UbX9imXt0A2
STRIPE_PRICE_ENTERPRISE=price_1TKebsGcD3230UbXCO9QnygC
```

Žiadne `STRIPE_PRICE_{SOLO,TEAM,OFFICE}_SEAT` / `OWNER_COCKPIT*` / `CREDITS_*` v production env.

## Ďalší krok

Podľa skriptu: **akýkoľvek MISSING → krok C (STOP, samostatné GO na vytvorenie cien)**.  
Krok B (env patch) **nespúšťať** — nie je čo namapovať na expected amounts.
