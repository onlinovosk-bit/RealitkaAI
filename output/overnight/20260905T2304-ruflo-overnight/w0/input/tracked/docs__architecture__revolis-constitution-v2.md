---
title: "Revolis Constitution v2.0 — Founder Reality Check"
project: Revolis.AI
type: governance
status: living-document
created: 2026-06-16
tags: [revolis, constitution, decision-gate, timing, moat, founder-traps]
related:
  - "[[master-data-sourcing-map]]"
  - "[[clay-positioning-reframe]]"
  - "[[decisions]]"
---

# REVOLIS CONSTITUTION v2.0 — Founder Reality Check

> NAJDÔLEŽITEJŠIA VETA (platí nad všetkým ostatným):
> **Každá hodina vývoja je investícia rizikového kapitálu. Ak funkcionalita
> nezvyšuje pravdepodobnosť získania ďalšieho platiaceho klienta alebo zvýšenia
> retencie existujúceho klienta, predpokladaj, že ide o nesprávnu investíciu,
> pokiaľ sa nepreukáže opak.**

Pred KAŽDOU funkcionalitou prejdi tento check. Toto je rozhodovacia brána,
nie odporúčanie. Ak featura neprejde, nestavia sa — ide do Strategic Backlog.

## 12-OTÁZKOVÝ REALITY CHECK

### BUSINESS
1. Zaplatil by za to dnešný klient? **(VETO: ak NIE → max VALIDATE)**
2. Zarobí klient viac peňazí do 90 dní?
3. Skráti cestu Lead → Telefonát → Obhliadka → Zmluva → Provízia?

### STRATEGY
4. Posilňuje náš moat?
5. Posilňuje náš flywheel (používanie → dáta → lepší produkt → viac používania)?
6. Prináša nové unikátne dáta? (viď Asymmetric Advantage nižšie)

### EXECUTION
7. Má vyššie ROI ako všetko ostatné v backlogu?
8. Je správny čas to stavať? **(VETO: ak "príliš skoro" → BACKLOG, bez ohľadu na skóre)**
9. Dá sa MVP dodať za menej než 2 týždne?

### FOUNDER
10. Nepadám do niektorej Founder Trap? (zoznam nižšie)
11. Je toto najlepšie využitie môjho času?
12. Keby som mal postaviť iba jednu vec tento kvartál, bola by to táto?

## SKÓROVANIE (s veto pravidlom)
- 12/12 = BUILD NOW
- 10–11 = BUILD
- 8–9 = VALIDATE (over so zákazníkom pred stavaním)
- 6–7 = BACKLOG
- <6 = REJECT
- **VETO OVERRIDE:** Ak otázka 8 (timing) = "príliš skoro" → BACKLOG bez ohľadu
  na súčet. Ak otázka 1 (zaplatil by klient) = NIE → strop je VALIDATE.
  Vysoké skóre nezachráni zlý timing ani nulový dopyt.

## VRSTVA 1 — BUSINESS VALUE
Odpovedz konkrétne, nie všeobecne. "Zarobí klient viac" musí mať mechanizmus:
ktorý krok v Lead→Provízia reťazci to zrýchľuje/zachraňuje a o koľko?

## VRSTVA 2 — TIMING ADVANTAGE ANALYSIS
Najväčšie startupy nevyhrali lepšou technológiou, ale správnym momentom.
Správny nápad o 5 rokov priskoro = mŕtvy startup.
Pre každú featuru: □ príliš skoro  □ správny čas  □ príliš neskoro — a odôvodni.
"Príliš skoro" = chýba dáta/trh/dopyt na to, aby featura fungovala TERAZ.
→ Príliš skoro NEIMPLEMENTUJ. Presuň do Strategic Backlog.
Aktuálne "príliš skoro" (data-blocked): Plánovaná stavba, Bod zlomu, Deal Risk
predikcie, Market Intelligence. Nie sú zlé — sú predčasné.

## VRSTVA 3 — ASYMMETRIC ADVANTAGE (Thiel) — uzemnené na Revolis
Nepýtaj "je to dobrá featura?". Pýtaj "čo budeme vedieť my, čo konkurencia nie?"
Pre KAŽDÚ featuru odpovedz:
- Čo sa po implementácii DOZVIEME?
- Aké nové dáta budeme VLASTNIŤ?
- Akú spätnú väzbu budeme zbierať o správaní maklérov?
- Čo bude Revolis vedieť o rok, čo dnes nevie nikto?
Konkrétny moat Revolisu = proprietárne dáta zo správania maklérov (čo robia v
Action Queue, ktoré leady zachraňujú) + integračné dáta (Realvia/RealSoft/
Nehnuteľnosti). Ak odpoveď je "nič" → featura netvorí moat → prehodnoť.

## VRSTVA 4 — FOUNDER TRAPS (rozšírené)
| Pasca | Otázka |
|---|---|
| Feature Trap | Staviam funkciu namiesto riešenia? |
| Perfection Trap | Čakám na dokonalosť namiesto MVP? |
| Technology Bias | Staviam to, lebo je to technicky zaujímavé? |
| Customer Avoidance | Kedy som naposledy hovoril so zákazníkom? |
| Founder Ego | Je to môj nápad alebo zákazníkov? |
| Sunk Cost | Pokračujem len preto, že som už investoval čas? |
| Local Optimization | Optimalizujem detail namiesto celého systému? |
| Complexity Bias | Neexistuje jednoduchšie riešenie? |
| Timing Error | Nie je na to ešte skoro? |
| Distribution Blindness | Viem to vôbec dostať k zákazníkom? |
Najčastejšie v SaaS: Customer Avoidance + Distribution Blindness.

## STRATEGIC BACKLOG
Featury, ktoré sú dobré ale predčasné (timing veto), nejdú do koša — idú sem
s dôvodom a podmienkou, ktorá ich odomkne. Príklad:
- "Plánovaná stavba" → odomkne sa, keď ÚPV SR potvrdí verejné API.
- "Bod zlomu / Market Intelligence" → odomkne sa, keď portál dá dáta.
- "Deal Risk predikcie" → odomkne sa po N mesiacoch reálneho usage (deal história).

## MESAČNÁ MOAT REVÍZIA (rituál, 1× za mesiac)
Per-featura check (otázka 6) chytá jednotlivé zlé rozhodnutia. Táto revízia
chytá DRIFT smeru. Raz za mesiac si sadni a odpovedz:
- Čo Revolis VIE dnes, čo nevedel pred mesiacom?
- Čo z toho NEVIE konkurencia? (Thiel)
- Prehĺbil sa moat (proprietárne usage + integračné dáta), alebo len pribudli featury?
- Ktoré dáta sme za mesiac začali vlastniť? Ktoré stále nemáme a mali by sme?
Ak odpoveď na "čo nevie konkurencia" je za celý mesiac "nič nové" → varovný
signál: stavia sa, ale moat sa neprehlbuje. Zapíš výstup do decisions.md.

## LOKÁLNY PRE-FLIGHT (pred commitom / PR)

Pred každým commitom alebo otvorením PR v `apps/crm` spusti lokálne (v tomto poradí):

```bash
npm run lint
npm run test
npm run build
```

CI je **posledná** kontrola, nie prvá — neposielaj kód, ktorý si lokálne neprešiel.
Merge do `main` až po zelenom CI; lokálny pre-flight znižuje zbytočné CI cykly.

## POUŽITIE
- Pred každým briefom/featurou: prejdi 12 otázok, zapíš skóre + veto do briefu.
- Agenti/swarm: konzultuj túto ústavu pred návrhom akejkoľvek featury.
- Výsledok zapíš do decisions.md (čo BUILD, čo BACKLOG, prečo).
