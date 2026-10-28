# Merge `origin/main` do API Cost Governor — klasifikácia konfliktov

Dátum: 2026-10-21. Vetva: `cursor/api-cost-governor-v1-0b41`. PR: #847 (ostáva otvorený, do `main` sa nemerguje).

## Fakt

- `git fetch origin main` posunul `origin/main` na `ddea820c` (`fix(F2): public form capture without exposing the API key (#896)`).
- `git merge origin/main` skončil s konfliktom iba v dvoch súboroch: `memory/decisions.md`, `memory/session-summary.md`. Oba konflikty boli jeden blok na začiatku súboru (obe strany pridávali navrch).
- Zvyšok stromu sa spojil automaticky, vrátane `docs/STATUS.md`. Po merge sa `docs/STATUS.md` zhoduje s `origin/main` (vetva ho od posledného spoločného merge nemenila).
- Po spojení v týchto dvoch súboroch nie je žiadny neuzavretý konfliktový blok.
- `git diff --numstat origin/main -- memory/decisions.md memory/session-summary.md` pred doplnením tohto záznamu: `19 0` a `50 0`. Z `main` sa nič nezmazalo.

## Jednoduché konflikty (opravené)

Oba sú prepend logov, nie súperiaci kód.

| Súbor | Čo prišlo z `main` | Čo ostalo z vetvy | Ako |
| --- | --- | --- | --- |
| `memory/decisions.md` | záznamy 2026-10-21 a 2026-10-20 (cenník GO B, cross-agent, STRUCTURE-FIRST, COACH, PROD migrácie, STRIPE-C, speed) | jeden záznam `2026-10-15 — API Cost Governor v1` vrátane engineering justification | najnovšie z `main`, potom governor, potom spoločný `# Critical Decisions Log` |
| `memory/session-summary.md` | session 2026-10-21 a 2026-10-20 | štyri session 2026-10-16 a 2026-10-15 (placeholder verify, STOP, A/B/C, governor) | session z `main` po 2026-10-20 speed, potom štyri session vetvy, potom `## Session 2026-10-19` a starší chvost |

## Komplikujúce zámery (neprepisované)

Textový konflikt je jednoduchý. V obsahu ostávajú tri rôzne príbehy. Žiadny sa v tomto behu znova nemeral a žiadny sa nezmazal.

1. **Checkout na vetve verzus STRIPE-C na `main`.** Záznamy vetvy z 2026-10-15/16 hovoria: overiť seat a v2, live počty neznáme, odporúčanie A, voľbu B (založiť v2 ceny) nezapínať. Záznam na `main` z 2026-10-20 (`GO STRIPE-C`) hovorí, že zmeraný blokátor je chýbajúce `STRIPE_PRICE_V3_SEAT_MONTHLY` a že osem `STRIPE_PRICE_V2_*` kód už nečíta. Novší zápis je na `main`, ale tento beh Vercel ani Stripe znova nečítal. Historický checklist sa preto neprepisuje na v3.

2. **Dve rôzne „B".** `GO B` z 2026-10-21 na `main` je cena Team: 2 makléri = 50 €. Checkout voľba B v checkliste vetvy je „založiť v2 Price ID". Nie sú to isté rozhodnutie.

3. **BRI migrácia v session logu.** Novšie session z 2026-10-20 hovoria, že `20261020050000` je v PROD (`compute_bri_score` → 12, `lead_scores` 0 → 2). Starší chvost `## Session 2026-10-20 (preflight audit dodávky…)` stále hovorí, že tá istá migrácia na PROD nie je a čaká na `GO PROD-MIGRACIE`. Oba zápisy ostávajú. Starší nie je aktuálny stav a novší sa v tomto behu znova nemeral.

## Čo tento merge nerobí

- Nemerguje PR #847 do `main`.
- Nespúšťa Stripe, nevytvára Price ID, nemení Vercel env ani PROD.
- CI na novom heade sa v tomto behu nečíta. Zelené CI sa netvrdí.
