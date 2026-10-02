# Leverage track (L01–L05) — RAU pre znalosti foundera

> **Jedna veta:** päť promptov, ktoré z tvojich vlastných rozhodnutí vytiahnu, v čom si výnimočný, kde ti uniká
> čas, čo z toho sa dá premeniť na opakovateľný majetok a čo z hotovej práce povýšiť o jeden stupeň.
> **Technicky:** päť textov v `docs/rau/leverage/`. Žiadny kód, runtime, DB ani UI; nič nemení (všetky
> prompty sú len na čítanie). Router RAU tento track nepozná (viď „Známe limity").
> **Stav dôkazu:** IMPLEMENTED + TESTED (štruktúra a ochranné pravidlá). Užitočnosť pre foundera **NEMERANÁ**.

## Verdikt (poctivo)

Nápad zo screenshotov je dobrý ako **vzor**, nie ako hotový produkt. Štyri prompty zo zdroja sú všeobecné:
spoliehajú sa na to, čo o sebe napíšeš, a model ti rád povie, že si výnimočný. Tu sú upravené tak, aby (1) čerpali
z dôkazov v repe, (2) nič nedomýšľali (chýbajúce údaje = `NEZNÁME` + otázka), (3) neoznačili tvoje zámerné rozhodnutia
(GO, merge, cena) za únik času a (4) vždy povedali, čo hovorí **proti**. Čo sa nemeralo, je `NEMERANÉ`.

**Čo to NIE JE:** tajný „wealth protocol", sľub príjmu ani produkt na predaj. Predaj kurzu, e-booku či šablón je
**Strategic Backlog** (podmienka nižšie). Podľa Ústavy v2 Q1 by dnešný klient za tento track nezaplatil, preto je
strop **VALIDATE** — spúšťa ho len founder, na seba.

## Mapa: tvoje moduly → súbory → čo už existuje

| Tvoj modul | Súbor | Čo robí | Čo už existovalo (reuse) |
|---|---|---|---|
| 01 Knowledge DNA Engine | [L01](L01-knowledge-dna.md) | vzory z tvojich rozhodnutí → jedna veta know-how | `memory/decisions.md`, Ústava Q4–Q6 (len ako brána); ťažba vzorov **neexistovala** |
| 02 Leverage Engine | [L02](L02-leverage-audit.md) | činnosti podľa vrstvy práca / kapitál / kód / médiá | Blueprint (agent ≠ autorita) |
| 03 Productization Engine | [L03](L03-productize.md) | know-how → produkt bez teba, najprv interný | `docs/architecture/clay-positioning-reframe.md`, Ústava |
| 04 Asset Converter | [L04](L04-time-to-asset.md) | čas v prenájme → majetok (90 dní) | P22 typy záznamov |
| 05 Asset Compounder | [L05](L05-asset-compounder.md) | rebrík prompt → … → príjem, povýšiť o 1 stupeň | P22, P23, posúdenie Agent Factory |
| *Execution Engine* | — nestavia sa | Build → Verify → Ship → Measure → Learn | **je to samotné RAU** (`docs/rau/prompts/` P00–P23) |

V tvojom texte sa číslo 05 opakuje (Execution Engine aj Asset Compounder). Rozhodol som: Compounder = L05,
Execution Engine = existujúce RAU (nič sa neduplikuje). Premenovať je lacné — povedz.

## Poradie a závislosti

`L01` (čo je moje) → `L02` (kde uniká čas) → `L04` (čo premeniť na majetok) → `L03` (produkt; **vyžaduje L01**,
inak sa sám zastaví) → `L05` (na konci bloku práce, nezávislý). Nemusíš ísť všetkým: L01 samotný stačí na test.

## Čo som zmenil oproti zdroju a prečo

1. **Dôkazy namiesto sebaopisu** (L01–L05): vzory sa ťažia z repa; tvrdenie bez značky `[ZDROJ]`/`[FOUNDER]`/`[ODVODENIE]` sa maže.
2. **Pravidlo NEZNÁME:** hodiny, príjem, publikum ani počet použití sa neodhadujú — prompt sa spýta (najviac 3 otázky).
3. **AUTORITA nie je únik** (L02, L04): GO, merge, cena a kapitál sú tvoje rozhodnutia (WALL-FOUNDER), neautomatizujú sa.
4. **Zodpovednosť:** každý návrh nesie vlastníka, merateľný znak a termín. Inak je to nápad, nie krok. (Triáda
   „špecifické know-how + páka + zodpovednosť" je z pamäte modelu, **neoverená v tejto session**; zdroj ju nemal.)
5. **Bez čísel rizika:** cenu navrhuje L03 len ako *spôsob testu*; číslo určuješ ty.
6. **„Čo hovorí PROTI"** v každom prompte (proti lichoteniu).
7. **Chyba zdroja:** v zdrojovom druhom prompte je úloha skopírovaná z prvého, takže nesedí k jeho role.

## Ako to spustiť

Povedz v session napr. „spusti L01 Knowledge DNA" alebo vlož text z bloku `PROMPT` zo súboru. Najprv odpovedz na otázky.
**Povolené vstupy:** dokumenty v repe (`memory/decisions.md`, `memory/session-summary.md`, `CLAUDE.md`, `docs/architecture/`) a tvoje odpovede.
**Zakázané vstupy:** dáta z CRM (leady, klienti), `memory/people.md` (osobné údaje tretích osôb), tajomstvá a interné
dáta referenčného klienta — ten sa nikde nepomenúva (GDPR, stealth). Výstup zostáva v chate; do pamäte ide len cez
P22 na konci session a len s tvojím súhlasom.

## Predaj mimo zákazníkov Revolisu — Strategic Backlog

Položka `leverage-external-productization` v `docs/rau/registry.json` (router ju pri zhode vráti ako
`backlog_conflicts`). **Veto:** Ústava Q1 a Q8. **Odomkne ju:** aspoň jeden platiaci zákazník Revolisu a L01–L04 spustené
founderom aspoň raz tak, že z toho vzniklo rozhodnutie zapísané v `memory/decisions.md`; potom nové posúdenie Ústavou.

## Známe limity (merané, nie tušené)

- **Router RAU track nepozná.** Žiadosť „spusti Knowledge DNA Engine" vráti `ASK` (nepozná druh práce). Rector to berie
  ako zodpovedanú otázku, keď founder modul pomenoval, a **povie to** v riadku `RAU route:`. Rozšírenie routeru je
  odložené do prvého reálneho spustenia L01 (Ústava Q8).
- **Užitočnosť NEMERANÁ.** Test overil štruktúru a ochranné pravidlá, nie to, či ti výstup zmení rozhodnutie.
  Skutočný test: spusti L01 raz a zapíš, či z neho vzniklo rozhodnutie.
- Slepý test používal model-sudcu (nie deterministický) a vzorku šiestich behov; viď `docs/rau/RAU-v1.0.md` §13.
- Zdroj: príspevok z Instagramu (názov účtu je na screenshote skrátený, „callme.wisdo…", 22. septembra, rok nie je
  vidieť). Videl som 5 z 6 snímok; tvrdenia o poslednej snímke nie sú overené. Mená a atribúcie v ňom (Naval Ravikant)
  sú tvrdenia autora príspevku, nie overené fakty. Formulácie sú vlastné, nie preklad.
