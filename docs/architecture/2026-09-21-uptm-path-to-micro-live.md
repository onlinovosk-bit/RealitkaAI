# UPTM — cesta k Micro-Live. Jeden blok na schválenie.

**Stav:** NÁVRH. Nič z tohto nie je začaté. Founder schvaľuje alebo škrtá
po položkách; až potom sa čokoľvek implementuje.

**Dnešný stav (overené, `uptm-runner@c9ae2aa`, 134 testov):**

```
ENFORCED     0
PARTIAL      7
DECLARATIVE  2
MISSING      5
```

LIVE je za štyrmi podmienkami, default DENY, lease negrantovaný.

---

## Predpoklad, z ktorého to počítam

€700 nie je veľkosť príležitosti. Je to veľkosť **testu** — koľko si ochotný
stratiť, aby si zistil, či to funguje, predtým než nasadíš rádovo viac.

Z toho plynie jediná vec, na ktorej záleží: **rozhodnutie „škálovať alebo
zabiť" musí stáť na dôkaze, ktorý neklame.** Nie na tom, aby systém zarobil.
€700 stratených pri správnom rozhodnutí je dobrá investícia. €700 zarobených
pri fabrikovanom dôkaze je najhoršia možná — lebo z nej vyplynie ďalších
10 000 €.

Preto je zoznam zoradený podľa toho, čo ti môže ublížiť, nie podľa čísla P.

---

## Skupina A — bez týchto môžeš prísť o viac než €700

Toto je jediná skupina, kde je hranica medzi „stratil som test" a „stratil som
viac, než som chcel".

| # | P | Princíp | Dnes | Čo chýba |
|---|---|---|---|---|
| A1 | **P8** | Independent Kill Switch | DECLARATIVE | Vypínač existuje na papieri. Nie je mechanizmus, ktorý by ho vedel spustiť nezávisle od runnera — ak sa runner zblázni alebo zasekne, nie je čo stlačiť. Súčasť: povinný drill (`kill_switch_drill_required: true` už je v pravidlách, drill nie). |
| A2 | **P10** | Validation Capital | MISSING | Nie je vynútený strop. Nič dnes nebráni tomu, aby sa obchodovalo za viac než validačnú tranžu. Toto je doslova ochrana tých €700. |
| A3 | **P2** | Same Validated Path | MISSING | Backtest a live môžu ísť inou cestou kódu. Ak áno, výsledok testu nehovorí o live správaní — a €700 si minul na meranie niečoho iného. |
| A4 | **P13** | No Model in Pre-Trade Path | MISSING | Nič nebráni tomu, aby LLM rozhodoval pred vykonaním obchodu. Nedeterministický vstup do pre-trade cesty znamená, že to isté zadanie dá iný obchod. |

**Odporúčanie: A1 a A2 sú nepodkročiteľné.** Bez nich by som Micro-Live
neodporučil ani za €70. A3 a A4 sú rovnako vážne, ale dajú sa spraviť ako
detektor („ak sa cesty rozchádzajú, STOP") namiesto plnej refaktorizácie.

---

## Skupina B — bez týchto nebudeš vedieť, či to funguje

Táto skupina nechráni €700. Chráni to rozhodnutie o 10 000 €.

| # | P | Princíp | Dnes | Čo chýba |
|---|---|---|---|---|
| B1 | **P3** | Data Before Evidence | MISSING | Nie je overené, že dáta, na ktorých stojí verdikt, vôbec existovali a odkiaľ. Detektor UPTM-002 rieši *fabrikované* čísla; toto rieši *chýbajúcu proveniencia*. |
| B2 | **P9** | No Progress Illusion | PARTIAL | Časť je vynútená. Chýba to, čo zabráni vykazovať pokrok z vecí, ktoré sa nestali. |
| B3 | **P12** | Evidence Has Commit & Expiry | PARTIAL | Dôkaz má commit, ale expirácia nie je vynútená. Starý zelený dôkaz môže podoprieť nové rozhodnutie. |
| B4 | **P1** | Reality over Architecture | MISSING | Nič neoveruje, že deklarovaný stav sedí so skutočným. Ironicky: presne táto chyba nás dnes stála tri typové chyby v RealitkaAI. |

**Odporúčanie: B1 a B3 áno, B2 a B4 zvážiť.** B1, lebo obchodovanie na dátach
bez proveniencie je presne ten spôsob, akým sa dá €700 minúť na fikciu.

---

## Skupina C — governance hygiena

| # | P | Princíp | Dnes |
|---|---|---|---|
| C1 | P4 | Preregistered Gates | PARTIAL |
| C2 | P5 | Independence of Verification | PARTIAL |
| C3 | P6 | No Self-Expansion | DECLARATIVE |
| C4 | P7 | LIVE as Leased Capability | PARTIAL |
| C5 | P11 | Uncertainty Halts | PARTIAL |
| C6 | P14 | Versioned Amendment | PARTIAL |

**Odporúčanie: odložiť všetko okrem C4.** P7 (expirujúci lease) patrí k A1/A2 —
je to časový strop na to isté. Zvyšok sú princípy o tom, ako sa systém mení;
kým sa mení pod tvojím GO, nie sú na kritickej ceste k testu.

---

## Čo z toho vyplýva pre poradie

Ak schválíš celú skupinu A + C4, dostaneš sa z **0/14 na 5/14 ENFORCED** — a
to je stav, v ktorom má zmysel baviť sa o Micro-Live, lebo peniaze sú chránené
stropom, vypínačom a expiráciou.

Skupina B potom rozhoduje, či z toho testu vôbec niečo vyčítaš.

**Toto nie je odhad času.** Nemám odmerané, koľko ktorá položka zaberie, a
nebudem to hádať — to by bolo presne to číslo bez zdroja, na ktoré sme stavali
detektor. Po schválení dám odhad na prvú položku a po nej presnejší na zvyšok.

---

## Čo tento dokument neurobí

- **Nespúšťa Micro-Live.** Ani po dokončení skupiny A. LIVE má štyri podmienky
  a jedna z nich je tvoje explicitné schválenie s číslami, ktoré si zatiaľ
  zámerne nefixoval.
- **Nefixuje Micro-Live parametre.** Veľkosť pozície, max drawdown, počet
  obchodov — to je tvoje rozhodnutie, nie odvodenie.
- **Nemení safety envelope.** `LIVE_TRADING` ostáva `false`.
- **Nerieši broker/execution vrstvu.** Samostatná téma.

---

## Na schválenie

Odpovedz v tvare, ktorý ti vyhovuje — stačí zoznam kódov:

```
GO:    A1 A2 A3 A4 C4          (napríklad)
NIE:   B2 B4
NESKÔR: C1 C2 C3 C5 C6
```

Začnem prvou schválenou položkou a vrátim sa až s ňou hotovou, nie s
priebežnými otázkami.
