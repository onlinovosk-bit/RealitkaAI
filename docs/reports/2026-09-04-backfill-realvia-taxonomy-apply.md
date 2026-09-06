# Backfill Realvia taxonomy — APPLY evidence

**Status:** DONE (founder GO „GO All session“ 2026-09-04)  
**Project:** `ypgajkhqtbriqqmyawyv`  
**agency_id:** `11111111-1111-1111-1111-111111111111` (Smolko)  
**Code:** `main` @ `779e184f5` (#528)  
**Script:** `apps/crm/scripts/backfill-realvia-taxonomy.ts`  
**Applied at (UTC):** 2026-09-04T11:35:41Z

## Dry-run = apply súhrn

| Metrika | n |
|---|---:|
| Properties with advert payload | 132 |
| typ sa zmení | **102** |
| transakcia sa zmení | **64** |
| rooms doplnené (prázdne → category fallback) | **16** |
| bez zmeny | **4** |
| riadkov s aspoň jednou zmenou | **128** |

## PROD postflight (SELECT po apply)

| Metrika | n |
|---|---:|
| Smolko total | 132 |
| `type = Ostatné` | **0** |
| `type = Neznáme` | **0** |
| `transaction_type = Dopyt` | **11** |
| `transaction_type = Prenájom` | **53** |
| `transaction_type = Predaj` | **68** |

Top combos po apply: Pozemok/Predaj 46 · Byt/Prenájom 33 · Komerčná/Prenájom 18 · Dom/Predaj 10 · Byt/Predaj 9 · Byt/Dopyt 7 · …

## Change log

Riadkové `id | pole | z | na` sú v tom istom súbore nižšie (vygenerované skriptom pri `--apply`).

## Rollback / fallback

Žiadny automatický rollback. Obnova len z `payload_raw` + mapper alebo DB backup.  
Sprievodca: Dopyt sa na `/nehnutelnosti` nevykresľuje (partition `demand`).

## Ďalší krok

Párovanie / `/hladame` / dopyty→leady — **samostatné GO**, až teraz majú pravdivé dáta.
