# K1 (REDO 2026-08-06) — Analýza golden setu

**Status:** REDO — predchádzajúca K1 neplatná (čítala Word / iný názov súboru, nie tieto md).  
**Zdroje (teraz z disku):**  
- `docs/sales/smolko-inzerat-demo-2026-07-30.md` — byt Sabinov  
- `docs/sales/smolko-inzeraty-3x-2026-08-06.md` — Teriakovce, Ľubotice, Modrá n. C.  

---

## Techniky podľa textu (4 × 10)

| # | Technika | Sabinov (byt) | Teriakovce (dom) | Ľubotice (pozemok) | Modrá (dom+veľký pozemok) |
|---|---|---|---|---|---|
| 1 | Obrátenie námietky | prízemie → jediná cesta k záhradke | studňa/čistička → nezávislosť | — | odľahlosť → súkromie |
| 2 | Scéna namiesto parametrov | dvere → vlastná tráva | „vynesieš hore? niet kam“ | „najdrahšie býva čakanie“ | „postavte sa doprostred“ |
| 3 | Explicitná segmentácia | rodina / pes / pestovanie / bez schodov | rodina / bez schodov / dochádzajúci | staviteľ / dve domácnosti | rodina / chovateľ / remeselník |
| 4 | Cenové ukotvenie | €/m² vs. Prešov (vlastné portfólio v demo) | — | cena konečná (+ implicit €/m²) | pozemok vs. bežná parcela |
| 5 | Zhmotnenie čísla | „za rozdiel auto“ | „o 3 miestnosti viac“ | „v januári ako v júli“ | „šesť bežných parciel“ |
| 6 | Priznaná nevýhoda | „Sabinov nie je Prešov“ | kanalizácia v riešení, na rovinu | — | `[DOPLNIŤ]` stav dokončenia |
| 7 | Vecná vzácnosť | toľko záhradiek = toľko prízemií | — | „druhýkrát sa neponúknu“ | „druhá taká v okrese“ |
| 8 | Konkrétna výzva + meno | Eva + postáť na záhradke | Iveta + altánok | Erik + územný plán | Anna + pešo po pozemku |
| 9 | Špecifickosť → dôvera | murovaná pivnica ≠ kobka | 12 000 l, lexan | 117 m² podiel na ceste | murivo 450 mm |
| 10 | Bez prázdnych prídavných | ✔ | ✔ | ✔ | ✔ |

**Spoločný základ:** 2, 3, 5, 8, 9, 10 vo všetkých štyroch.  
**1 + 6:** silné pri byte/dome so slabinou; pri čistom pozemku so sieťami často vypadnú.  
**4 + 7:** len keď je porovnanie alebo vzácnosť doložiteľná faktom — nie vždy.

---

## Čím sa líšia vetvy

| Vetva | Skrytá prednosť | Námietka → obrátenie | Segmentácia |
|---|---|---|---|
| **Byt** | prízemie = záhradka (nie kompromis) | „prízemie = horšie“ → jediná cesta k záhrade | život v byte: dieťa, pes, pestovanie, mobilita |
| **Dom** | jedno podlažie + hotové vonkajšie „miestnosti“ | infra slabina → nezávislosť | rodina, starnutie, dochádzka |
| **Pozemok** | čas/istota (siete hotové), nie tráva | strach z čakania → „projektant hneď“ | staviteľ; dve spriaznené domácnosti (ak 2 pozemky) |
| **Dom + veľký pozemok** | výmera je produkt, dom sekundárny | odľahlosť → súkromie/priestor | detstvo vonku, chov/pestovanie, remeslo |

Pravidlo pre prompt: **typ → skrytá prednosť → námietka → segmenty**. Nie naopak.  
Golden set 06.08. to pomenúva priamo: *segment určuje uhol* — vstup do A3.

---

## Jadro vs. tón

**Záväzné jadro:** fakty + `[DOPLNIŤ]` / missingData; skrytá prednosť podľa typu; obrátenie reálnej námietky; scéna v 1. vete; „pre koho“ ako životné situácie; priznaná nevýhoda keď existuje; CTA meno+tel zo vstupu; zákaz prázdnych prídavných; čísla zhmotniť.

**Len tón (nehardcodovať):** konkrétne dialógy, emoji, dĺžka metafory, lokálny humor. Menia sa; metóda nie.

**Poznámka k Sabinov €/m²:** demo používa porovnanie s Prešovom z vlastného portfólia. V produkcii len ak je porovnávacie číslo vo vstupe — inak technika 4 vypadne (guardrail cien okolia).

---

**CHECKPOINT K1 (REDO) — schválené v rámci redo behu spolu s K2/K3; STOP pred K4.**
