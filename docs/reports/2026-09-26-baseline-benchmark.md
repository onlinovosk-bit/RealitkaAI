# BASELINE-BENCHMARK-01 — koľko naozaj trvá jeden kus produkcie

> **Prečo tento dokument existuje.** PROMPT STACK COMPILER v1.0 a PROMPT STACK
> BUILD PROTOCOL v1.0 tvrdia, že zrýchlia build pri nezmenenej kvalite.
> Zrýchlenie je pomer. Kým neexistuje menovateľ, tvrdenie sa nedá overiť ani
> vyvrátiť. Tento dokument je menovateľ.
>
> Meria **skript, nie agent**. Agent, ktorý meria vlastnú prácu, je presne tá
> chyba, ktorá stála AP-025 — fixture som si napísal z toho, čo moje vlastné
> SQL potrebovalo, a „overenie" prešlo. Preto sú tu priložené zmrazené dátové
> sady a príkaz, ktorým ich ktokoľvek prepočíta.

- **dátum merania:** 2026-09-26
- **merané artefakty:** `docs/reports/assets/2026-09-26-baseline-benchmark/`
- **merací skript:** `scripts/ops/measure-prompt-stack.mjs`

---

## 0. Definície metrík — napísané PRED číslami

Zámerne v tomto poradí. Metrika dopísaná po tom, čo už poznáš číslo, je
vysvetlenie, nie meranie.

| metrika | definícia | zdroj |
|---|---|---|
| `stack_tokens` | odhad tokenov celého stacku; **dve nezávislé metódy** (chars/4, words×1.3) | `measure-prompt-stack.mjs` |
| `stack_layers` | počet vrstiev **spočítaný z textu** (`S0..Sn`), nie z prídavného mena | ditto |
| `serial_stages` | dĺžka očíslovaného zoznamu jednej iterácie v `RUNNER.md` | ditto |
| `qa_stages` | z toho stage-y, ktoré sú brána alebo kontrola | ditto |
| `task_wall_seconds` | `finished_at − started_at` jedného behu tasku | `.ai/bus/ledger/2026-09.jsonl` |
| `model_calls` | počet volaní modelu na jeden task | **nemerané, pozri §5** |
| `ci_seconds` | `updated_at − run_started_at` jedného behu `saas-grade-pipeline.yml` | GitHub Actions API |
| `pr_cycle_minutes` | `merged_at − created_at` jedného PR | GitHub PR API |

---

## 1. Vybraný STACK

**FAKT.** Najväčší súvislý promptový stack v repe je `docs/prompts/runner/`
— 14 súborov, 1 561 riadkov, 49 283 B. Druhý najväčší je
`docs/prompts/smolko-website-concierge/` (68 K vrátane nemarkdownových súborov).
Vybraný je RUNNER, pretože je to **orchestračný** stack — teda presne tá domain,
o ktorej Compiler hovorí (model calls, serial depth, vlny, brány).

```
$ node scripts/ops/measure-prompt-stack.mjs docs/prompts/runner
súbory 14 · riadky 1561 · bajty 49283
odhad tokenov: 11649 (chars/4) · 9104 (words*1.3)
vrstvy v texte: 8 (S0 S1 S2 S3 S4 S5 S6 S7)
  ! NESÚLAD 05-prompt-stack.md: "sedem hash" tvrdí 7, v texte je 8
sériové stage-y jednej iterácie: 15
z toho QA/brány: 7 (AUDIT, RECONCILE, WRITE-PROBE, WORKER VALIDATION, JUDGE, MERGE GATE (B7), RE-AUDIT)
časová instrumentácia: ÁNO (hľadaných polí: 10)
  11-ledger-memory.md: started_at x1
  11-ledger-memory.md: finished_at x1
```

**Štrukturálny baseline:**

| metrika | hodnota |
|---|---|
| `stack_tokens` (orchestrátor načíta 00–12 + RUNNER) | **11 649** / 9 104 |
| `stack_tokens` (worker zo súborov: S0 + S6/S7) | **1 707** / 1 336 |
| `stack_layers` | **8** |
| `serial_stages` | **15** |
| `qa_stages` | **7** (47 % stage-ov je kontrola) |

---

## 2. Runtime baseline — tri vrstvy, tri rády

Tu je celá odpoveď na otázku „prečo to trvá dlho".

| vrstva | median | n | podiel median PR cyklu |
|---|---|---|---|
| **beh agentného tasku** (ledger) | **88 s** = 1,5 min | 9 | **3,5 %** |
| **jeden beh CI** (úspešný) | **549 s** = 9,2 min | 19 | **22 %** |
| **PR created → merged** | **42 min** | 40 | 100 % |

Zvyšok — **~74 % median cyklu** — nie je ani model, ani CI. Je to čakanie:
review, GO brána, človek.

Rozptyl PR cyklu (n = 40, PR #668–#708):

```
min 6 min · p25 17 · MEDIAN 42 · p75 348 (5,8 h) · p90 618 (10,3 h) · max 1334 (22,2 h)
35 % PR sa zmerguje do 30 min     28 % PR trvá viac než 2 h
suma za okno: 120,4 h cyklového času na 40 PR
```

**PREDPOKLAD (označený ako taký).** p75 a p90 sú ťahané nocou a GO bránou, nie
výpočtom. Nemám per-PR záznam, kedy bola práca hotová a kedy prišlo GO —
preto to nedokážem rozdeliť presne. Pozri §5.

### 2.1 CI do detailu

```
okno 2026-09-25 11:00 → 2026-09-26 19:19 (32,3 h)
30 behov: 19 success · 8 failure · 3 cancelled
success:  median 549 s · p90 592 s
failure:  median 325 s   ← padá skôr, ale cyklus zaplatí celý
CI spotrebovala 3,6 h výpočtu = 11 % reálneho času okna
```

**FAKT, a toto je to najdrahšie číslo v dokumente: 8 z 30 behov (27 %) je
červených.** Každý červený beh neplatí len 325 s CI — platí ďalší agentný
cyklus, ďalší push a ďalších ~9 min CI.

Rozklad jedného behu (job `108469704435`, merané v tejto session):

```
npm ci + setup             ~3,5 min    ← najväčšia jednotlivá položka
next build                    84 s
playwright install chromium   30 s
tsc + eslint + smoke          ~65 s
supabase start + 118 migrácií  17 s    ← nie je to bottleneck, hoci sa to tak tvári
```

### 2.2 Agentné tasky do detailu

| task | agent | iter | wall s | verdikt |
|---|---|---|---|---|
| TASK-0100 | cursor-lane-a | 1 | 148 | ACCEPT |
| TASK-NS-001 | cursor-north-star | 1 | 35 | ACCEPT |
| TASK-NS-001 | cursor-north-star | 2 | 11 | ACCEPT |
| TASK-TC-BATCH-1 | tc-orchestrator | 1 | 98 | REJECT |
| TASK-TC-BATCH-1 | tc-orchestrator | 2 | 92 | REJECT |
| TASK-TC-BATCH-1 | tc-orchestrator | 3 | 97 | REJECT |
| TASK-TC-BATCH-1 | tc-orchestrator | 4 | 88 | **HUMAN** |
| TASK-EXTERNAL-OK | selftest | 1 | 0 | ACCEPT |
| TASK-EXTERNAL-FAIL | selftest | 1 | 0 | REJECT |

```
suma 569 s · median 88 s · max 148 s · 30 acceptance kontrol
model zaznamenaný     0 / 9
cost_usd nenulový     0 / 9
pr_url vyplnené       0 / 9
production_effect     0 / 9
```

**TASK-TC-BATCH-1 je celý baseline v jednom riadku:** 4 iterácie × ~94 s = 375 s
práce, ktorá skončila na `HUMAN`. Čas nezhorela latencia volania. Zhorelo ho
**opakovanie**.

---

## 3. Čo z toho vyplýva pre Compiler

**FAKT.** Compiler optimalizuje počet model callov, počet agentov a veľkosť
kontextu. To sú tie **3,5 %**. Ak by Compiler odstránil *všetky* agentné behy
do nuly, median cyklus spadne zo 42 min na ~40,5 min.

**FAKT.** Tri zmeny, ktoré sa dotýkajú zmeraných 96,5 %, a ani jedna nie je
v Compileri:

| zmena | zasiahne | odhadovaný efekt |
|---|---|---|
| cache `npm ci` v `saas-grade-pipeline.yml` | ~3,5 min z 9,2 min CI | **až −38 % CI** (horná hranica: ak cache `npm ci` eliminuje úplne) |
| preskočiť `next build` + `playwright install` pri diffe bez `.ts/.tsx` | 114 s | −20 % CI na docs PR |
| znížiť 27 % červených behov (lokálna brána pred pushom) | celý ďalší cyklus | **najväčší jednotlivý zdroj** |

**PREDPOKLAD.** Percentá v tabuľke sú aritmetika nad zmeranými zložkami, nie
zmeraný výsledok zmeny. Overí sa až po nasadení, na tých istých metrikách.

---

## 4. Nálezy v existujúcom STACKU (vedľajší produkt merania)

| # | nález | dôkaz | verdikt |
|---|---|---|---|
| N1 | `05-prompt-stack.md` hovorí o **siedmich** vrstvách a **siedmich hashoch**, ale definuje a hashuje **osem** (S0–S7). To isté tvrdenie nesie `06-dispatch.md`. | skript, mechanicky | **FLAG** — off-by-one v kontrakte, ktorý má byť dôkazný |
| N2 | `RUN SUMMARY` (12-loop) má povinnú sekciu `NEZMERANÉ`, ale **žiadne časové pole**. Founderova otázka „prečo to trvá dlho" je z tohto artefaktu nezodpovedateľná. | 12-loop.md | **FLAG** |
| N3 | Ledger schéma má `started_at`/`finished_at` (dobre), ale **nemá `model_calls` ani `tokens_in/out`**. Preto `model_calls` v §0 zostáva nemerané. | 11-ledger-memory.md | **FLAG** |
| N4 | `model: null` a `cost_usd: 0` v **9 z 9** reálnych záznamov — presne tá chyba, ktorú `09-judge.md` sám pomenoval: *„Buď to meria, alebo tam to číslo nie je."* Vlastné pravidlo nie je vynútené. | ledger | **STOP pre rozpočtové brány** — brána nad nemeranou hodnotou nezasiahne nikdy |
| N5 | Stack už obsahuje to, čo Compiler predstavuje ako nové: 8 vrstiev s hashmi, `DETERMINISTICKÉ/INTELIGENTNÉ` delenie, write-probe disjunktnosť, rozpočty, Judge, `REPEATABLE/ONE-SHOT`. | 04, 05, 06, 09, RUNNER | **FLAG** — Compiler je bez tohto porovnania regresia proti domácemu štandardu |

---

## 5. NEZMERANÉ (povinná sekcia — pravidlo `12-loop.md`)

| čo | prečo |
|---|---|
| `model_calls` na task | ledger to pole nemá; N3 |
| tokeny skutočne odoslané do modelu | nikde sa nezaznamenávajú; odhad chars/4 je **odhad stacku**, nie spotreby |
| `cost_usd` | 0 v 9/9; nemeralo sa |
| rozdelenie „review vs. GO brána vs. noc" v p75/p90 PR cyklu | chýba per-PR značka „práca hotová" |
| wall-clock reálneho behu RUNNER stacku end-to-end | žiadny RUN SUMMARY s časom neexistuje; N2 |
| kvalita (defect rate) starého vs. compiled buildu | bez druhého behu niet čo porovnať |
| štatistická sila | n = 9 ledger, n = 30 CI, n = 40 PR. Median je indikatívny, nie interval spoľahlivosti. |

---

## 6. Brána pre tvrdenie „compiled je rýchlejší pri rovnakej kvalite"

Tvrdenie sa prijme **iba** ak platí všetkých päť. Inak je to v0.1 draft.

```
1. rovnaký skript      node scripts/ops/measure-prompt-stack.mjs <compiled>
                       proti zmrazenej sade v assets/ — nie nové čísla proti spomienke
2. rovnaká úloha       compiled stack rieši jeden konkrétny uzol, ktorý old stack
                       už riešil, na tom istom BASE_SHA
3. čas sa meria tam,   pr_cycle_minutes a ci_seconds, nie počet model callov.
   kde je              Zlepšenie model callov pri nezmenenom pr_cycle = nula.
4. kvalita sa meria    počet červených CI behov a počet REJECT verdiktov na
   protichodne         rovnaký rozsah práce. Rýchlejšie s viac červenými = horšie.
5. acceptance overí    kontrolu, ktorú nenapísal vykonávajúci agent
   niekto iný          (STOP 2 z auditu Compilera, §16 Early Exit)
```

---

## 7. Odporúčanie

**STOP na „Production Standard".** Compiler a Build Protocol optimalizujú
zmeraných 3,5 %. Prečísliť na **v0.1 DRAFT** a doplniť tri STOP opravy z auditu.

**BUILD na CI.** Cache `npm ci`, fastpath pre diffy bez `.ts/.tsx`, lokálna
brána pred pushom. Dotýka sa zmeraných 22 % a 27 % červených behov.

**BUILD, lacné:** doplniť `model_calls` a `tokens_in/out` do ledger schémy
a čas do `RUN SUMMARY`. Bez toho bude každý ďalší benchmark opäť odhad.
