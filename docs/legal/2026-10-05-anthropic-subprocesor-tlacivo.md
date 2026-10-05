# Tlačivo: Anthropic ako ďalší sprostredkovateľ (DPA s Reality Smolko)

> **Status:** NÁVRH na posúdenie advokátom, nie právne poradenstvo. Pripravené 2026-10-05.
> Fakty o Anthropicu sú z `docs/architecture/demand-contract-v1.md` (overené z oficiálnych zdrojov 2026-09-29).
> Fakty o tom, čo Revolis Anthropicu posiela, sú z `docs/reports/2026-09-29-llm-callsite-pii-audit.md`.
> Polia `⚠️ DOPLNIŤ` / `⚠️ OVERIŤ` vyplní founder alebo advokát. Nič z nich som nedomýšľal.

---

## 0. Ktorý variant použiť (rozhodne podpísaná DPA rev.2 z apríla 2026)

V repozitári je iba starší návrh DPA (`DPA_Reality_Smolko.md`). Podpísaná rev.2 je PDF u foundera, ja ju nevidím.

| Čo je v rev.2 v článku o ďalších sprostredkovateľoch | Použi |
|---|---|
| **všeobecný** písomný súhlas + povinnosť informovať o zmene a lehota na námietky (v návrhu čl. 4.1 a 4.3, 30 dní) | **Variant A — Oznámenie** (bez podpisu Prevádzkovateľa; zmena platí, ak do lehoty nenamietne) |
| **konkrétny** súhlas, alebo uzavretý zoznam bez mechanizmu zmeny | **Variant B — Dodatok** (podpisujú obe strany) |
| v zozname je „OpenAI (alebo Anthropic)“ ako v návrhu | advokát posúdi, či to Anthropic pokrýva; bezpečnejšie je poslať aj tak **Variant A** |

**Dôležité pre advokáta:** podľa auditu z 2026-09-29 už **dnes ~20 živých funkcií** posiela údaje Anthropicu (napr. triedenie leadov, ranný prehľad, návrhy odpovedí, analýza hovorov). Nejde teda len o novú funkciu D1. Advokát posúdi, ako naložiť s doterajším spracúvaním pred oznámením.

---

## Variant A — Oznámenie o zapojení ďalšieho sprostredkovateľa

**ONLINOVO, s. r. o.** (prevádzkovateľ služby Revolis.AI), IČO 54166942, sídlo: ⚠️ DOPLNIŤ
(ďalej „Sprostredkovateľ“)

**Reality Smolko, s.r.o.**, IČO: ⚠️ DOPLNIŤ, sídlo: ⚠️ DOPLNIŤ
k rukám: ⚠️ DOPLNIŤ (kontaktná osoba pre ochranu údajov)
(ďalej „Prevádzkovateľ“)

V ⚠️ DOPLNIŤ dňa ⚠️ DOPLNIŤ

**Vec: Oznámenie o zapojení ďalšieho sprostredkovateľa podľa čl. ⚠️ DOPLNIŤ (podľa rev.2) Zmluvy o spracúvaní osobných údajov zo dňa ⚠️ DOPLNIŤ**

Vážený pán / Vážená pani,

v súlade s čl. ⚠️ DOPLNIŤ Zmluvy o spracúvaní osobných údajov (ďalej „Zmluva“) Vám oznamujeme zapojenie
ďalšieho sprostredkovateľa:

| | |
|---|---|
| Subjekt | **Anthropic** — ⚠️ OVERIŤ zmluvnú entitu podľa nášho účtu (Anthropic, PBC, USA, alebo Anthropic Ireland, Limited) a jej adresu |
| Činnosť | spracovanie textu jazykovým modelom Claude cez API: triedenie a priorita dopytov, návrhy odpovedí a správ pre makléra, zhrnutia a prehľady, analýza prepisu hovoru, extrakcia požiadaviek klienta z textu dopytu (typ nehnuteľnosti, lokalita, rozpočet) |
| Kategórie dotknutých osôb | záujemcovia (kupujúci, nájomcovia), predávajúci / prenajímatelia, makléri Prevádzkovateľa |
| Kategórie údajov | meno záujemcu; text dopytu a poznámky makléra; meno makléra; údaje o nehnuteľnosti vrátane adresy; prepis hovoru. **Telefónne čísla a e-mailové adresy sa pred odoslaním maskujú** (od 2026-09-29). Osobitné kategórie podľa čl. 9 GDPR sa nespracúvajú |
| Lokalita spracovania | ⚠️ OVERIŤ (v DPA Anthropicu neuvedené; nastavenie regiónu účtu) |
| Prenos do tretej krajiny | áno (USA); štandardné zmluvné doložky, modul 3 (sprostredkovateľ → sprostredkovateľ), podľa DPA Anthropicu |
| Použitie na tréning modelov | nie: „Anthropic may not train models on Customer Content from Services“ (Commercial Terms, účinné 17. 6. 2025) |
| Doba uchovania u Anthropicu | počas zmluvy ⚠️ OVERIŤ (sekundárne zdroje uvádzajú 30 dní, oficiálne nepotvrdené); po skončení zmluvy výmaz do 30 dní (DPA Anthropicu) |
| Ďalší sprostredkovatelia Anthropicu | zoznam na anthropic.com/subprocessors; Anthropic oznamuje zmeny vopred s 15-dňovou lehotou na námietku |

Sprostredkovateľ uložil Anthropicu povinnosti ochrany údajov v rozsahu najmenej rovnakom ako Zmluva,
prostredníctvom zmluvných podmienok Anthropicu a jeho zmluvy o spracúvaní údajov (DPA účinná od 24. 2. 2025).

Ak so zapojením nesúhlasíte, môžete vzniesť odôvodnené námietky do **⚠️ DOPLNIŤ (podľa rev.2; v návrhu 30)
dní** od doručenia tohto oznámenia na adresu privacy@revolis.ai. Ak námietky nevznesiete, zmena sa považuje
za odsúhlasenú a Príloha (zoznam ďalších sprostredkovateľov) sa dopĺňa o vyššie uvedený riadok.

S pozdravom

⚠️ DOPLNIŤ — meno, funkcia (štatutárny orgán ONLINOVO, s. r. o.)

---

## Variant B — Dodatok č. ⚠️ DOPLNIŤ k Zmluve o spracúvaní osobných údajov

uzavretý medzi **Reality Smolko, s.r.o.** (Prevádzkovateľ) a **ONLINOVO, s. r. o.** (Sprostredkovateľ),
identifikácia strán ako v Zmluve zo dňa ⚠️ DOPLNIŤ.

**Čl. I.** Strany sa dohodli, že Príloha č. ⚠️ DOPLNIŤ Zmluvy (Zoznam ďalších sprostredkovateľov) sa dopĺňa
o riadok uvedený v čl. II tohto dodatku a Prevádzkovateľ udeľuje súhlas so zapojením tohto ďalšieho sprostredkovateľa.

**Čl. II.** Riadok prílohy:

| Subjekt | Spracovateľská činnosť | Lokalita | Prenos do 3. krajiny | Mechanizmus |
|---|---|---|---|---|
| Anthropic (⚠️ OVERIŤ entitu) | Spracovanie textu jazykovým modelom (triedenie dopytov, návrhy textov, zhrnutia, extrakcia požiadaviek klienta) | ⚠️ OVERIŤ | Áno (USA) | SCC (modul 3) |

**Čl. III.** Rozsah údajov, ktoré sa Anthropicu odovzdávajú, je uvedený v tabuľke vo Variante A. Ostatné
ustanovenia Zmluvy sa nemenia.

**Čl. IV.** Dodatok nadobúda platnosť a účinnosť dňom podpisu oboma stranami. Vyhotovuje sa v dvoch rovnopisoch.

V ⚠️ DOPLNIŤ dňa ⚠️ DOPLNIŤ

| Za Prevádzkovateľa | Za Sprostredkovateľa |
|---|---|
| ⚠️ DOPLNIŤ meno, funkcia, podpis | ⚠️ DOPLNIŤ meno, funkcia, podpis |

---

## Súvisiaca zmena: verejný zoznam `/legal/sub-processors`

Stránka `apps/crm/src/app/(public)/legal/sub-processors/page.tsx` dnes Anthropic neuvádza. Po odoslaní
oznámenia (A) alebo podpise dodatku (B) treba doplniť riadok. Kód nemením, lebo ide o verejný právny text:

```ts
{ name: "Anthropic", country: "USA", purpose: "AI spracovanie textu (triedenie, návrhy, zhrnutia, extrakcia dopytu)", guarantee: "SCC" },
```

Zmenu urobím na `GO SUBPROCESSORS-PAGE`.

## Pred odoslaním over (founder / advokát)

- [ ] Ktorý variant podľa podpísanej rev.2 (tabuľka v časti 0), číslo článku a lehota na námietky.
- [ ] Zmluvná entita Anthropicu podľa nášho účtu (faktúra / Console → Billing) a jej adresa.
- [ ] Lokalita spracovania a retencia API dát počas zmluvy (privacy.claude.com, Trust Center).
- [ ] Postup k doterajšiemu spracúvaniu pred oznámením (~20 živých funkcií).
- [ ] Doplnené polia `⚠️ DOPLNIŤ` (sídla, IČO Prevádzkovateľa, štatutár, dátumy).
- [ ] Po doručení: riadok do `/legal/sub-processors` a záznam do `memory/decisions.md`.
