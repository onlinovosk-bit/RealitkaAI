# Reality Smolko — blocking register ingest + PROD re-check

**Dátum (UTC check):** 2026-09-04 ~08:35 UTC (agent re-run)  
**Project:** `ypgajkhqtbriqqmyawyv`  
**Control doc:** `docs/briefs/reality-smolko-blocking-conditions-register.md`  
**Toto nie je Founder GO** — len ingest + read-only overenie snapshotu.

## Snapshot re-check

| Objekt | Register (oznámené) | Re-check 2026-09-04 | Match |
|---|---:|---:|---|
| `properties` | 133 | 133 | YES |
| Smolko `properties` (`agency_id` = SMOLKO UUID) | 132 | 132 | YES |
| `portal_listings` | 0 | 0 (tabuľka existuje) | YES |
| `property_price_trail` | 0 | 0 (tabuľka existuje) | YES |
| `scheduled_events` | ABSENT | `to_regclass` = null | YES (ABSENT) |

## Kritický nález — SMO-B07 migračný drift

Preflight z registra vrátil:

| Pole | Hodnota |
|---|---|
| `scheduled_events` tabuľka | **null (ABSENT)** |
| `schema_migrations` version `20260527143000` | **true** (`name = event_scheduler_phase1`) |

Teda opak varovania z registra: história tvrdí, že migrácia je zapísaná, objekt však **neexistuje**.  
**Nesmie** sa označiť SMO-B07 ako `DONE` ani „už aplikované“. Pred akýmkoľvek DB GO treba:

1. vysvetliť/zdokumentovať drift,
2. rozhodnúť: re-apply DDL (ak safe) vs. oprava histórie vs. nová migrácia s iným version id,
3. Founder DB GO s checksumom.

## Väzba na otvorené PR / merges

| Item | Stav | Vplyv na register |
|---|---|---|
| [PR #522](https://github.com/onlinovosk-bit/RealitkaAI/pull/522) Realvia agency-scoped source_id | **MERGED** `e574cbede` | **CODE** dôkaz pre časť SMO-B04 (scoped upsert/delete). **Nie** PASS: chýba PROD negative test + freshness contract. |
| [PR #523](https://github.com/onlinovosk-bit/RealitkaAI/pull/523) Sprievodca V0 | open (ak ešte) | Neodblokuje SMO-B04/B05; taxonomy stále Neznáme≈0 / Ostatné=86 |

## Interpretácia stavov (nezmenené)

- SMO-B02/B03: `CODE_PRESENT` (price-trail engine) + `PROD` substrát = 0 → automation `BLOCKED`.
- SMO-B04: inventory 132 ≠ tenancy PASS; #522 pomáha CODE vrstve.
- SMO-B07: tabuľka ABSENT + history drift → booking `BLOCKED`, migrácia nie je „hotová“.

## Ďalší krok (návrh, BRÁNA)

ĎALŠIA ÚLOHA: Founder/Product — držať poradie B01 → B04; Engineering — PROD negative test pre #522 (SMO-B04).  
SMO-B07: **neaplikovať** migráciu preventívne; najprv drift RCA + GO.  
BRÁNA: GO REQUIRED na akúkoľvek DB/OAuth/cron mutáciu.
