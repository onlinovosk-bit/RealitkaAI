# Stripe VERIFY — read-only pokus 2026-10-15 (STOP)

**Voľba:** C z `docs/reports/2026-10-15-checkout-env-01-founder-checklist.md`.  
**Vetva:** `cursor/api-cost-governor-v1-0b41`  
**HEAD pred týmto reportom:** `f22babf6`  
**Worktree:** jediný cudzí necommitnutý strom `apps/crm/supabase/.branches/` ostal nedotknutý.

Žiadne Price ID sa nevytvorili. Vercel env, webhook, checkout a databáza sa nemenili. Merge a deploy neboli.

## Príkaz a exit

```text
env -u STRIPE_SECRET_KEY bash scripts/ops/stripe-verify-prices.sh
```

**Exit code: 2.**

Stdout prázdny. Stderr, bez tajomstva:

```text
Nastav STRIPE_SECRET_KEY (rk_live_... alebo sk_live_...) v env, nie ako argument.
```

HTTP volanie na Stripe sa neuskutočnilo. Skript kontroluje kľúč skôr, než zavolá `GET /v1/prices`. `--test-create` ani `--spec` som nespúšťal.

## Prečo STOP

Skript `scripts/ops/stripe_verify_prices.py` je read-only: jediná sieťová operácia je `GET /v1/prices`. Širšie oprávnenie na zápis nevyžaduje. Toto GO však povoľuje len restricted live kľúč s čítaním Prices (`rk_live_`).

| Miesto | Stav |
|---|---|
| Procesné `STRIPE_SECRET_KEY` | UNSET |
| `rk_live_` kľúč v env súboroch | nie je. Zhoda `rk_live` v dokumentácii je placeholder v návode, nie kľúč |
| `apps/crm/.env.local` | `STRIPE_SECRET_KEY` je trieda `sk_test`. Skript testovací kľúč odmieta (exit 2), lebo test mode by ukázal 0/N a zviedol k záveru, že live ceny neexistujú. Nespúšťal som ho |
| `.vercel/.env.production.local` | súbor chýba. Produkčný env som nečítal |
| Stripe MCP | `needsAuth`. Neprihlasoval som ho a nepoužil som ho ako náhradu za restricted kľúč |

Kľúč do chatu, argumentu ani do tohto súboru nepatrí. Foundera o vloženie kľúča nežiadam.

## Počty

Live účet dnes **nebol prečítaný**. Počet nájdených cien je preto **neznámy**, nie nula.

Manifest, ktorý by skript porovnával, keby kľúč bol (`scripts/ops/stripe-expected-prices.json`), má 24 očakávaní. To nie sú nájdené ceny:

| Brána | Očakávané položky v manifeste | Nájdené dnes |
|---|---:|---|
| seat (`STRIPE_PRICE_SOLO_SEAT`, `STRIPE_PRICE_TEAM_SEAT`, `STRIPE_PRICE_OFFICE_SEAT`) | 3 | neoverené |
| pricing_v2 (`STRIPE_PRICE_V2_*`, 4 mesačné plány, 4 ročné, 5 balíkov, 1 kredit) | 14 | neoverené |
| cockpit | 2 | neoverené |
| topup | 4 | neoverené |
| starter_pack | 1 | neoverené |

Seat a v2 sú rôzne kľúče. Septemberový report `docs/reports/2026-09-22-stripe-verify-prices.md` (0/9) ostáva historický výpis. Nie je to dnešný stav účtu.

## Čo ostáva neoverené

- Živý zoznam Stripe cien (seat, v2, cockpit, topup, starter pack).
- `tax_behavior` a tax code, aj keby verify neskôr prebehol. Skript ich pri v2 kontroluje len ak je produkt expandovaný. Dnešok sa k tomu nedostal.
- Vercel Production env (či sú `STRIPE_PRICE_*` nastavené).
- Webhook a `STRIPE_WEBHOOK_SECRET`.
- Či tri kancelárie platia faktúrou.

## Ďalšie rozhodnutie

Existenciu cien tento beh **nepreukázal**. Možnosť B (zakladať v2 ceny a zapnúť checkout) **neaktivujem**.

Odporúčanie, kým nie je čerstvý live výpis: **A** — samoobslužný checkout nechať zatvorený a predaj riešiť faktúrou. A nie je zistenie, že na účte je 0 cien. Je to rozhodnutie, že bez dôkazu ceny nezapíname.

Ak má restricted kľúč (`rk_live_`, Prices: Read, nič iné) byť k dispozícii tomuto prostrediu inak než vložením do chatu, ďalší beh je znova ten istý skript. Výsledok `N/24` a riadky podľa brán patria do nového reportu. Price ID môže report obsahovať. Secret key nie.
