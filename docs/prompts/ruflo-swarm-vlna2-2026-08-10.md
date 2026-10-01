# RUFLO SWARM — VLNA 2 (spusti, keď dobehne Vlna 1)

**Cieľová cesta:** `docs/prompts/ruflo-swarm-vlna2-2026-08-10.md`
**Predpoklad:** L3 report hotový (PR #381) — jeho zistenia sú vstupom pre L5.
**Režim:** founder klika Day 1–2. **ŽIADNY MERGE, ŽIADNY PUSH DO MAIN.**
Vetva + PR + STOP.

---

## ⚠️ Najprv oprava interpretácie L3 (dôležité — inak sa L5 zbytočne zablokuje)

L3 zistila: **`leads` nemá `UNIQUE(agency_id, id)`.**
Znie to ako blokátor PR-S0.1. **Nie je.** Presné zaradenie:

| Composite FK | Cieľová tabuľka | Vyžaduje UNIQUE na | Stage |
|---|---|---|---|
| `acquisition_campaigns(agency_id, acquisition_account_id)` | `acquisition_accounts` | **novej tabuľke** — pridáme si ho sami | **Stage 0** ✅ |
| `acquisition_conversions(agency_id, lead_id)` | `leads` | `leads(agency_id, id)` ❌ chýba | **Stage 2** |

`acquisition_events.lead_id` je v blueprinte **jednoduchý** FK
(`REFERENCES leads(id)`), nie composite → Stage 0 nie je blokovaný.

**Rozhodnutie foundera (zapíš do PR-S0.1 description):**
`UNIQUE(agency_id, id)` na `leads` sa **NErieši v Stage 0**. Je to zmena
existujúcej tabuľky a Stage 0 má hranicu „čisto aditívne, žiadna zmena
existujúcich tabuliek". Rieši sa samostatným PR pred Stage 2, keď vzniká
`acquisition_conversions`. Do `docs/architecture/acquisition-os-stage0-zisti-report.md`
doplň sekciu „Odložené na Stage 2" s týmto bodom, nech sa nestratí.

**Druhé zistenie L3 — service account funguje bez Workspace DWD** → cesta
service accountu je POTVRDENÁ, OAuth fallback sa nepoužije. Zapíš to
do reportu ako uzavreté rozhodnutie.

---

## Dôkaz neprekrytia — Vlna 2

| Lane | Zapisuje výhradne do | Migrácia | Kolízia s Vlnou 1 |
|---|---|---|---|
| **L5** PR-S0.1 | `apps/crm/supabase/migrations/<ts>_acquisition_core.sql` (NOVÝ) + `apps/crm/src/lib/acquisition/__tests__/` (NOVÝ adresár) | 1 nová, aditívna | žiadna — Vlna 1 migrácie nemá |
| **L6** PR-C2 | `.github/workflows/preview-playwright-smoke.yml` **alebo** `apps/crm/package.json` | nie | žiadna |
| **L7** Ads klient | `apps/crm/src/lib/acquisition/google-ads-client.ts` (NOVÝ) + jeho testy | nie | žiadna — L5 sa `lib/acquisition/` zdrojov nedotýka, len testov |
| **L8** Smolko sledovanie | `docs/sales/smolko-status-2026-08-10.md` (NOVÝ) | nie | žiadna — read-only |

⚠️ **L5 a L7 zdieľajú adresár `lib/acquisition/`**, ale nie súbory:
L5 píše len do `__tests__/`, L7 len `google-ads-client.ts`. Ak by ktorýkoľvek
lane potreboval siahnuť na súbor toho druhého → **STOP a report**, nie merge.

---

## LANE 5 — PR-S0.1: migrácia acquisition tabuliek `feat/acquisition-s01-migracia`

Podľa `docs/prompts/acquisition-os-stage0-execution.md`, blok PR-S0.1.
Vstup: `docs/architecture/acquisition-os-stage0-zisti-report.md` (PR #381)
— RLS vzor a signatúru `profile_agencies_for_auth()` ber odtiaľ, nehádaj.

Jedna migrácia `<timestamp>_acquisition_core.sql`:
- `acquisition_accounts`, `acquisition_campaigns`, `acquisition_events`
  presne podľa blueprintu §3.3
- `acquisition_accounts` dostane `UNIQUE(agency_id, id)` — bez toho composite
  FK z child tabuliek nefunguje
- `acquisition_events`: append-only → `REVOKE UPDATE, DELETE FROM authenticated`
- RLS na všetkých troch, politika **kopíruje** vzor z leads, nevymýšľa druhý
- Indexy podľa blueprintu

**6 testov (bez nich sa PR neotvára):**
1. migrácia prejde na čistej lokálnej Supabase
2. ⭐ cross-tenant RLS pre všetky 3 tabuľky (agentúra A nevidí ani riadok B)
3. composite FK odmietne mismatch (agency A + account B) — toto je dôvod
   existencie composite FK, musí mať test
4. append-only: UPDATE aj DELETE na `acquisition_events` pod `authenticated` zlyhá
5. `UNIQUE(agency_id, provider, provider_event_id, event_type)` dedupuje
6. existujúce testy prechádzajú nezmenené

NEROB: žiadna zmena existujúcich tabuliek (vrátane `leads`), žiadny aplikačný
kód, žiadna npm závislosť, žiadne volanie Google API.

## LANE 6 — PR-C2: chýbajúci smoke skript `chore/ci-vlna2-c2`

Z `docs/prompts/pr-ci-vlna2.md` vykonaj **IBA PR-C2** (C1 je hotový = PR #377).
`preview-playwright-smoke.yml:38` volá `npm run test:smoke:preview`, ktorý
v `apps/crm/package.json` neexistuje → workflow zlyháva vždy.
Najprv zisti, či smoke test v repe existuje (aj v histórii), potom podľa
zadania buď doplň skript, alebo workflow poctivo vypni s komentárom.
Nevymýšľaj tretiu cestu bez reportu.

## LANE 7 — PR-S0.3: Google Ads klient-wrapper `feat/acquisition-s03-klient`

Podľa exekučného balíka, blok PR-S0.3. **Celé s mockmi — žiadne živé volanie,
žiadne credentials, CI nesmie potrebovať sieť.**
- `google-ads-client.ts`: auth rozhranie (implementácia credentials až PR-S0.2),
  rate limit z env `GOOGLE_ADS_RATE_LIMIT_PER_TENANT`, retry, exponential backoff
- Testy: backoff rastie exponenciálne · rate limit blokuje nad limit ·
  retry sa vzdá po max pokusoch · chyba sa nepohltí ticho
- Žiadna nová npm závislosť (fetch stačí)

## LANE 8 — Smolko: stav a čo mu dlžíme (read-only, `docs/smolko-status`)

Zosumarizuj do `docs/sales/smolko-status-2026-08-10.md` **iba z repa a git
histórie** (žiadny email, žiadne odosielanie):
1. Čo bolo Smolkovi sľúbené a kedy (prehľadaj `docs/sales/`)
2. Čo je z toho reálne nasadené na produkcii (podľa mergnutých PR — city
   anchors #372/#373 áno; atribúcia NBS a listing generator?)
3. Čo je hotové v repe, ale ešte nenasadené
4. Otvorené otázky voči nemu (napr. sú ľubotické pozemky susediace?)
Výstup je podklad pre foundera, **nie email**. Žiadne drafty, žiadne odoslanie.

---

## Spoločné pravidlá (rovnaké ako Vlna 1)

1. **Merge = NIKDY.** Push len vlastnej feature vetvy, otvor PR, STOP.
2. Žiadne credentials do kódu, logov, promptov.
3. Konflikt s existujúcim kódom → STOP + zápis do PR, nie improvizácia.
4. Návrh „zregeneruj a commitni index/baseline" pri prázdnom diffe zdrojov =
   **zakázané** (tiché pravidlo T10, GUARD_BYPASS).
5. Nemôžeš splniť zadanie → výstupom je REPORT prečo.

## Checklist pre foundera po Vlne 2

1. L6 (CI) — mergni prvý, je najmenší a odblokuje zelené checky ostatným
2. L5 (migrácia) — review testov, hlavne cross-tenant; **merge ≠ aplikácia
   na prod**, migráciu nasadíš vedome a v pokoji
3. L7 (klient) — review, merge
4. L8 (Smolko status) — prečítaj, rozhodni, čo mu napíšeš
5. Day 1–2 hodnoty → až potom PR-S0.2 (credentials)
