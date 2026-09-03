# Build Order — Property Launch Pack V0 (Reality Smolko)

**Status:** INTEGRATION REPORT — specification only  
**Kategória:** Workflow Capability / Client Retention (Smolko)  
**Cieľ:** Maklér Reality Smolko zo **5 pilotných ponúk** dostane **schválený multi-channel launch pack** (portal + FB + IG + email + SEO + pack artefakty) **do 20 minút**, cez **jeden kanonický vstup** a **jeden Quality Guardian gate** — bez autonómneho publikovania.

**Integration Report:** `docs/reports/2026-09-03-property-launch-pack-integration.md`  
**Premortem:** `docs/premortems/2026-09-03-property-launch-pack-v0.md`  
**Build Package:** `docs/briefs/build-package-property-launch-pack-v0.md`  
**Plan:** `docs/briefs/plans/BO-property-launch-pack-v0-plan.md`  
**Ingest:** `docs/prompts/task-property-launch-pack-v0.md`

**Implementačný GO:** **NEUDELENÝ**  
**Autorizačná fráza (budúca, nie teraz):** `GO IMPLEMENT PROPERTY LAUNCH PACK V0`  
Táto fráza v tomto dokumente **nie je** udelené GO.

**platné_voči:** `origin/main` = `b746865427428a084fd505c5f59d0af9d540585e` (2026-09-03)

**Produkčné čísla:** berú sa z prílohy `task3opravyroadmap.md` + re-count v Integration Report — nie z „patch“ šablóny.

---

## 0. Gate check (Ústava + Prime Directive)

| Otázka | Odpoveď |
|--------|---------|
| Posúva ďalšieho platiaceho klienta / retenciu? | Áno — Smolko (platiaci reference) potrebuje rýchly výstup pri novej / aktualizovanej ponuke. |
| Zaplatí za to dnešný klient? (Ústava Q1) | Áno ako súčasť retencie / value dokázanej na vlastnom inventory — nie ako nový platený modul. |
| Lead → Provízia? | Nepriamo: rýchlejší kvalitný listing → menej oneskoreného vyvesenia → vyššia šanca obchodu. |
| Timing OK (nie „príliš skoro")? | Áno. Obe cesty už existujú; chýba zjednotenie a gate. |
| Prečo nie existujúce primitíva samostatne? | D1–D5 v Integration Report — maklér dnes musí voliť medzi manuálnym KF1 a demo packom. |
| Founder trap | Druhá DB, chatbot, auto-publish, oprava celého Realvia mapovania v tom istom PR. |
| Verdikt | **BUILD — úzky rozsah §4**, až po `GO IMPLEMENT PROPERTY LAUNCH PACK V0`. Tento check-in = VALIDATE/spec. |

Zapíš do `memory/decisions.md` po implementačnom GO.

---

## 1. Integration Report (povinné pred kódom)

Plný report s **LOC + prod riadkami** + odpoveďou na **Ostatné 63–65 %**:

→ `docs/reports/2026-09-03-property-launch-pack-integration.md`

**Súhrn:**

| Položka | Existuje? | Prod | Rozhodnutie |
|---------|-----------|------|-------------|
| Manuálny generator | Áno (`lib/ai/listing-content`, ~153 LOC) | `ai_generations` **chýba** | Reuse kanály |
| Realvia pack | Áno (`vertical-pack-demo`, ~61 LOC) | `properties` **132** Smolko | Reuse artefakty |
| Quality Guardian | Áno (~121 LOC) | 0 DB | **Jediný gate** |
| Human approval Map | Áno (~44 LOC) | 0 persist | Gate áno, store nie |
| Nová tabuľka | — | — | **ZAKÁZANÉ** |
| Auto-publish / chatbot | — | `portal_listings` **0** | **ZAKÁZANÉ** |

**Jediná nová vec (po GO):** orchestrátor `property-launch-pack` (adapter + wire Guardian + export UI/API).

---

## 2. Verification map (plán → test → kód)

Súbory vzniknú v implementačnom PR.

| # | Akceptačné kritérium (merateľné) | Verification test | Playwright smoke | Vitest unit |
|---|----------------------------------|-------------------|------------------|-------------|
| 1 | Manuálny aj Realvia vstup → rovnaký `PropertyLaunchFacts` shape | `tests/verification/property-launch-pack-v0.verification.test.ts` | — | adapter unit |
| 2 | Generovaný pack **neprejde** exportom bez `guardian.ok` | ten istý | — | guardian wire |
| 3 | `assertPublishAllowed` / microsite zostáva blocked bez approval; V0 **nepíše** `portal_listings` | ten istý | optional API | microsite |
| 4 | Výstup obsahuje portal + fb + ig + email (+ pack meta) | ten istý | — | golden / shape |
| 5 | 5 pilot `source_id` (alebo manuálny ekvivalent) prejde end-to-end v ≤20 min (manuálny stopky log v reporte) | report + unit na fixture `13303557` | — | fixture |
| 6 | Flag default off; staré `/api/ai/listing-content` ostáva | verification | existujúci smoke auth | — |

**Pravidlo:** zmena správania v stĺpci Verification = aktualizácia testu v **tom istom PR**.

---

## 3. Dátový predpoklad

- [x] Zdroj: vlastné `properties` + manuálny vstup makléra (`master-data-sourcing-map` Zhluk 1 / Realvia sync). Žiadny scrape.
- [x] GDPR: texty z vlastného inventory / poznámok makléra; žiadny verejný chatbot. Pred implementáciou: `gdpr-advisor` na export path (žiadne PII majiteľa vo verejnom artefakte bez právneho základu).
- [ ] `ai_generations` apply = **mimo V0 povinnosti**; voliteľný samostatný founder GO.

---

## 4. Scope

### IN

- Kanonický vstup: Realvia riadok **alebo** manuálny `PropertyInput` → jeden facts objekt.
- Generácia multi-channel cez existujúci `generateListingContent` (KF1).
- Pack artefakty cez existujúci `buildVerticalPackDemo` (alebo jeho časti) na tom istom facts/riadku.
- Quality Guardian review na claimed facts **pred** stavom „schválené na export“.
- Export schváleného packu (súbor / JSON); audit udalosť do existujúceho `ai_action_audit` ak vhodné.
- Pilot na **5** Smolko ponukách (fixture `13303557` + 4 founder-dodané ID pri GO).
- Feature flag default **off**.

### OUT

- Nová databázová tabuľka / nová migrácia navrhnutá v tomto BO.
- Autonómne publikovanie na Reality.sk / FB / web.
- Verejný chatbot / concierge.
- Oprava `mapCategory` / backfill `type` (samostatný P0).
- Price-trail, valuation, booking (`scheduled_events`).
- Bulk 132 ponúk v jednom kliknutí.

---

## 5. Brány (GO zostáva ľudské)

| Brána | Kto | Kedy |
|-------|-----|------|
| Integration Report (tento) | Founder | pred prvým riadkom kódu |
| Implementácia | agent | až po `GO IMPLEMENT PROPERTY LAUNCH PACK V0` |
| PR + Preview | agent | po implementácii |
| CI zelené | CI | pred merge |
| Merge do main | Founder | po zelenom CI |
| Prod migrácia | — | **žiadna nová**; `ai_generations` len samostatný GO |

---

## 6. Acceptance = Running

1. [ ] Verification testy zo §2 prejdú.
2. [ ] Playwright smoke existujúcich AI listing rout nezlomený.
3. [ ] Stopky: 5× pilot ≤ 20 min / ponuka, pack schválený Guardianom, **0** zápisov do `portal_listings`.
4. [ ] Report v `docs/reports/` s evidence (source_id, čas, guardian result).

---

## 7. Rollback

- Flag off / revert PR.
- Žiadna DB rollback (žiadna nová tabuľka).
- Staré `/api/ai/listing-content` a capabilities knižnice ostávajú použiteľné samostatne.

---

## 8. Effort

- [ ] S (<0.5 d) · [x] M (0.5–2 d) · [ ] L · [ ] XL

---

## 9. Plan Mode artefakt

`docs/briefs/plans/BO-property-launch-pack-v0-plan.md`
