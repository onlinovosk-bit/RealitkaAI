# Phase 4 — cost route advisor

## Rozsah

Pridať `selectRoute` do `packages/bus-core/src/cost-governor.ts`. Vyberie najlacnejšieho kandidáta, ktorý prejde meranou latkou, a pri vyčerpanom rozpočte vráti BLOCK. Produkčný model neprepne.

## Znovupoužitie

Existujúci `CostGovernor`, limity `INTERNAL_GOVERNOR_LIMITS` a prázdny default katalóg sa nemenia. `authorize` ostáva.

## Akceptačné kritériá

- `node --test packages/bus-core/tests/cost-governor.test.ts` končí exit 0.
- Fixture case `case-alpha` vyberie lacnejší model so skóre nad latkou `0.8` a `applied` je false.
- Kandidát bez `price_source` `configured_snapshot` vráti `INCOMPLETE`.
- `budget_remaining_usd` null vráti `BLOCK` `budget_unknown`.
- `apply_switch` v `production` vráti `BLOCK` `production_switch_forbidden`.
- Hodnoty `INTERNAL_GOVERNOR_LIMITS` ostanú 0.5, 5 a 25.

## Riziká

- Čísla vo fixture nie sú vendor cenník. Živé ceny sú NEMERANÉ.
- Strategic Backlog model-router ostáva: toto nie je automatický produkčný prepínač.

## Brány

- Žiadna zmena produkčných limitov, žiadny nákup kreditov, žiadny deploy.

## Kroky

1. Pridať čistú funkciu `selectRoute` bez hardcoded mien modelov a cien.
2. Pridať testy latky, neúplnej ceny, rozpočtu, retry limitu a zákazu produkčného prepnutia.
3. Spustiť existujúcu sadu `cost-governor.test.ts` aj nové prípady.

## Mimo rozsahu

- Zmena `INTERNAL_GOVERNOR_LIMITS`, napojenie CRM call site, živý cenník, automatický switch v produkcii.
