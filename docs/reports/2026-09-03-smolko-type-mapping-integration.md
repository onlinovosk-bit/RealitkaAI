# Integration Report — Smolko `properties.type` = Ostatné

**PR:** docs-only. **Kód mapovania sa v tomto PR nemente.**  
**Prod:** `ypgajkhqtbriqqmyawyv` 3. 9. 2026. Tenant `11111111-1111-1111-1111-111111111111`.  
**Doplnok:** `docs/reports/2026-09-03-realvia-mapper-depth-amendment.md` (`mapTransaction`, zlé 13/14).

## Verdikt

Chyba je v **našom adaptéri**, nie v prázdnom Realvia poli. `payload_raw.advert.category` je vyplnené. `mapCategory` v `apps/crm/src/lib/realvia/processQueue.ts` pozná len 11–20 a default je `'Ostatné'`. Súbor má TODO: *Populate from Realvia číselníky documentation.*

**Navyše:** kódy **13** a **14** sú v mape ako `Dom`, ale tituly ukazujú **byty** — zlé mapovanie, nie len chýbajúce. To je horšie než `Ostatné`.

## Dôkaz (group by)

| `advert.category` | `properties.type` | n | Poznámka |
|---|---|---:|---|
| 30 | Ostatné | 30 | unmapped |
| 12 | Byt | 21 | OK podľa titulov |
| 20 | Ostatné | 15 | v mape zámerne Ostatné |
| **13** | **Dom** | **14** | ⛔ tituly = byty |
| 11 | Byt | 9 | OK |
| 47 | Ostatné | 8 | unmapped |
| 41 | Ostatné | 8 | unmapped |
| 46 | Ostatné | 6 | unmapped |
| 37 | Ostatné | 5 | unmapped |
| 9 | Ostatné | 3 | unmapped |
| **14** | **Dom** | **2** | ⛔ tituly = byty |
| 34, 60, … | Ostatné | zvyšok | unmapped |

Súčet `Ostatné` = **86 / 132 (65,2 %)**. Brief 83/63 % bol nízky (bez stiahnutých).

Význam unmapped kódov **NEZNÁMY** bez oficiálneho číselníka — nehádať z titulov do produkčného mappera.

## `mapTransaction` (súvisiace P0)

Pozri amendment. Realvia posiela 122/123/127; stĺpec = vždy Predaj; **123** (53 ks) ≈ prenájom podľa titulov.

## Mimo tento PR

1. Oficiálny číselník kategórií **aj** transakcií od Realvie.  
2. Founder GO: oprava `mapCategory` + `mapTransaction`.  
3. Samostatné GO: backfill.  
4. Verification: mapped pole vs nezávislý signál (title) v diagnostike — nie ako zdroj číselníka.
