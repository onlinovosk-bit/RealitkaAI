# Integration Report — Property Launch Pack V0

**Baseline:** `origin/main` @ `b746865427428a084fd505c5f59d0af9d540585e` (2026-09-03)  
**Prod:** `ypgajkhqtbriqqmyawyv` · SELECT 3. 9. 2026  
**Tenant:** Reality Smolko `11111111-1111-1111-1111-111111111111`  
**Pravidlo:** audit kódu ≠ audit dát — každý „máme“ má počet riadkov.  
**Doplnok (hlbšie):** počet riadkov ≠ správnosť — mapped polia overovať proti nezávislému signálu (`title`).  
**Amendment 2026-09-03 (post #511):** `docs/reports/2026-09-03-realvia-mapper-depth-amendment.md` + ingest `docs/prompts/task-realvia-mapper-depth-2026-09-03.md`.

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
| `type = Ostatné` | **83 (63 %)** | **86 (65,2 %)** — kanonické |
| `type = Byt` / `Dom` | — | 30 / 16 (**pozor:** časť `Dom` = zlé mapovanie 13/14) |
| bez ceny | 41 (31 %) | 41 |
| `usable_area = 0` | 50 (38 %) | 50 |
| `transaction_type` stĺpec | všetko Predaj / „0 prenájmov“ | Predaj **132** v stĺpci — **biznis tvrdenie ZRUŠENÉ** (pozri § mapTransaction) |
| `created_at` | sync, nie inzerát | 2026-05-25 → 2026-08-28 UTC |
| `***PREDANÉ***` v `title` | — | **11** pri `status=Aktívna` (nie `status=Predaná`) |

---

## Prečo 65,2 % `type = 'Ostatné'` — a prečo to nie je celý príbeh

**Nie** preto, že Realvia posiela prázdnu kategóriu.  
**Áno** preto, že adapter `mapCategory` v `apps/crm/src/lib/realvia/processQueue.ts` (~489 LOC) mapuje len kódy **11–20**, má TODO na číselník, a default je `'Ostatné'`.

```477:491:apps/crm/src/lib/realvia/processQueue.ts
function mapCategory(category: number): string {
  const categoryMap: Record<number, string> = {
    11: 'Byt',
    12: 'Byt',
    13: 'Dom',
    14: 'Dom',
    // … 15–20 …
  };
  return categoryMap[category] ?? 'Ostatné';
}
```

### Neúplné (Ostatné)

Najväčší unmapped bucket = **30** (30 ks). Kategória **20** je v mape zámerne `Ostatné`. Plná tabuľka: amendment + `docs/reports/2026-09-03-smolko-type-mapping-integration.md`.

### Nesprávne a „vyzerá správne“ (horšie)

| Realvia `category` | ks | náš `type` | Nezávislý signál (`title`) |
|---:|---:|---|---|
| **13** | **14** | **`Dom`** | byty (prenájom/predaj/dopyt) — **nie** domy |
| **14** | **2** | **`Dom`** | 4i byty — **nie** domy |

**16** riadkov má zlú kategóriu, ktorá prejde vizuálnou kontrolou. Pilot / porovnateľné / Launch Pack **nesmú** brať `type=Dom` ako overený fakt.

**Oprava mappera:** až po oficiálnom číselníku od Realvie — **nie** z titulov do kódu. Samostatné GO.

---

## ⛔ `mapTransaction` — P0 (v pôvodnom #511 chýbal)

```496:502:apps/crm/src/lib/realvia/processQueue.ts
function mapTransaction(transaction: number): string {
  const transactionMap: Record<number, string> = {
    123: 'Predaj',
    124: 'Prenájom',
    125: 'Dražba',
  };
  return transactionMap[transaction] ?? 'Predaj';
}
```

Prod `payload_raw->advert.transaction` (Smolko, overené 3. 9. 2026):

| Realvia kód | ks | náš `transaction_type` | title ~ prenájom |
|---:|---:|---|---:|
| 127 | 68 | Predaj (`??` / nepoznaný) | 0 |
| **123** | **53** | **Predaj** (explicitne v mape) | **44** |
| 122 | 11 | Predaj (`??`) | 0 |

**123 ≈ Prenájom podľa titulov** → **40 %** portfólia systém berie ako predaj.  
Kódy **122 / 127** mapper nepozná. **124** (Prenájom v mape) Realvia v tomto sample **neposiela**.

**Zrušené tvrdenie:** „Smolko nemá v systéme ani jeden prenájom.“ Bolo to čítanie rozbitého mappera ako faktu.

---

## Predané v realite vs `status`

`status = Predaná` = **0**.  
`title` obsahuje `***PREDANÉ***` = **11** (stále `Aktívna`). Signál existuje v zlom poli — **nepoužívať** na výpočty ani backfill bez samostatného GO.

---

## Brána pred `GO IMPLEMENT` Launch Pack

1. Vyžiadať od Realvie **oficiálny číselník** kategórií **aj** transakcií.  
2. Opraviť `mapCategory` + `mapTransaction` + backfill — každé so **samostatným GO**.  
3. Do implementácie: Launch Pack / Guardian **nesmie** tvrdiť typ ani transakciu z DB bez potvrdenia maklérom (inak „Dom na predaj“ na byt na prenájom).

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
| Realvia process queue | Áno | `processQueue.ts` **489** | napĺňa `properties` (mapped polia **nespoľahlivé**) | **Nemeniť** tu; P0 = `mapCategory` **+** `mapTransaction` (iné PR + číselník) |
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
| D6 | Mapped `type` / `transaction_type` nespoľahlivé | 65 % Ostatné; 13/14→Dom na bytoch; 123→Predaj pri prenájme v titule |
| D7 | Predaj len v `title`, nie v `status` | 11× `***PREDANÉ***` + Aktívna |

V0 mitigácia bez novej DB: kanonický adapter + Guardian na **obe** cesty; **maklér potvrdí type/transaction** pred generáciou z Realvia riadku; schválený pack = **stiahnuteľný artefakt**; **žiadny** portal write. **Implementácia až po číselníku + mapper P0.**

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
| Opraviť `mapCategory` / `mapTransaction`? | **Mimo** tohto BO — najprv oficiálny číselník Realvia |
| Implementovať Launch Pack teraz? | **Nie** — najprv číselník + mapper P0; až potom `GO IMPLEMENT PROPERTY LAUNCH PACK V0` |
