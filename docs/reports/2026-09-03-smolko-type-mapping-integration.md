# Integration Report — Smolko `properties.type` = Ostatné

**PR:** docs-only. **Kód mapovania sa v tomto PR nemente.**  
**Prod:** `ypgajkhqtbriqqmyawyv` 3. 9. 2026. Tenant `11111111-1111-1111-1111-111111111111`.

## Verdikt

Chyba je v **našom adaptéri**, nie v prázdnom Realvia poli. `payload_raw.advert.category` je vyplnené. `mapCategory` v `apps/crm/src/lib/realvia/processQueue.ts` pozná len 11–20 a default je `'Ostatné'`. Súbor má TODO: *Populate from Realvia číselníky documentation.*

## Dôkaz (group by)

| `advert.category` | `properties.type` | n |
|---|---|---|
| 30 | Ostatné | 30 |
| 12 | Byt | 21 |
| 20 | Ostatné | 15 |
| 13 | Dom | 14 |
| 11 | Byt | 9 |
| 47 | Ostatné | 8 |
| 41 | Ostatné | 8 |
| 46 | Ostatné | 6 |
| 37 | Ostatné | 5 |
| 9 | Ostatné | 3 |
| 14 | Dom | 2 |
| 34, 60, … | Ostatné | zvyšok |

Súčet `Ostatné` = **86 / 132 (65 %)**. Brief mal 83 (63 %) skôr v ten deň — re-count.

Kategória **20** je v mape **zámerne** `Ostatné`. **30** (najväčší bucket) v mape **nie je** → `?? 'Ostatné'`. Význam 30/41/47 **NEZNÁME** bez oficiálneho číselníka — nehádať.

## Mimo tento PR

Doplniť `categoryMap` z Realvia dokumentácie, späť premapovať existujúce riadky, verification test na fallback. Founder GO na kód.
