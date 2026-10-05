# RAU Leverage track — slepé behy promptov L01–L05 (2026-10-02)

> **Čo to dokazuje:** že prompty pri prvom ťahu (bez odpovedí foundera) nevymýšľajú údaje o founderovi, dodržia zákazy a
> výstupnú štruktúru. **Čo to NEDOKAZUJE:** že výstup pomôže founderovi rozhodnúť sa. Užitočnosť je **NEMERANÁ**.
> Hodnotil LLM-sudca (nie deterministický skript), vzorka je 6 + 6 behov. Výstupy behov nie sú v repe (ležia v scratchpade
> session); dá sa zopakovať podľa metódy nižšie.

## Metóda

- **Vykonávateľ:** nezávislý sub-agent, ktorý dostal prompt (blok `PROMPT`) a DATA PACK výňatkov z repa. Pokyn: spusti
  prompt pri prvom ťahu, founder neodpovedal, jediné fakty sú v DATA PACKu, nič iné nečítaj. Počet volaní Read sa
  zhodoval s počtom pridelených súborov u všetkých 12 behov (inštrukcia, nie mechanizmus: agent mal prístup k celému repu).
- **DATA PACK 1** (beh 1): `memory/session-summary.md` r. 1–60, `memory/working-agreement.md` r. 1–30, `CLAUDE.md` r. 1–30,
  `docs/rau/RAU-v1.0.md` r. 31–46, `memory/open-tasks.md` r. 37–64. **DATA PACK 2** (beh 2, nové výňatky):
  `memory/session-summary.md` r. 61–160, `memory/decisions.md` r. 1–45, `memory/open-tasks.md` r. 1–36 a 65–100,
  `docs/rau/RAU-v1.0.md` r. 84–113, `CLAUDE.md` r. 31–80. Riadky s menom referenčného klienta sa vynechali.
- **Šesť behov:** L01, L02, L03 bez L01 (test zastavenia), L03 s testovacím vstupom L01 (**fixture, nie skutočný výstup L01**:
  tri odvodené vzory zo súborov repa, označené ako fixture), L04, L05 (vstup bloku: zoznam súborov a doklady o použití).
- **Sudca:** druhý nezávislý agent; pre každý výstup vypísal vymyslené tvrdenia (A), neoznačené vety (B), chýbajúce sekcie
  (C), porušenia zákazov (D), rozsah (E), vecnosť „PROTI" (F), poctivosť (G), osobitné pravidlá (H). Riadky a slová
  počítal skriptom. Okrem toho som všetkých 6 výstupov behu 1 prečítal sám.

## Beh 1 — prvý beh, prompty ešte bez opráv (nezaujatý)

| Beh | A vymyslené / zle prečítané | B neoznačené | D porušenia | E rozsah | F PROTI | G poctivosť |
|---|---|---|---|---|---|---|
| L01 | 0 (1 mäkké) | ~3 (+5 holých `[ZDROJ]`) | čisté | 63 r. / 807 sl. | áno | áno |
| L02 | 0 (1 mäkké) | 2 (+3× nepovolená značka) | čisté | 66 r. / 732 sl. | áno | áno |
| L03 bez L01 | 0 | 0 | čisté | 1 r. | — | áno; správne „Najprv spusti L01." |
| L03 + fixture | 1 („stojí len minúty tvojho času") | 3 | čisté | 52 r. / 711 sl. | áno | áno (výhrada) |
| L04 | 4 (2 zle prečítané zdroje, 2 o founderovi) | ~6 | **AUTORITA použitá ako konverzia a prvý krok** | 73 r. / 916 sl. | áno | **čiastočne** |
| L05 | 0 (3 mäkké) | 0–1 | čisté | 48 r. / 646 sl. | áno | áno; nič nepovýšil |

Spolu: A = 5, B ≈ 14, jedno porušenie pravidla (L04). Limit „max jedna obrazovka" nesplnil nikto (48–73 riadkov);
nebol meraný, preto sa nahradil tvrdým limitom. Žiadny výstup nenapísal sumu ceny, meno referenčného klienta ani
neprečítal zakázaný zdroj. Obe „stráže" fungovali: L03 bez L01 sa zastavil, L05 nepovýšil nič (0 použití mimo testov).

## Zmeny po behu 1 a po nezávislom review

Review (adverzariálny, read-only): verdikt **SHIP WITH FIXES**, 0× P0, 8× P1. Opravené: meno klienta a PII v povolených
zdrojoch (cesta/nadpis → `[REF. KLIENT]`, mená a e-maily nikdy); `[ZDROJ]` len na vlastný text foundera, záznamy agentov
sú odvodenie, citovať len prečítané súbory, pri rozpore platí novší; L04 už nepripisuje trakciu z CRM a nehádže scenár;
L05 definuje „použitie" (test sa nepočíta), nič nepovyšuje bez 2 použití; L03 má Ústavu a clay-positioning vo vstupoch,
vetá Q1/Q8 a nesmie samo prideliť BUILD; AUTORITA rozšírená (PROD/DB, platby, DNS, zmluvy, súhlasy); práca agentov sa
nepripisuje founderovi; upgrade bez vplyvu na príjem je `INTERNÁ HYGIENA`; limit 40 riadkov; skill už neznižuje ASK potichu;
Ústava v §13 aj README poctivo (skóre ≈ 2 z 12 → REJECT, GO prišlo pred kontrolou); regexy backlogu (5 vzorov,
29 fráz). Test prepísaný: parsuje sekcie (pôvodný test nechal prežiť 44 z 45 nezávislých mutácií).

## Beh 2 — po opravách, nové výňatky (DATA PACK 2)

| Beh | A | B | D | E rozsah | F | G |
|---|---|---|---|---|---|---|
| L01 | 0 | 1 | čisté | 24 r. / 338 sl. | áno | áno |
| L02 | 0 (1 neisté) | 0 | čisté | 28 r. / 395 sl. | áno | áno |
| L03 bez L01 | 0 | 0 | čisté | 1 r. | — | áno; správny stop |
| L03 + fixture | 0 (1 neisté) | 0 | čisté | 31 r. / 419 sl. | áno | áno |
| L04 | 2 (smoke test pripísaný founderovi; WALL-RULES ako majetok) | 1 (+1 zneužitá značka `[FOUNDER]`) | pripísaná činnosť agenta; krok C spomenutý 2× | 29 r. / 453 sl. (401 bez znakov tabuľky) | áno | áno (výhrada) |
| L05 | 0 | 0 | čisté | 29 r. / 382 sl. | áno (väčšinou opakuje verdikt) | áno; nič nepovýšil |

Spolu: A = 2 (obe L04), B ≈ 2, v limite riadkov 6 z 6 (slová: 5 z 6, jeden hraničný). Novší záznam sa použil správne
(0/10 cien namiesto 0/9).

**Čo z toho neplatí ako dôkaz:** beh 2 beží na **opravených** promptoch po spätnej väzbe z behu 1 a review, iba na iných
výňatkoch; je to teda lepšie než „ladené na tej istej sade", ale nie nezaujaté. Sudca aj vykonávateľ sú z tej istej
rodiny modelov. Jeden beh na prompt je anekdota, nie štatistika.

## Mutačný dôkaz testov (nie sudca, deterministické)

76 mutácií v kópii stromu (nikdy v skutočnom repe; overené hashom súborov pred a po): prompty (vymazané/otočené pravidlá,
čísla ceny `€49`/`EUR 49`/„70 percent", meno klienta vrátane „Smoľko"/„Reality S."), regexy backlogu (každá alternatíva),
README, §13, skill, report a `decisions.md`. Prvý beh: 70 zabitých; **1 skutočná medzera** v teste (L04 „Číslo odhadni"
prežilo → doplnená aserícia), 5 „nepoužitých" kvôli mojim zastaraným vzorom (zalomené riadky, zmenený text) → opravené a
znovu spustené: 76/76. Nezávislých 45 mutácií reviewera pôvodný test nezabil (44 prežilo); na nový test sa nespúšťali.

## Posledná dávka opráv — NEMERANÁ

Po behu 2 sa podľa sudcu doplnilo: pravidlo „neurčený aktér (HUMAN) = NEZARADENÉ" a „MAJETOK len s dokladom" (L02, L04),
scenár bez predpokladov od foundera = NEZNÁME (L04), definícia výskytu v L01 (postup agenta nie je vzor), väzba premeny L03
na platiaceho klienta a „Q1/Q8 NEZNÁME = najviac VALIDATE", jedno miesto pre „krok na dnes", tvar značky (na vete, nie na
konci odseku), PROTI aj pri záveri „nepovyšovať" (L05). **Túto verziu som už nespustil** — platia o nej len štrukturálne
testy. Každé pridané pravidlo môže niečo pokaziť; ďalší beh na reálnom zadaní to ukáže.

## Známe slabiny, ktoré nie sú opravené

- L01: stop-pravidlo „žiadny vzor → skonči" sa pri počte výskytov „—" nespustí; model pokračuje s agentskými vzormi.
- L05: sekcia „PROTI" pri nulovom povýšení väčšinou opakuje verdikt (doplnené pravidlo to len zužuje).
- Počítanie slov: tabuľky nafukujú počet (453 vs 401). Limit je 450 vrátane tabuliek, podľa sudcu hraničný.
- Význam `[FOUNDER: dnes]` pri dokladoch neznámeho pôvodu (L05) zostáva voľný.
- Obsah výstupov sa neuložil do repa; zopakovať ho treba podľa tejto metódy.
