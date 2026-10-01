# REVOLIS RUNNER — master execution contract v1.0

**Continuous Completion Loop.** Audit → DAG → vlny → exekúcia → integrácia →
Judge → ledger → **re-audit** → ďalšia vlna.

Tento súbor je autoritatívny. Vrstvy nižšie sa načítavajú **v tomto poradí**
a v prípade rozporu platí **nižšie číslo**.

```
00-system.md            ústava, absolútne pravidlá
01-project-context.md   čo overiť, než sa čokoľvek urobí
02-audit.md             inventár nedokončenej práce
03-dag.md               graf závislostí
04-wave-partition.md    neskrížené vlny + write-probe
05-prompt-stack.md      sedem vrstiev promptu workera
06-dispatch.md          deterministické vs. inteligentné, Ruflo
07-worker-contract.md   čo smie a musí worker
08-validation.md        acceptance a negatívne prípady
09-judge.md             ACCEPT / REJECT / BLOCKED / HUMAN
10-integration.md       merge, konflikt, brána pri merge
11-ledger-memory.md     záznam, poctivosť metrík
12-loop.md              re-audit, stop podmienky, run summary
```

---

## Deliaca čiara, ktorá drží celý návrh

```
DETERMINISTICKÉ  → skript   worktrees, čakanie, integrácia, merge, PR, zámky
INTELIGENTNÉ     → agent    „oprav toto v tomto jednom súbore"
```

**Runner nie je model, ktorý predstiera orchestráciu.** Runner je skript
(`apps/crm/scripts/tc-orchestrator.mjs` a jeho rozšírenia), ktorý volá agentov
na tie kroky, ktoré sa nedajú overiť príkazom.

Toto je najdôležitejšia veta v celom kontrakte. Jedna agentná session **nevie**
spustiť troch workerov. Vie otvoriť tri terminály, ale nie tri agentné kontexty,
ktoré samy premýšľajú nad kódom. Ak sa v ktoromkoľvek kroku zdá, že agent má
orchestrovať, krok je zle napísaný.

---

## Dva režimy

```
AUDIT MODE        default. Číta, meria, zapisuje výhradne do audit/.
                  Nevytvára vetvy, necommituje, nepushuje.
EXECUTION MODE    až po písomnom GO foundera nad hotovým registrom
                  a nad navrhnutou vlnou 1.
```

**Runner štartuje vždy v AUDIT MODE.** Prechod do EXECUTION MODE nie je
rozhodnutie Runnera.

---

## Jedna iterácia

```
 1. PREFLIGHT            01   chýbajúca kritická závislosť -> BLOCK, nesimuluj
 2. AUDIT                02   inventár, klasifikácia, dôkaz ku každému nálezu
 3. RECONCILE            02   skutočný stav repa má prioritu pred dokumentáciou
 4. DAG                  03   write territory, read/write závislosti, riziko
 5. PARTITION            04   vlny bez prieniku write-setov
 6. WRITE-PROBE          04   overenie disjunktnosti tesne pred behom
 7. PROMPT STACK         05   sedem vrstiev, hashe do kontraktu
 8. DISPATCH             06   len aktuálna vlna, nikdy budúce
 9. PARALLEL EXECUTION   07   jeden worker = jedno územie
10. WORKER VALIDATION    08   územie, testy, typecheck, zákazané spôsoby
11. COLLECT + INTEGRATE  10   neúspešný worker sa izoluje, vlna nepadá celá
12. JUDGE                09   ACCEPT / REJECT / BLOCKED / HUMAN
13. MERGE GATE (B7)      10   rozsah PR proti kontraktu, v CI, po poslednom commite
14. LEDGER               11   beh, verdikt, čo sa nemeralo
15. RE-AUDIT             12   graf sa mohol zmeniť; starý plán sa nepoužíva slepo
```

Krok **13 je odpoveďou na PR #560**, kde brána overila rozsah pri verdikte,
potom pribudol commit z riešenia konfliktu a zmergovalo sa o tri súbory viac,
než popis PR tvrdil.

Krok **15 je dôvod, prečo je to slučka a nie zoznam.** Po každej integrácii sa
mapa prekresľuje.

---

## Idempotencia — presne, nie ako heslo

Tvrdenie „každá iterácia je idempotentná" je nepravdivé a nebezpečné.
Každý krok má deklarovaný jeden z dvoch režimov:

```
REPEATABLE   opakovanie je bezpečné a dá rovnaký výsledok
ONE-SHOT     opakovanie je chyba; krok ho musí tvrdo odmietnuť
```

```
preflight, audit, dag, partition, write-probe, judge   REPEATABLE
plan, collect, finish, ledger append                   ONE-SHOT
```

`collect` spustený druhýkrát ticho postaví menšiu dávku. Preto musí skončiť
`STOP`, nie prejsť. Krok bez deklarovaného režimu sa nespúšťa.

---

## North-star

Cieľom nie je počet vykonaných taskov. Cieľom je odpoveď na otázku:
**je Revolis po tejto iterácii lepší než pred ňou?**

Merateľne: správnosť, spoľahlivosť, udržateľnosť, dôveryhodnosť brán,
organizačná pamäť, schopnosť dodať.

Kontrolné číslo, ktoré to drží pri zemi: za tridsať dní bolo zmergovaných
**88 PR** a v produkcii pribudli **3 aktivity, 0 párovaní, 0 intentov**.
Task, ktorý neprispieva ani k jednej z tých šiestich oblastí, nie je práca —
je to pohyb.

---

## Štart

```
1. načítaj 00 až 12 v uvedenom poradí
2. AUDIT MODE
3. PREFLIGHT
4. AUDIT a RECONCILE
5. DAG, PARTITION, návrh vlny 1
6. STOP a odovzdaj RUN SUMMARY

Neimplementuj. Nevytváraj vetvy. Necommituj. Nepushuj. Nemerguj.
```

Runner pokračuje do EXECUTION MODE výlučne po písomnom GO foundera.
