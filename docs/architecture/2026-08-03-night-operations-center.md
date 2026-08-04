# Night Operations Center — cieľová architektúra a cesta k nej

**Cieľová cesta:** `docs/architecture/2026-08-03-night-operations-center.md`
**Dátum:** 3. augusta 2026 · **Kategória:** Strategic Bet (klasifikácia v2)
**Stav:** návrh na rozhodnutie foundera

---

## 0. Oprava, ktorá mení záver

V tvojom zhrnutí sú tri automatizácie označené ako „Claudeov návrh" a hodnotené
9/10: synchronizácia dát z portálov · marketing pipeline · security & maintenance.

**Tie sú od druhej AI, nie odo mňa.** Moje tri boli: nočný audit `main` ·
strážca vetiev · ranný prevádzkový brief.

Nejde o zásluhy. Ide o to, že **ak postavíš „Vrstvu 1 = Claudeov návrh",
postavíš tri zakázané akcie:**

| Návrh | Čo to je |
|---|---|
| „stiahne dáta z externých portálov" | portal scraping — ZAKÁZANÉ AKCIE + nehnutelnosti.sk čl. VIII/8 + TOPREALITY čl. 5.9 |
| „prípadne spustí deployment pending zmien" | automatický deploy — pravidlo č. 1 |
| „vyčistí nepotvrdené/unapproved záznamy" | prod DELETE bez ľudského potvrdenia |

Moje hodnotenie tých troch nie je 9/10. **Je 3/10** — myšlienka je správna,
prevedenie porušuje tri neprerokovateľné pravidlá a jedna tretina argumentácie
stojí na názvoch tvojich starých chatov, ktoré tá AI prečítala ako funkcie systému.

---

## 1. Kde máš pravdu — a je to dôležitejšie než tá oprava

**Orchestrátor namiesto jednej veľkej automatizácie je správna architektúra.**
Nezávislé uzly, vlastné logy, vlastné retry, vlastné metriky, orchestrátor len
spúšťa v poradí a zbiera výsledky. To je presne tak, ako by som to staval aj ja.

**Štvorvrstvová pyramída je správna mapa.** Prevádzka → kvalita produktu →
biznis → evolúcia AI. Nič z toho by som nemenil.

**Vrstva 4 je najlepšia myšlienka z celej debaty** a nenavrhla ju ani druhá AI,
ani ja.

---

## 2. Kde sa rozchádzame — poradie, nie obsah

> **Orchestrátor sa nestavia prvý. Vznikne, keď ho začneš potrebovať.**

Postaviť orchestrátor pre tri uzly znamená postaviť dispečera pre frontu troch
úloh. Réžia prevýši úžitok a budeš ladiť orchestrátor namiesto uzlov.

**A tu je to, čo si možno neuvedomil: Night Operations Center už máš.**

```
02:00–03:00  Night Operations Center v0
├── Nočný audit main        ← uzol vrstvy 2 (kvalita produktu)
├── Strážca vetiev          ← uzol vrstvy 2
└── Ranný brief             ← ORCHESTRÁTOROVA REPORTOVACIA VRSTVA
                              (číta výstupy predchádzajúcich a agreguje)
```

Ranný brief **nie je štvrtá automatizácia. Je to `Morning Executive Report`
z tvojho vlastného diagramu** — len bez orchestrátora, lebo pri troch uzloch
ho netreba. Keď ich bude šesť, ten istý brief sa stane orchestrátorovým reportom
a orchestrátor sa doplní pod neho. **Pridanie uzla bude konfigurácia, nie projekt.**

---

## 3. Tvoj rebríček priorít proti realite repa

| # | Tvoj návrh | Skutočný stav |
|---|---|---|
| 🥇 | Data Synchronizer | **Buď zakázaný, alebo hotový.** Portály = scraping. Realvia = `apps/realvia-ingestion` už existuje. |
| 🥈 | Architecture Guardian | **Z 2/3 postavený** — patche 06 a 07 (mŕtve exporty + zmluva API routes) + `schema-governance-guard.yml`. Chýba len nočný beh nad `main` = moja automatizácia A1. |
| 🥉 | Security & Operations Guardian | Read-only časť áno. Deployment a cleanup **nie** — to sú zakázané akcie. |
| 4 | Marketing Factory | Potrebuje inzeráty. Inzeráty potrebujú zákazníkov. Máš jedného. |
| 5 | Profit Leak Hunter | **Jediný, ktorý je nový, legálny aj hodnotný.** Ale potrebuje 30 dní dát z A3. |

**Tri z piatich sú hotové alebo zakázané. Zostávajú dva a jeden z nich je blokovaný.**

---

## 4. Cieľová architektúra — s bránami

Každý uzol má **vstupnú bránu**. Bez nej sa nepridáva. To je tvoja vlastná
kultúra z `COMPANY.md`, len aplikovaná na automatizácie.

### Vrstva 1 · Prevádzka
| Uzol | Brána | Stav |
|---|---|---|
| Realvia synchronizátor | ≥2 zákazníci používajúci Realviu | `apps/realvia-ingestion` existuje, nočný beh nie |
| ~~Portálový synchronizátor~~ | **nikdy** — zakázaná akcia | ⛔ |
| Marketing Factory | ≥20 inzerátov mesačne cez Revolis | ⛔ blokované objemom |

### Vrstva 2 · Kvalita produktu
| Uzol | Brána | Stav |
|---|---|---|
| **Architecture Guardian** | žiadna | ✅ **A1 — zapni dnes** |
| **Strážca vetiev** | žiadna | ✅ **A2 — zapni dnes** |
| Test Healer | 3 mesiace zelenej A1 | ⏳ fáza 3 podľa `revolis-loops.mdc` |
| Performance Watchdog | prvá sťažnosť na rýchlosť | ⏳ zatiaľ neexistuje dôvod |
| Documentation Sync | >1 vývojár | ⏳ si jeden |

### Vrstva 3 · Biznis
| Uzol | Brána | Stav |
|---|---|---|
| **Ranný brief** | žiadna | ✅ **A3 — zapni dnes** |
| Profit Leak Hunter | 30 dní dát z A3 | ⏳ **~2. septembra** |
| KPI Analyzer · Churn · Revenue Forecast | 3 platiaci zákazníci | ⏳ brána z `COMPANY.md` |

### Vrstva 4 · Evolúcia AI
| Uzol | Brána | Stav |
|---|---|---|
| Skill Factory Builder | 6 bežiacich uzlov **a** 3 platiaci | ⏳ |

> **Vrstva 4 smie navrhovať, nikdy stavať.** Agent, ktorý sám vyhodnotí,
> že potrebuje nový skill, sám ho napíše a sám nasadí, je presne to, pred čím
> varuje Kontrolór pravidlo. Výstup vrstvy 4 je **jedna strana na tvoj stôl**,
> nie commit.

---

## 5. Kedy vzniká orchestrátor

**Spúšťač: piaty uzol.**

Pri troch uzloch čítaš tri reporty. Pri piatich prestaneš. Vtedy — a nie skôr —
sa postaví orchestrátor, ktorý ich spúšťa v poradí, zbiera výsledky a vyrobí
jeden report. Ranný brief sa stane jeho výstupom.

Do vtedy platí, že **každý uzol musí obstáť sám.** Uzol, ktorý dáva zmysel len
ako súčasť orchestrátora, nie je uzol — je to funkcia a patrí do iného uzla.

---

## 6. Čo by som spravil dnes večer

Ak by som mal jeden večer — a ty ho máš, lebo zajtra o 8:45 je GARANT REAL:

1. **Naklikaj tri automatizácie** podľa `docs/automations/2026-08-03-setup-karta.md`.
   To je celá vrstva 2 plus reportovacia vrstva. **Hotovo za 20 minút.**
2. **Nič viac.** Vrstva 1 je zakázaná alebo blokovaná objemom, vrstva 3 čaká
   na dáta, vrstva 4 na zákazníkov.
3. **Choď spať.** Zajtra je demo.

**Termín revízie: piatok 8. augusta.** Ak si tie reporty päť rán po sebe otvoril
skôr, než si začal robiť, architektúra funguje a môže rásť. Ak nie, nemá zmysel
pridávať šiesty uzol k trom, ktoré nečítaš.

---

## 7. Kontrolór

Night Operations Center v plnom rozsahu je **L99 komponent**. `COMPANY.md` ho má
za bránou **troch platiacich zákazníkov**. Máš jedného a druhého dohodnutého ústne.

Zároveň je to *Strategic Bet* podľa klasifikácie v2 — čo znamená timebox ~3 dni,
kill kritériá zapísané **pred** prvým commitom, a na konci promote / re-bet / kill.

Rozhodnutie je tvoje a je legitímne aj to stavať. **Napriek tomu, ak je to
strategické rozhodnutie zakladateľa, navrhujem tento spôsob realizácie:**
postav tri uzly dnes, zapíš do `memory/decisions.md` bránu „piaty uzol =
orchestrátor" a kill kritérium „ak po 5 dňoch nečítam reporty, celé to vypínam",
a vráť sa k tomu 8. augusta s dátami namiesto dojmu.

A jedno číslo, ktoré nezmení žiadna vrstva tej pyramídy: **zo štyridsiatich
oslovených firiem odpovedala jedna.** Night Operations Center vylepší produkt,
ktorý zatiaľ nemá komu predávať.
