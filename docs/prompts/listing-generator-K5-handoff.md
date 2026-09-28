# K5 — Odovzdanie: generátor textu inzerátu (2026-08-07)

**Status:** **K5 HOTOVÉ** · **C4 CLOSED** · **C2 CLOSED (PASS)** · **PR-A WIRED** (merge čaká founder)  
**Finálny prompt:** `docs/prompts/listing-generator-system-prompt-FINAL.md`  
**Typ SoT:** `apps/crm/src/lib/ai/listing-content.ts` → `ListingContent`  
**C4 dôkaz:** `apps/crm/tests/verification/listing-content-c4-schema.verification.test.ts` (6/6 PASS)  
**K4 review (log + E1/E2):** `docs/prompts/listing-generator-K4-review.md`  
**K4 medzikrok (superseded):** `docs/prompts/listing-generator-system-prompt-K4.md`  
**UI brief (aktualizovaný):** `docs/prompts/inzerat-generator-tab.md`  
**Eval (C4 JSON = ListingContent):** `docs/prompts/listing-generator-K3-eval.md`

---

## 1. Cesta k FINAL promptu

`docs/prompts/listing-generator-system-prompt-FINAL.md`

Verzia FINAL · 2026-08-07 · C4 schema align (JSON kľúče = `ListingContent`) · golden set + K4 review v hlavičke.

---

## 2. Founder rozhodnutia E1 / E2 (doslovne)

**E1:** Veto O2 platí. Charakterizácia lokality výhradne z nového vstupného poľa `charakterLokality` (enum + voľný text, voliteľné). Bez vstupu = žiadna veta o povahe lokality. Do `recommendations` pridaj úpravu UI formulára (`inzerat-generator-tab.md`) o toto pole.

**E2:** portal_text (**predtým mainText**) **220–320 slov**, cieľ **~270** — odvodené z golden setu (296/275/240/254). Jediný zdroj pravdy je systémový prompt; v `inzerat-generator-tab.md` nahraď rozsah 250–400 odkazom na prompt.

Oboje: **CLOSED** a zapracované do FINAL + UI brief.

---

## 2b. Founder rozhodnutie C4 (2026-08-07) — CLOSED

**C4 (vykonať TERAZ):** FINAL prompt emituje **presne** produkčné polia `ListingContent` — žiadny mapper.

| Stará K5 | Produkcia |
|---|---|
| `mainText` | `portal_text` |
| `socialText` | `fb_ad_copy` + `ig_caption` |
| `titles[3]` | `titles?: string[]` (optional) |
| `missingData` / `recommendations` / `techniquesUsed` | rovnaké kľúče, **optional** |
| — | `email_subject`, `email_body`, `seo_keywords` (povinné v type) |

**Dôkaz:** 6/6 K3 fixtures PASS voči `ListingContent` (`listing-content-c4-schema.verification.test.ts`).  
**Mimo C4 (vtedy):** PR-A wire — teraz **WIRED** v `listing-content-system-prompt.ts` (merge = founder).

---

## 3. Zapracované námietky (K4 + E1/E2 + C4)

- **Z1** Zákaz inventovať panel/tehla, miestnosti, fyzické prvky (§1)
- **Z2** Segmenty = situácia, nie falošné vybavenie (§1, §3.3)
- **Z3→E1** Soft municipal / povaha lokality len cez `charakterLokality`; bez poľa = žiadna veta (FINAL §1, §5)
- **Z4** Trhové porovnanie výmery len s číslom vo vstupe
- **Z5** Zákaz „papierovo čistý“ / právna čistota bez vstupu
- **Z6** „Obytné priestory na jednom podlaží" namiesto absolútneho „bez schodov"
- **Z7** Zákaz meta-procesu v titles/portal_text/fb_ad_copy/ig_caption
- **Z8** techniquesUsed len skutočne použité; tech 2 pri chudobnom vstupe nevyžadovať
- **Z9** Soft limit titles 45–90 znakov
- **Z10** RK podpis len zo vstupu
- **Z11** Regenerované K3 výstupy T1–T6 (C4: produkčné kľúče)
- **Z12 / E1** Pole + recommendations hint + UI brief `charakterLokality`
- **Z13 / E2** portal_text 220–320 / ~270; UI brief odkazuje na FINAL
- **C4** Schema = `ListingContent`; optionals aditívne; dôkaz vitest 6/6

---

## 4. Vedome odmietnuté námietky (s dôvodmi) — povinné

- **R1** Vždy RK podpisový blok (O6) — nie vo golden vstupoch; riziko falošnej značky; stačí recommendations
- **R2** Hardcode golden dialógov / viet — K1: tón nehardcodovať
- **R3** Force techniky 1+6 vždy — K1: pri čistom pozemku / bez slabej stránky vypadnú
- **R4** Zmazať `recommendations` / `techniquesUsed` zo schémy — CRM pipeline ich potrebuje; UI karty môžu polia ignorovať
- **R5** Skrátiť §2 teraz — polish mimo K5; FINAL zachováva plné vetvy
- **R6** Automaticky 250–400 slov podľa UI briefu — founder E2 zvolil 220–320 / ~270 z golden; UI brief nie je latka
- **R7** Soft municipal character bez vstupu (návrh A / O1) — founder E1: O2 veto platí; len cez `charakterLokality`

---

## 5. Čo ostáva (mimo tohto behu)

- UI implementácia poľa `charakterLokality` (enum + voľný text, voliteľné) — **PR-B** (samostatný PR; nie v PR-A)
- **PR-A:** Wire FINAL → `SYSTEM_PROMPT` + docs `sales→prompts` — **WIRED** (merge = founder pri klávesnici)

### 5b. C2 CLOSED (PASS) + stress (b) — 2026-08-07

**C2:** Founder tipy vs KEY — Teriakovce PASS (nepoznal ľudský; preferoval B/golden), Ľubotice PASS (preferoval prompt A napriek správnemu tipu B). Celkovo **PASS · CLOSED**. Detaily: `listing-generator-C2-notes.md`.

**Stress (b):** `fb_ad_copy` K3 Test 5 = „písal človek“ → pravda FINAL stress → pozitívny signál. **PR-A GO udelené** (po C2 PASS + C4 CLOSED).

---

## 6. Čo je vo FINAL (stručne)

1. Rola: maklérsky copywriter SK, klientsky text bez meta-procesu  
2. Uzemnenie O2: žiadne domýšľanie materiálov, miestností, trhových €/m²…  
3. **E1** `charakterLokality` — jediný zdroj povahy lokality  
4. Segmentové vetvy byt/dom/pozemok/novostavba/prenájom  
5. Desať techník (2,3,5,8,9,10 vždy; 1+6 podľa slabej stránky; 4+7 len s faktom)  
6. **E2** portal_text **220–320** (cieľ ~270); fb_ad_copy 65–80 slov; ig_caption 2 odstavce + 7 hashtagov; titles ~45–90  
7. Guardrails O3: diskriminácia, výnosy, právna čistota, prázdne prídavné  
8. Robustnosť na chudobný/CAPS/cudzí popis + JSON = `ListingContent` (+ optionals)
