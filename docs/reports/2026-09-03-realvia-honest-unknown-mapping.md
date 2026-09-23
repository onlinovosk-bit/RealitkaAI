# Report — GO P0 HONEST UNKNOWN MAPPING

**Dátum:** 2026-09-03  
**GO:** `GO P0 HONEST UNKNOWN MAPPING`  
**Vetva:** `feat/realvia-honest-unknown-mapping`  
**Backfill 132 riadkov:** mimo rozsah (samostatné GO)

## Zmena

| Predtým | Potom |
|---|---|
| `mapCategory` `?? 'Ostatné'` | `?? 'Neznáme'` |
| `mapTransaction` `?? 'Predaj'` | `?? 'Neznáme'` |
| 13, 14 → `Dom` | → `Neznáme` (sporné; nehádať Byt) |
| 123 → `Predaj` | → `Neznáme` (sporné; nehádať Prenájom) — rovnaký pattern ako 13/14 voči fogging 122/123/127 |
| 19, 20 → `Ostatné` | ostáva (legitímna kategória) |
| 124 / 125 | Prenájom / Dražba |

Modul: `apps/crm/src/lib/realvia/map-taxonomy.ts`  
Guardian: `unverified_property_type` / `unverified_transaction_type` pri `Neznáme` → FLAG + blockedPublish.

## Tabuľka kódov (Smolko prod, 132) — diagnostika z nálezu

### category → type (po tejto zmene, **nové syncy**)

| Realvia | ks | starý type | nový type |
|---:|---:|---|---|
| 30 | 30 | Ostatné | **Neznáme** |
| 12 | 21 | Byt | Byt |
| 20 | 15 | Ostatné | Ostatné |
| 13 | 14 | Dom | **Neznáme** |
| 11 | 9 | Byt | Byt |
| 47 | 8 | Ostatné | **Neznáme** |
| 41 | 8 | Ostatné | **Neznáme** |
| 46 | 6 | Ostatné | **Neznáme** |
| 37 | 5 | Ostatné | **Neznáme** |
| 9 | 3 | Ostatné | **Neznáme** |
| 14 | 2 | Dom | **Neznáme** |
| 34, 60, … | zvyšok | Ostatné | **Neznáme** |

Existujúce DB riadky **neprechádzajú** backfillom — ostávajú staré hodnoty do samostatného GO.

### transaction → transaction_type

| Realvia | ks | starý | nový (sync) | title ~ prenájom |
|---:|---:|---|---|---:|
| 127 | 68 | Predaj | **Neznáme** | 0 |
| 123 | 53 | Predaj | **Neznáme** | 44 |
| 122 | 11 | Predaj | **Neznáme** | 0 |

## STOP / ďalej

- Žiadny backfill  
- Žiadny číselník z titulov  
- Oficiálny číselník od Realvie stále treba  
- Po merge tohto PR: `GO IMPLEMENT PROPERTY LAUNCH PACK V0`  
- #481: ready + merge tento týždeň (hygiena)
