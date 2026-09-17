# Integration Report — Property Launch Pack V0

**Baseline:** `origin/main` @ `b746865427428a084fd505c5f59d0af9d540585e` (2026-09-03)  
**Prod:** `ypgajkhqtbriqqmyawyv` · SELECT 3. 9. 2026  
**Tenant:** Reality Smolko `11111111-1111-1111-1111-111111111111`  
**Pravidlo:** audit kódu ≠ audit dát — každý „máme“ má počet riadkov.  
**P0 (2026-09-03):** `GO P0 HONEST UNKNOWN MAPPING` — neznámy kód → `Neznáme` (nie fog do Ostatné/Predaj). Report: `docs/reports/2026-09-03-realvia-honest-unknown-mapping.md`. Backfill existujúcich riadkov = mimo.

---

## Verdikt

Dve paralelné cesty už existujú v kóde, ale **nie sú zjednotené**:

| Cesta | Čo produkuje | Prod napojenie |
|---|---|---|
| A — manuálny KF1 | multi-channel JSON (portal / FB / IG / email / SEO) | API žije; persist tabuľka **chýba** |
| B — Realvia Wave 1 | template listing + banners + deck + microsite + score | číta `properties` (132 Smolko); publish **blokovaný** |

V0 = **jeden kanonický vstup** → generácia kanálov (A) + pack artefakty (B) → **jeden Quality Guardian** → ľudské schválenie → **export** (nie publish).

**Jediná nová vec (až po implementačnom GO):** tenký orchestrátor + adapter vstupov + UI/API „launch pack“ nad existujúcimi knižnicami. **Žiadna nová tabuľka.**

---

## Produkčný stav tabuliek (Smolko / globál)

| Objekt | Prod stav | Riadky | Poznámka pre Launch Pack |
|---|---|---|---|
| `properties` | tabuľka je | **133** (z toho **132** Smolko) | kanonický Realvia zdroj |
| `portal_listings` | tabuľka je | **0** | nepoužiť ako dôkaz publikácie |
| `property_price_trail` | tabuľka je | **0** | mimo V0 |
| `valuation_estimates` | tabuľka je | **5** | mimo V0 |
| `ai_action_audit` | tabuľka je | **30** | log; nie stavový store |
| `ai_generations` | **tabuľka nie je** (`to_regclass` = null) | — | migrácia v repe `20260803120000_ai_generations.sql` **neaplikovaná** |
| `scheduled_events` | **tabuľka nie je** | — | mimo V0 |

### Smolko inventory (132) — z priloženej analýzy + re-count

Zdroj analýzy: founder súbor `task3opravyroadmap.md` (83× Ostatné = **63 %**).  
Re-count ten istý deň: **86× Ostatné = 65 %**. V reportoch uvádzame obe; rozhodnutia sa nemenia.

| Zistenie | Brief (príloha) | Re-count 3. 9. |
|---|---|---|
| `status = Aktívna` | 128 | 128 |
| `status = Stiahnutá` | 4 | 4 |
| `status = Predaná` | **0** | **0** |
| `type = Ostatné` | **83 (63 %)** | **86 (65 %)** |
| `type = Byt` / `Dom` | — | 30 / 16 |
| bez ceny | 41 (31 %) | 41 |
| `usable_area = 0` | 50 (38 %) | 50 |
| `transaction_type` | všetko Predaj | Predaj **132**, prenájom **0** |
| `created_at` | sync, nie inzerát | 2026-05-25 → 2026-08-28 UTC |

---

## Prečo ~65 % vyzeralo ako `Ostatné` — a čo robí P0 honest unknown

**Nie** preto, že Realvia posiela prázdnu kategóriu.  
**Áno** preto, že starý `mapCategory` mapoval len 11–20 a **zahmlieval** neznáme do `'Ostatné'`. To isté `mapTransaction` → `'Predaj'`.

**Po `GO P0 HONEST UNKNOWN MAPPING`:** modul `apps/crm/src/lib/realvia/map-taxonomy.ts`

- Neznámy kód → **`Neznáme`** (nie Ostatné / Predaj)
- 19/20 ostávajú legitímne `Ostatné`
- 13/14 a 123 → `Neznáme` (sporné; nehádať z titulov)
- Guardian: `unverified_property_type` / `unverified_transaction_type` → FLAG
- **Backfill 132 riadkov mimo** — existujúce DB hodnoty sa nemenia, kým nie je samostatné GO
- **Launch Pack V0** pri čítaní riadku aplikuje `mapCategory`/`mapTransaction` na `payload_raw.advert` kódy (bez zápisu do DB, bez titulov) — preto Guardian na existujúcom inventory uvidí `Neznáme` aj pred backfillom


### category (Smolko 132) — diagnostika + efekt na **nové** syncy

| Realvia | ks | starý type | nový sync |
|---:|---:|---|---|
| 30 | 30 | Ostatné | Neznáme |
| 12 | 21 | Byt | Byt |
| 20 | 15 | Ostatné | Ostatné |
| 13 | 14 | Dom | Neznáme |
| 11 | 9 | Byt | Byt |
| 47 | 8 | Ostatné | Neznáme |
| 41 | 8 | Ostatné | Neznáme |
| 46 | 6 | Ostatné | Neznáme |
| 37 | 5 | Ostatné | Neznáme |
| 9 | 3 | Ostatné | Neznáme |
| 14 | 2 | Dom | Neznáme |
| 34, 60, … | zvyšok | Ostatné | Neznáme |

### transaction (mapTransaction — v pôvodnom #511 chýbal)

| Realvia | ks | starý | nový sync | title ~ prenájom |
|---:|---:|---|---|---:|
| 127 | 68 | Predaj | Neznáme | 0 |
| 123 | 53 | Predaj | Neznáme | 44 |
| 122 | 11 | Predaj | Neznáme | 0 |

Plný report: `docs/reports/2026-09-03-realvia-honest-unknown-mapping.md`.

---

## Komponenty — existencia + LOC + prod väzba

| Komponent | Existuje? | LOC (produkčné TS, ~riadky) | Prod riadky / stav | Rozhodnutie V0 |
|---|---|---|---|---|
| Manuálny listing generator | Áno | `listing-content.ts` **153**; system prompt **6**; API route **83**; stream **65**; generations list **23**; `generations-store.ts` **121** | Persist cieľ `ai_generations` = **tabuľka chýba** → store fail-open / warn | **Reuse** ako multi-channel generator |
| Realvia → UC adapter | Áno | `realvia-property-row.ts` **83** | číta `properties` **132** Smolko | **Reuse** ako jedna noha kanonického vstupu |
| Wave 1 listing-generator | Áno | `generate.ts` **85** | 0 DB (pure) | Reuse pre pack headline/body; **nie** ako jediný výstup (chýbajú FB/IG/email) |
| Quality Guardian | Áno | `review.ts` **121**; `types.ts` **54** | 0 DB (pure) | **Jediný approval gate** pred exportom |
| Human approval | Áno, **nevhodný ako trvalý store** | `human-approval.ts` **44** | in-memory `Map` — **0** persistovaných schválení | Reuse len ako **process gate** (`assertPublishAllowed`); V0 export bez publish |
| Vertical pack demo | Áno | `build.ts` **61** | 0 DB; fixture `13303557` | **Reuse** ako agregátor pack artefaktov |
| Banner factory | Áno | `build.ts` **64** | 0 | Reuse v packu |
| Presentation builder | Áno | `build.ts` **57** | 0 | Reuse owner/buyer deck |
| Property microsite | Áno | `build.ts` **79** | 0; `publishBlocked` default | Reuse; **publish zostáva blocked** |
| Listing score | Áno | `score.ts` **219** | 0 | Reuse completeness pred schválením |
| Realvia process queue | Áno | `processQueue.ts` **489** | napĺňa `properties` | **Nemeniť** v tomto BO (`mapCategory` = iný PR) |
| Verejný chatbot | — | — | — | **OUT** |
| Autonómny publish na portály | Nie (zámer) | — | `portal_listings` **0** | **OUT** |

---

## Diery (D1–D5), ktoré V0 musí uzavrieť špecifikáciou

| ID | Diera | Dôkaz |
|---|---|---|
| D1 | Dva vstupy, dva výstupy | `PropertyInput` (manuál) vs `RealviaPropertyRow` / `UcListingMapped` (Wave 1) |
| D2 | Quality Guardian nie je na KF1 ceste | `generateListingContent` nevolá `reviewGeneratedListing` |
| D3 | Pack demo neobsahuje multi-channel KF1 | `buildVerticalPackDemo` → len Wave 1 `generateListingDraft` |
| D4 | Persist generácií na prod nefunguje | `ai_generations` migrácia neaplikovaná |
| D5 | Approval nie je durable | `human-approval.ts` Map; Action Center BO už označil ako D1 |

V0 mitigácia bez novej DB: kanonický adapter + Guardian na **obe** cesty; schválený pack = **stiahnuteľný artefakt** (JSON/ZIP) + voliteľný zápis do existujúceho `ai_action_audit` (30 riadkov dnes) ako audit udalosti; **žiadny** portal write.

---

## Pilot — 5 dodaných Smolko ponúk

Founder dodanie 3. 9. 2026 (lokálne): Prešov PDF ×2 + screenshoty ponúk.  
**V tomto docs PR sa source_id z PDF neextrahujú** (žiadny OCR v scope).

| # | Pilot položka | Stav |
|---|---|---|
| 1 | Repo fixture `source_id=13303557` (Modrá nad Cirochou) | v kóde |
| 2–5 | Štyri ďalšie z founder dodávky / CRM match | **doplniť source_id pri implementačnom GO** |

Kritériá výberu z CRM (kým nie sú ID): `Aktívna` + (`Byt`\|`Dom`) + `price > 0` + `usable_area > 0`. Pozor: `type` je skreslené (63–65 % Ostatné) — pri matchi z PDF má prednosť text z dodávky pred DB `type`.

**Cieľová metrika:** maklér → schválený multi-channel launch pack **≤ 20 min** na 1 ponuku (merané stopkami na pilote).

---

## Záver pre founder GO

| Otázka | Odpoveď |
|---|---|
| Stavať od nuly? | Nie |
| Nová DB? | Nie |
| Apply `ai_generations`? | **Samostatný GO** (existujúca migrácia, nie nová schéma) — V0 vie ísť aj bez nej cez export |
| Opraviť `mapCategory`? | **Mimo** tohto BO |
| Implementovať teraz? | Nie — čaká `GO IMPLEMENT PROPERTY LAUNCH PACK V0` |
