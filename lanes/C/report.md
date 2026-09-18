# Lane C — report

## Najprv som hľadal

- `apps/crm/src/lib/matching.ts` — C-1/C-2 empty===empty scoring; C-3 `includes("")` feature false-positive; location/budget/timeline/financing already guarded.
- `apps/crm/src/lib/__tests__/poprad-gold-matching.test.ts` — assertion `matchScore > 90` (mimo scope; nemenil som).
- Volajúci (`matching-store`, matching API/page) destruktúrujú `{ score, reasons }` — `comparedCriteria` je spätne kompatibilné.

## Čo som zmenil

- `bothPresent()` guard + filter prázdnych features pred porovnaním.
- Návrat `comparedCriteria`.
- Nový `matching.test.ts` (5 testov).
- Baseline report `docs/reports/2026-09-15-business-loop-baseline.md`.

## Dôkaz

- `npm --prefix apps/crm test -- matching` → exit 0 (10 tests / 3 files, vrátane gold).
- `node apps/crm/scripts/check-api-contract.mjs --ci` → exit 0 (0 nových porušení).
- Gold assertion **nespadla** → žiadny `MSG-laneC-gold-test-drop.md`, verdikt nie je HUMAN z tohto dôvodu.

## Zostávajúce riziká

- QUALIFICATION v produkte ostáva 0, kým sa nespustí prepočet (mimo scope, zakázané).
- SQL v baseline je napísané, nie spustené.
- Lane A (judge) je nezávislá a aktuálne BLOCKED (chýbajú pre-supplied súbory).