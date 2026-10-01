# K4 (REDO 2026-08-07) — Oponentský kolotoč: generátor textu inzerátu

**Status:** K4 HOTOVÉ · E1/E2 CLOSED · **K5 HOTOVÉ** · **C4 CLOSED** (ListingContent schema + 6/6 dôkaz)  
**Prompt kandidát (medzikrok):** `docs/prompts/listing-generator-system-prompt-K4.md` (superseded)  
**Finálny prompt:** `docs/prompts/listing-generator-system-prompt-FINAL.md`  
**Handoff:** `docs/prompts/listing-generator-K5-handoff.md`  
**Pred-K4 snapshot:** `docs/prompts/listing-generator-system-prompt-DRAFT.md` (superseded)  
**Eval (C4 regenerované T1–T6 = ListingContent):** `docs/prompts/listing-generator-K3-eval.md`  
**C4 dôkaz:** `apps/crm/tests/verification/listing-content-c4-schema.verification.test.ts`  
**Vstupy:** K1 REDO + K2 DRAFT REDO + K3 REDO + golden md

---

## 1. Zdroj definície oponentov

**NÁJDENÉ — oficiálna tabuľka** (nie fallback).

| Zdroj | Cesta |
|---|---|
| Primár | `docs/sales/metaprompta3generator.md` — ČASŤ B |
| Duplikát | `docs/prompts/meta-prompt-a3-generator.md` — ČASŤ B (identická) |

| # | Oponent | Čo útočí | Veto |
|---|---|---|---|
| O1 | Maklérka z praxe (20 r., Prešov) | AI tón, dôvera pred klientom, dĺžka vs. portál | nie |
| O2 | Halucinačný audítor | Každé tvrdenie → vstup; prepočty €/m² | **ÁNO** |
| O3 | Právnik (reklama + spotrebiteľ) | Klamlivá reklama, superlatívy, diskriminácia, výnosy | **ÁNO** |
| O4 | Skeptický kupujúci | Eye-roll, triky, manipulácia | nie |
| O5 | Portálový praktik (SEO/UX) | Titulky, limity, FB 500, JSON/UI | nie |
| O6 | Hlas zákazníka (Smolko-proxy) | Cena vrátane, kontakty 1:1, značka RK | nie |

> Pozn.: User-query fallback (O1 Faktický… O6 Kontrolór) **nebol použitý** — oficiálna tabuľka existuje. Mapovanie rolí je iné (faktický audítor = O2, nie O1).

---

## 2. Kolá (max 3)

### Kolo 1 — Adversarial pass na DRAFT + 6 K3 JSON

| Oponent | Severity | Námietka (miesto) | Verdikt |
|---|---|---|---|
| O2 | **BLOKUJE** | T1: „paneláku“ — vo vstupe len „zateplený dom“ | **AKCEPTOVANÉ** |
| O2 | **BLOKUJE** | T2: mená miestností (spálňa, detská…) mimo vstupu | **AKCEPTOVANÉ** |
| O2 | **BLOKUJE** | T4: detailná dispozícia miestností mimo vstupných parametrov | **AKCEPTOVANÉ** |
| O2 | **BLOKUJE** | T4: „bežný dom so zlomkom výmery“ bez čísla vo vstupe (+ falošné tech 4/7) | **AKCEPTOVANÉ** |
| O2 | **BLOKUJE** | T1: „Sabinov nie je krajské mesto“ mimo vstupu | **AKCEPTOVANÉ do promptu** → konflikt s O1 = **E1** |
| O2 | DÔLEŽITÉ | T1: „pieskovisko za dverami“ ako fakt vybavenia | **AKCEPTOVANÉ** (potenciál, nie fakt) |
| O2 | DÔLEŽITÉ | T6 titles: „pri Dunaji“ bez overeného výhľadu | **AKCEPTOVANÉ** |
| O2 | DÔLEŽITÉ | techniquesUsed nadhodnotené (T1 tech 6 bez nevýhody; T3 tech 7; T4 1/4/7; T5 tech 2) | **AKCEPTOVANÉ** |
| O3 | **BLOKUJE** | T3: „papierovo čistý pozemok“ — právna čistota bez podkladu | **AKCEPTOVANÉ** |
| O3 | DÔLEŽITÉ | T2: absolútne „bez schodov“ pri pochôdznom podkroví = riziko klamlivosti | **AKCEPTOVANÉ** |
| O1 | DÔLEŽITÉ | T1/T5/T6: meta-hlas („vo vstupe nie je“, „parametre“, „nedávame do textu“) — maklérka by to nepublikovala | **AKCEPTOVANÉ** |
| O1 | DÔLEŽITÉ | Soft municipal tone potrebný pre malomestský trh (golden „Sabinov nie je Prešov“) | **ESKALÁCIA E1** (vs O2 veto) |
| O4 | DÔLEŽITÉ | Meta-proces a „systémový“ tón pri stress = eye-roll | **AKCEPTOVANÉ** (s O1) |
| O4 | DETAIL | Lifestyle scény OK, ak netvrdia vybavenie | **AKCEPTOVANÉ** |
| O5 | DÔLEŽITÉ | UI brief `inzerat-generator-tab.md` žiada mainText **250–400** slov; draft **150–280** | **ESKALÁCIA E2** |
| O5 | DETAIL | titles ~45–90 znakov soft guidance; social ≤500 OK (overené) | **AKCEPTOVANÉ** / čiastočne |
| O5 | DETAIL | JSON má `recommendations` + `techniquesUsed` navyše vs. UI brief karty — OK pre CRM capability | **ODMIETNUTÉ** (neškrtáť polia) |
| O6 | DETAIL | Podpisový blok RK vždy | **ODMIETNUTÉ** — len ak vo vstupe; inak recommendations |
| O6 | — | Kontakty 1:1, Ľubotice „cena konečná“ — obstálo | OK (snaha: telefóny, provízia) |

**Zapracované v kole 1 →** nový súbor `listing-generator-system-prompt-K4.md` + regenerácia T1–T6 v K3-eval.

### Kolo 2 — Re-audit po opravách (O2/O3 veto focus)

| Oponent | Nález |
|---|---|
| O2 | Regenerované T1–T6: tvrdenia v titles/mainText/socialText dohľadateľné vo vstupe alebo `[DOPLNIŤ]`. Prepočty €/m² OK. **Žiadne BLOKUJE.** |
| O3 | Bez výnosov, bez právnej čistoty, bez diskriminácie, CAPS/luxus mimo klientského textu. „Jedno podlažie“ namiesto absolútneho „bez schodov“. **Žiadne BLOKUJE.** |
| O1 | Meta-hlas preč; T5 ľudský ale správne slabý. Stále chýba soft municipal character (E1). |
| O4 | Triky nepresahujú dôveru; techniky netrčia ako checklist. |
| O5 | social < 500; titles OK. E2 dĺžka ostáva. |
| O6 | Kontakty 1:1; cena vrátane zachovaná; bez falošného RK footeru. |

**Ďalšie zapracovanie kola 2:** T6 — meta o „pôvodnom popise“ presunuté do recommendations (klientsky text čistý).

### Kolo 3 — Stabilita / zvyšky

| Námietka | Verdikt |
|---|---|
| Skrátiť §2 vetvy kvôli tokenom (poznámka v DRAFT) | **ODMIETNUTÉ teraz** — najprv E1/E2; skrátenie = K5/polish |
| Hardcodovať golden dialógy pre „viac duše“ (O1 pokušenie) | **ODMIETNUTÉ** — K1: tón voľný, jadro nie |
| Force tech 1+6 na pozemok / prázdny vstup | **ODMIETNUTÉ** — K1 + prompt |
| Zdvihnúť mainText na 250–400 bez foundera | **ESKALÁCIA E2** — nerozhodovať proti O5/UI vs O1 |

**Koniec kola 3:** O2/O3 čisté. Otvorené len E1, E2.

---

## 3. Tabuľka: zapracované vs vedome odmietnuté

### Zapracované (do K4 promptu a/alebo K3 JSON)

| ID | Námietka | Kde v prompte |
|---|---|---|
| Z1 | Zákaz inventovať panel/tehla, miestnosti, fyzické prvky | §1 |
| Z2 | Segmenty = situácia, nie falošné vybavenie | §1, §3.3 |
| Z3 | Soft municipal / „malé mesto“ bez vstupu zakázané (do rozhodnutia E1) | §1, §3.6 |
| Z4 | Trhové porovnanie výmery len s číslom vo vstupe | §1, §2, §3.4–5 |
| Z5 | Zákaz „papierovo čistý“ / právna čistota bez vstupu | §2 POZEMOK, §5 |
| Z6 | „Obytné priestory na jednom podlaží“ vs. absolútne „bez schodov“ | §2 DOM |
| Z7 | Zákaz meta-procesu v titles/mainText/socialText | ROLA, §4 |
| Z8 | techniquesUsed len skutočne použité; tech 2 pri chudobnom vstupe nevyžadovať | §3, §6 |
| Z9 | Soft limit titles 45–90 znakov | §4 |
| Z10 | RK podpis len zo vstupu | §3.8 |
| Z11 | Regenerované K3 výstupy T1–T6 | `listing-generator-K3-eval.md` |
| Z12 | E1 CLOSED: `charakterLokality` jediný zdroj povahy lokality | FINAL §1, §5, recommendations |
| Z13 | E2 CLOSED: mainText 220–320, cieľ ~270; UI brief → odkaz na prompt | FINAL §4; `inzerat-generator-tab.md` |

### Vedome odmietnuté

| ID | Námietka | Dôvod |
|---|---|---|
| R1 | Vždy RK podpisový blok (O6) | Nie vo golden vstupoch; riziko falošnej značky; stačí recommendations |
| R2 | Hardcode golden dialógov / viet | K1: tón nehardcodovať |
| R3 | Force techniky 1+6 vždy | K1: pri čistom pozemku / bez slabej stránky vypadnú |
| R4 | Zmazať `recommendations` / `techniquesUsed` zo schémy (O5 vs UI brief) | CRM pipeline ich potrebuje; UI karty môžu polia ignorovať |
| R5 | Skrátiť §2 teraz | Stále polish mimo K5 scope; FINAL zachováva plné vetvy |
| R6 | Automaticky 250–400 slov podľa UI briefu | Founder E2: 220–320 / ~270 z golden; UI brief nie je latka |
| R7 | Soft municipal character bez vstupu (návrh A / O1) | Founder E1: O2 veto platí; len cez `charakterLokality` |

---

## 4. ESKALÁCIE FOUNDER

### E1 — Soft municipal character bez vstupu

| | |
|---|---|
| **Konflikt** | O1 (maklérka): golden ton „Sabinov nie je Prešov / menšie mesto“ buduje dôveru. O2 (veto): tvrdenie nie je vo vstupe → BLOKUJE. |
| **Návrh A** | Povoliť úzku výnimku: ak je v lokalite názov obce, smie text povedať, že obec nie je krajské mesto / nie je X (X = najbližšie krajské z whitelistu), bez km/minút. |
| **Návrh B** | Nechať zákaz; maklér doplní „charakter obce“ ako vstupné pole. |
| **Odporúčanie prompt engineera** | **B teraz** (O2 má veto; bezpečnejšie pre produkciu). Golden Prešov €/m² aj tak vyžaduje číslo vo vstupe. Až po dátach z praxe zvážiť A. |

### E2 — Dĺžka mainText

| | |
|---|---|
| **Konflikt** | K4 kandidát / O1: **150–280** slov (portál unesie, bližšie golden skrátenému jadrám). UI brief `docs/prompts/inzerat-generator-tab.md`: **250–400** slov. |
| **Návrh A** | Držať 150–280; UI brief upraviť pri K5/UI PR. |
| **Návrh B** | Zvýšiť na 200–350 ako kompromis. |
| **Návrh C** | 250–400 podľa UI briefu. |
| **Odporúčanie** | **A** — kratší text lepšie sedí portálom a O1; UI brief je starší workflow prompt, nie latka golden setu. |

---

## 4b. Founder rozhodnutia / uzavretie eskalácií (2026-08-07) — DOSLOVNE

**E1:** Veto O2 platí. Charakterizácia lokality výhradne z nového vstupného poľa `charakterLokality` (enum + voľný text, voliteľné). Bez vstupu = žiadna veta o povahe lokality. Do `recommendations` pridaj úpravu UI formulára (`inzerat-generator-tab.md`) o toto pole.

**E2:** mainText **220–320 slov**, cieľ **~270** — odvodené z golden setu (296/275/240/254). Jediný zdroj pravdy je systémový prompt; v `inzerat-generator-tab.md` nahraď rozsah 250–400 odkazom na prompt.

### Stav uzavretia

| ID | Stav | Čo zmenené |
|---|---|---|
| **E1** | **CLOSED** | FINAL prompt: pravidlo `charakterLokality` v §1 + guardrail + recommendations hint. UI brief: pole pridané do nepovinných. Produktová implementácia poľa = recommendation (nie kód v K5). |
| **E2** | **CLOSED** | FINAL prompt: mainText 220–320, cieľ ~270. UI brief: 250–400 nahradené odkazom na FINAL. K3-eval: poznámka o dĺžke vs. nový rozsah (T1–T4 ~154–174 < 220 — historické K4 ukážky, bez plnej regenerácie). |

**Súbory dotknuté E1/E2:**
- `docs/prompts/listing-generator-system-prompt-FINAL.md` (nový)
- `docs/prompts/listing-generator-system-prompt-K4.md` (pointer SUPERSEDED)
- `docs/prompts/inzerat-generator-tab.md` (pole + odkaz dĺžky)
- `docs/prompts/listing-generator-K3-eval.md` (poznámka dĺžky)
- `docs/prompts/listing-generator-K5-handoff.md` (odovzdanie)

---

## 5. Cesta k aktualizovanému promptu

**Finálny (zdroj pravdy):** `docs/prompts/listing-generator-system-prompt-FINAL.md`  
**K4 medzikrok (superseded):** `docs/prompts/listing-generator-system-prompt-K4.md`  
**Superseded DRAFT:** `docs/prompts/listing-generator-system-prompt-DRAFT.md`  
**Eval:** `docs/prompts/listing-generator-K3-eval.md` (regenerované po K4; dĺžka poznámka po E2)  
**Handoff:** `docs/prompts/listing-generator-K5-handoff.md`

---

## 6. Stav

### **K5 HOTOVÉ** — E1/E2 CLOSED, finálny prompt odovzdaný

O2 a O3 po regenerácii K4: **bez BLOKUJE** (veto vrstva čistá).  
Ďalšie: UI implementácia poľa `charakterLokality` + wire FINAL prompt do `generateListingContent` (mimo tohto behu).
