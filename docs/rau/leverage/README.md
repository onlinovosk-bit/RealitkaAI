# Leverage track (L01–L05) — RAU pre znalosti foundera

> **Jedna veta:** päť promptov, ktoré z tvojich vlastných rozhodnutí vytiahnu, v čom si výnimočný, kde ti uniká
> čas, čo z toho sa dá premeniť na opakovateľný majetok a čo z hotovej práce povýšiť o jeden stupeň.
> **Technicky:** päť textov v `docs/rau/leverage/`. Bez runtime, DB a UI; všetky prompty sú len na čítanie. Jediná
> zmena správania je dátová: položka v Strategic Backlogu (router pri predaji promptov vráti `GO_REQUIRED`).
> **Stav dôkazu:** IMPLEMENTED + TESTED (štruktúra, ochranné pravidlá, backlog položka) + dva slepé behy modelu
> (`docs/reports/2026-10-02-rau-leverage-blind-run.md`). Užitočnosť pre foundera **NEMERANÁ**.

## Verdikt (poctivo)

Nápad zo screenshotov je dobrý ako **vzor**, nie ako hotový produkt. Štyri prompty zo zdroja sú všeobecné:
spoliehajú sa na to, čo o sebe napíšeš, a model ti rád povie, že si výnimočný. Tu sú upravené tak, aby (1) čerpali
z dôkazov v repe, (2) nič nedomýšľali (chýbajúce údaje = `NEZNÁME` + otázka), (3) neoznačili tvoje zámerné rozhodnutia
(GO, merge, cena) za únik času ani nepripísali tebe prácu agentov a (4) vždy povedali, čo hovorí **proti**.

**Čo to NIE JE:** tajný „wealth protocol", sľub príjmu ani produkt na predaj. Predaj kurzu, e-booku či šablón je
**Strategic Backlog** (podmienka nižšie). **Podľa Ústavy v2 by to bolo REJECT** (odhad skóre ≈ 2 z 12; Q1 NIE = veto,
pod 6 je REJECT). Rozhodol si sa to napriek tomu spraviť (GO), preto je to len read-only text, ktorý sa dá zmazať
bez následkov, a spúšťaš ho len ty, na seba. Rozdiel: „VALIDATE" v Ústave znamená overiť so zákazníkom pred stavbou;
tu zákazník neexistuje, overuješ len ty.

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

Číslovanie L01–L05 sú tvoje moduly; **odporúčané poradie spustenia je iné:** `L01` (čo je moje) → `L02` (kde uniká
čas) → `L04` (čo premeniť na majetok) → `L03` (produkt; **vyžaduje L01 v rozhovore**, inak sa sám zastaví) →
`L05` (na konci bloku práce, nezávislý). Nemusíš ísť všetkým: L01 samotný stačí na test.

## Čo som zmenil oproti zdroju a prečo

1. **Dôkazy namiesto sebaopisu:** vzory sa ťažia z repa; značku `[ZDROJ]`/`[FOUNDER]`/`[ODVODENIE]` nesie každá veta s číslom,
   dátumom, odhadom alebo tvrdením o trhu. `[ZDROJ]` podopiera tvrdenie o tebe len ak je to tvoj text; záznamy písané
   agentmi sú odvodenie.
2. **Pravidlo NEZNÁME:** hodiny, príjem, publikum ani počet použití sa neodhadujú — prompt sa spýta (najviac 3 otázky).
3. **AUTORITA nie je únik** (L02, L04): GO, merge, cena, kapitál, PROD/DB, platby, DNS, zmluvy a súhlasy sú tvoje rozhodnutia
   (WALL-FOUNDER), neautomatizujú sa a nesmú byť „prvý krok". **Práca agentov sa nepripisuje tebe.**
4. **Zodpovednosť:** každý návrh nesie vlastníka, merateľný znak a termín (termín je návrh). Inak je to nápad, nie krok.
   (Triáda „špecifické know-how + páka + zodpovednosť" je z pamäte modelu, **neoverená v tejto session**; zdroj ju nemal.)
5. **Prime Directive:** upgrade, ktorý neposúva príjem ani retenciu, je `INTERNÁ HYGIENA`, nikdy „najväčší únik".
6. **Bez čísel rizika:** cenu navrhuje L03 len ako *spôsob testu*; číslo určuješ ty. Q1 = NIE znamená najviac VALIDATE a
   „príliš skoro" znamená BACKLOG; BUILD pridelí len founder.
7. **„Čo hovorí PROTI"** v každom prompte (proti lichoteniu) a **tvrdý limit výstupu** (40 riadkov).
8. **Chyba zdroja:** v zdrojovom druhom prompte je úloha skopírovaná z prvého, takže nesedí k jeho role.

## Ako to spustiť

Povedz v session napr. „spusti L01 Knowledge DNA" alebo vlož text z bloku `PROMPT` zo súboru. Najprv odpovedz na otázky.
Ak ho vložíš do chatu bez prístupu k repu, prompt povie, že nemá zdroje, a použije len tvoje odpovede.
**Povolené vstupy:** dokumenty v repe (`memory/decisions.md`, `memory/session-summary.md`, `CLAUDE.md`, `docs/architecture/`) a tvoje odpovede.
**Zakázané vstupy:** dáta z CRM (leady, klienti), `memory/people.md` (osobné údaje tretích osôb), tajomstvá a interné
dáta referenčného klienta. Jeho meno sa nikde necituje (cesta alebo nadpis sa nahradí `[REF. KLIENT]`) — ide o dôvernosť
referenčného klienta; mená, e-maily a telefóny osôb z dokumentov sú navyše osobné údaje (GDPR). Dokumenty ich obsahujú,
preto to prompty zakazujú výslovne. Výstup zostáva v chate; do pamäte ide len cez P22 na konci session a s tvojím súhlasom.

## Predaj mimo zákazníkov Revolisu — Strategic Backlog

Položka `leverage-external-productization` v `docs/rau/registry.json` (router ju pri zhode vráti ako
`backlog_conflicts` a `GO_REQUIRED`). **Veto:** Ústava Q1 a Q8. **Odomkne ju:** aspoň jeden platiaci zákazník Revolisu a
L01–L04 spustené founderom aspoň raz tak, že z toho vzniklo rozhodnutie zapísané v `memory/decisions.md`; potom nové
posúdenie Ústavou. Rozhodnutie „nepredávať" tak mení zo zákazu na podmienku — povedz, ak to nechceš.

## Známe limity (merané, nie tušené)

- **Router RAU track nepozná.** Žiadosť „spusti Knowledge DNA Engine" vráti `ASK` (nepozná druh práce, prípadne ani
  projekt). Rector to berie ako zodpovedanú otázku, len keď nie sú žiadne rizikové zhody, a **povie to** v riadku
  `RAU route:`. Rozšírenie routeru je odložené do prvého reálneho spustenia L01 (Ústava Q8).
- **Backlog zhoda je kľúčové slová.** Predaj promptov, kurz/e-book z nich a „digitálny produkt z promptov" chytí
  (tabuľka 25 fráz v teste). Parafrázu („spravme z toho kurz") nechytí a negáciu („nechceme predávať prompty")
  nerozlíši — Rector číta zadanie aj sám.
- **Užitočnosť NEMERANÁ.** Testy a slepé behy overili štruktúru a ochranné pravidlá, nie to, či ti výstup zmení rozhodnutie.
  Skutočný test: spusti L01 raz a zapíš, či z neho vzniklo rozhodnutie.
- Slepý beh používal model-sudcu (nie deterministický) a vzorku šiestich + piatich behov, vždy na výňatkoch z repa;
  zdroj čísel: `docs/reports/2026-10-02-rau-leverage-blind-run.md`.
- Zdroj nápadu: príspevok z Instagramu (názov účtu je na screenshote skrátený, „callme.wisdo…", 22. septembra, rok nie je
  vidieť). Videl som 5 z 6 snímok; tvrdenia o poslednej snímke nie sú overené. Mená a atribúcie v ňom (Naval Ravikant)
  sú tvrdenia autora príspevku, nie overené fakty. Formulácie sú vlastné, nie preklad.
