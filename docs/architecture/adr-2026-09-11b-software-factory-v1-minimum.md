# ADR-2026-09-11b · Autonomous Software Factory — čo z toho postaviť tento týždeň

**Stav:** NÁVRH · rozhoduje founder
**Vstup:** „REVOLIS AUTONOMOUS SOFTWARE FACTORY V1" (výstup inej AI, 11. 9.)
**Nadväzuje na:** `adr-2026-09-11-coding-loop-poradie.md`
**Autorita:** návrh je podklad, nie GO.

---

## 1. Čo sa oproti predchádzajúcej verzii naozaj zlepšilo

**Task Contract.** Najlepšia myšlienka oboch dokumentov. Je to presne tá chýbajúca
brána `TASK ACCEPTANCE`, ktorú som označil ako neexistujúcu. A dá sa postaviť
bez jediného volania modelu.

**Independent Judge.** Správna diagnóza reálneho zlyhania. Máme naň dôkaz:
BUS-004, kde agent uviedol `expectedFileHash` `062b1a3…`, ktorý nezodpovedal ani
git blobu (`e78099c…`), ani raw SHA-1 (`08d95c28…`). Hodnota bola vymyslená.
Coder si sám schválil vlastnú chybu — presne to, čo Judge má chytiť.

**Outer loop / replan.** Áno. „Tridsať iterácií opravuje symptóm zlej architektúry"
je reálny režim zlyhania, nie teória.

**Human Gate podľa rizika.** Správne, a mapuje sa to jedna k jednej na tvoje
existujúce pravidlá (prod DELETE, externé odoslanie, nový scope → človek).

---

## 2. Čo sa zhoršilo — a je to tá istá chyba, pred ktorou varoval predchádzajúci návrh

Predchádzajúci návrh mal vetu:

> „Neurobil by som chybu, že najprv postavíme *plný orchestrátor* a až potom coding loop."

Nové poradie implementácie:

```
1. Task Contract
2. Orchestrator state machine
3. Dynamic Stack Engine
4. MCP tool layer
5. Model Gateway
6. Cost Governor V1
7. Inner coding/test loop      ← prvý krok, ktorý napíše riadok produktového kódu
```

**Šesť infraštruktúrnych vrstiev pred prvým riadkom kódu.** To *je* plný
orchestrátor najprv. Nový dokument spravil presne to, pred čím starý varoval.

### Tri konkrétne inverzie

**a) Execution Ledger spadol z „jedna vec navyše" na #9 z 12.**

To je opačne, než potrebuje jeho vlastná logika. Pozri, čo Ledger napája:

```
#5  Model Gateway        ─┐
#6  Cost Governor V1     ─┼─→ všetky tri potrebujú success_rate(model, task_type)
#10 Adaptive Router      ─┘    a cost(model, task_type)
```

Tie čísla vyrába **iba** Ledger (#9). Čiže kroky 5, 6 a 10 by sa stavali na
**odhadovaných** hodnotách a Ledger by prišiel potvrdiť, že odhad bol zlý.

Dokument si to dokonca sám pomenoval — argument pre Ledger znie, že neskôr
nebudeme hovoriť „myslíme si, že Fable je lepší", ale „Fable dokončí 92 % taskov
za $0.84". Presne tak. **A tú vetu nemôžeš povedať skôr, ako Ledger mesiac beží.**
Preto musí byť prvý alebo druhý, nie deviaty.

**b) Cost Governor ako optimalizátor `Quality × P(success) / Cost / Time`.**

Vzorec je správny. Vstupy neexistujú. `P(success) = 82 %` pre Sol a `94 %` pre
Fable sú v tom dokumente **ilustračné čísla** — a keď sa zabudujú do Governora V1,
stanú sa z nich produkčné konštanty, ktoré nikto nikdy neprepočíta. To je AP-005
zabudované do infraštruktúry.

Cost Governor V1 má byť **hlúpy limiter** — presne tak, ako to mal predchádzajúci
návrh (`max_iterations`, `max_cost`, `max_time`, `allowlist`). Inteligentný sa
stane, keď má dáta. Tu nastal regres.

**c) Agent Pool so siedmimi rolami v V1.**

Predchádzajúci návrh mal správne: „V1 nemá byť multi-agent chaos." Nová schéma má
v V1 Planner, Coder, Tester, Debugger, Reviewer, Security, Architect. Sedem rolí,
kým jedna ešte nebeží spoľahlivo.

---

## 3. Jedna technická oprava, ktorá rozhoduje o tom, či Judge funguje

**Judge nesmie byť LLM, ktorý dostane otázku „spĺňa to Task Contract?"**

Ak je Judge model, má presne ten istý režim zlyhania ako Coder — vie tvrdiť vec,
ktorú neoveril. BUS-004 nebol zlyhaním usudzovania, ale zlyhaním overovania:
agent uviedol hash, ktorý nikdy nespočítal. Druhý model, ktorý sa pozrie a povie
„vyzerá dobre", to nechytí.

Judge má byť **spúšťač deterministických kontrol**:

```
pre každý riadok acceptance v Task Contracte:
    spusti príkaz
    porovnaj výstup s očakávaním
    zapíš príkaz, výstup aj verdikt do Ledgeru
```

Verdikt `ACCEPT` smie vzniknúť iba z príkazov, ktoré naozaj bežali. Model smie
vstúpiť až tam, kde sa deterministicky overiť nedá — a vtedy jeho verdikt nesie
značku `NEOVEROVANÉ MODELOM`, nie `ACCEPT`.

Je to tá istá veta, ktorú si 4. 9. commitol do OrgOS: **hodnota v auditnom
artefakte musí pochádzať z príkazu.** Judge je iba jej strojová podoba.

---

## 4. Odpoveď na tvoju otázku: samostatný projekt, alebo prvý workload BUS-u?

**BUS. Jednoznačne.** Nemá zmysel stavať druhú zbernicu vedľa tej, ktorá už tri
týždne beží (`.ai/bus/` má správy od 20. 8., PR #543 ju 6. 9. povýšil na v1.0).

**Ale pilotný workload nemá byť coding loop.**

BUS má za sebou štyri reálne úlohy a jedna z nich (BUS-004) vyrobila vymyslený
hash. Systém, ktorého prvé štyri úlohy priniesli jednu fabrikáciu, ešte nie je
pripravený niesť autonómnu továreň. Najprv nech unesie niečo, čo nemôže nič
pokaziť.

Správny pilot: **Task Contract validator a Execution Ledger samotné.** Sú to
úlohy pre BUS, overia MCP vrstvu, overia gate — a ich najhorší možný výsledok je
zlý report, nie zlý commit.

---

## 5. Kľúčové zistenie: Task Contract nie je greenfield

Toto mení odhad práce. `.ai/bus/tasks/TASK-0008.md` na `origin/main` vyzerá takto:

```yaml
id: TASK-0008
type: task
status: done
owner: cursor-onl-mcp-004
scope:
  repo_paths: [...]
  external_systems: [...]
evidence:
  commands:
    - npx tsx packages/mcp-onlinovo/src/client-smoke.ts
  files: [.mcp.json]
next_action:
  gate: STOP
```

Máš už `id`, `scope`, `evidence.commands`, `next_action.gate` — a po hardeningu
z 8. 9. aj `expectedFileHash` + `hashMethod`. Chýbajú **dva bloky**:

```yaml
acceptance:                      # ← nové: strojovo overiteľné tvrdenia
  - cmd: npm run typecheck
    expect: exit_code == 0
  - cmd: npm test -- matching
    expect: exit_code == 0
  - cmd: git diff --name-only origin/main...HEAD
    expect: all_paths_in(scope.repo_paths)

budget:                          # ← nové
  max_iterations: 8
  max_cost_usd: 3
  max_runtime_minutes: 30
```

To nie je projekt. To je rozšírenie schémy, ktorá tri týždne funguje.

---

## 6. Protinávrh: V1 MINIMUM — štyri komponenty, ani jeden nie je AI

```
        TASK CONTRACT  ──────────────┐
        (.ai/bus/tasks/*.yml)        │
                                     ▼
        CLINE / CURSOR  ────────→  JUDGE
        (coder, už ho máš)        (spúšťač deterministických kontrol)
                                     │
                          ┌──────────┼──────────┐
                          ▼          ▼          ▼
                       ACCEPT     REJECT     HUMAN
                          │
                          ▼
                   EXECUTION LEDGER
                   (rozšírenie .ai/bus/)
                          │
                          ▼
                   dáta pre Cost Governor  ← o mesiac, z reality
```

| komponent | AI? | práca | čo rieši |
|---|---|---|---|
| Task Contract (`acceptance` + `budget`) | nie | hodiny | chýbajúcu bránu TASK ACCEPTANCE |
| Judge = gate runner | nie | 1–2 dni | „agent si sám schváli chybu" |
| Execution Ledger nad `.ai/bus/` | nie | 1 deň | dáta pre Cost Governor a Router |
| Cost Governor = tvrdé limity | nie | hodiny | rozpočet, denný aj mesačný strop |

**Ani jeden z týchto štyroch komponentov nie je AI.** Sú to deterministické,
lacné a testovateľné veci. Coder je zatiaľ Cline, ktorého už máš a už beží.

Čo tým získaš okamžite: každá úloha má strojovo overiteľnú definíciu hotového,
nikto si sám neschváli svoju prácu, a od prvého dňa sa zbierajú dáta, bez ktorých
je Model Router len dohad.

Čo tým nestratíš: **žiadnu vrstvu z cieľovej architektúry.** Judge je `#8`.
Ledger je `#9`. Task Contract je `#1`. Cost Governor je `#6`. Stack Engine, MCP
transport, Agent Pool a Adaptive Router sa dopĺňajú neskôr bez prerábky — presne
podľa princípu „build around the future architecture now", ktorý je v oboch
návrhoch správny.

Rozdiel je len v tom, že staviaš **deterministickú kostru najprv a inteligenciu
potom**, nie naopak.

---

## 7. Rozhodnutia

| # | otázka | moje odporúčanie |
|---|---|---|
| 1 | 12-krokové poradie, alebo V1 Minimum (4 komponenty)? | **V1 Minimum** |
| 2 | Execution Ledger na #9, alebo hneď? | **hneď** — bez neho sú #5, #6, #10 dohady |
| 3 | Cost Governor V1: optimalizátor, alebo limiter? | **limiter** + denný a mesačný strop |
| 4 | Judge: model, alebo spúšťač kontrol? | **spúšťač kontrol**; model len tam, kde sa nedá overiť |
| 5 | Vlastný coder, alebo zatiaľ Cline? | **Cline**, kým Ledger nepovie, že sa vlastný oplatí |
| 6 | Samostatný projekt, alebo workload BUS-u? | **BUS** — ale pilot je Contract + Ledger, nie coding loop |
| 7 | Agent Pool (7 rolí) v V1? | **nie**, až po prvej spoľahlivej slučke |

Cieľ aj architektúru beriem celé. Sporné je iba to, či sa inteligentné vrstvy
stavajú pred meraním, alebo po ňom.
