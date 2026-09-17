# 12 — LOOP · re-audit a ukončenie

---

## Po každej integrácii sa mapa prekresľuje

```
NEPOUŽÍVAJ starý plán slepo.
AUDIT -> RECONCILE -> DAG -> PARTITION -> WRITE-PROBE -> STACK -> VLNA
```

Predchádzajúca vlna mohla zmeniť graf závislostí. Nie hypoteticky: 16. 9. 2026 sa
`judge.mjs` počas behu dostal do `main` mimo deklarovaného rozsahu a plán, ktorý
ho považoval za budúcu úlohu, prestal platiť v priebehu hodiny.

Re-audit je lacný — je read-only, nespúšťa `npm ci` ani testy. Beží v minútach.
Vlna, ktorá sa spustí podľa mapy starej tri hodiny, môže stáť celý beh.

**Toto je jediný rozdiel medzi Runnerom a zoznamom úloh.** Zoznam sa odpracuje.
Runner po každej zmene znovu zistí, čo je pravda.

---

## Rozhodnutie na konci iterácie

```
queue_empty              -> FINAL AUDIT, FINAL VALIDATION, LEDGER, EXIT
iba blocked uzly         -> BLOCKER REPORT, EXIT WITH BLOCKED STATE
existuje READY práca     -> ďalšia iterácia
inak                     -> RECONCILE, REBUILD DAG, REPLAN
```

`EXIT WITH BLOCKED STATE` **nie je zlyhanie.** Je to výsledok: viem, čo bráni
pokračovaniu, a viem prečo. Horší výsledok je beh, ktorý pokračuje s odhadom.

---

## Stop podmienky

```
queue_empty                  front prázdny
max_open_prs                 3
budget                       iba ak sa naozaj meria (09, 11)
deadline                     tvrdý, s UTC offsetom
two_consecutive_failures     dve vlny po sebe non-ACCEPT
judge_blocked                brána sa nedala vykonať
merge_conflict               návrh má dieru
write_probe_failed           územia sa krížia
scope_violation_at_merge     B7 padla
audit_incomplete             chýba niektorý audit súbor
governance_violation         porušenie 00-system
missing_required_tool        chýba Judge, baseline, runtime
human_checkpoint             čaká sa na podpis
```

```
Runner NIKDY nebeží nekonečne. Bez vyplneného deadline_at sa nespúšťa.
```

`audit_incomplete` je tam zámerne: register z troch zo štyroch zdrojov by
vyzeral úplne a nebol by. **Chýbajúca kontrola je zlyhanie, nie preskočenie.**

---

## RUN SUMMARY

Po každom ukončení, bez výnimky:

```markdown
# RUN SUMMARY — <run_id>

režim: AUDIT | EXECUTION        ukončené: <stop_condition>
vlny: <n>                       PR: <zoznam>

## DONE
| uzol | územie | verdikt | PR |

## FAILED
| uzol | brána | dôvod | nápravný uzol |

## BLOCKED
| uzol | blokuje ho | čo to odomkne |

## DEFERRED
| uzol | prečo odložené |

## NEZMERANÉ
| čo | prečo |

## ĎALŠIE KROKY
| priorita | akcia | kto |
```

Sekcia **NEZMERANÉ** je povinná a nesmie sa vynechať ani prázdna. Prázdna je
tvrdenie, že sa zmeralo všetko — a to má byť vidieť.

V **ĎALŠIE KROKY** patrí stĺpec „kto". Krok bez vlastníka sa neurobí.

---

## North-star kontrola na záver behu

Pred zapísaním summary odpovedz na jednu otázku:

> **Je Revolis po tejto iterácii lepší než pred ňou?**

Merateľne v šiestich oblastiach: správnosť, spoľahlivosť, udržateľnosť,
dôveryhodnosť brán, organizačná pamäť, schopnosť dodať.

```
Ak vlna nezlepšila ani jednu, zapíš to. Nehľadaj formuláciu, ktorá to zakryje.
```

Kontrolné číslo: za tridsať dní bolo zmergovaných **88 PR** a v produkcii
pribudli **3 aktivity, 0 párovaní, 0 intentov**. Beh, ktorý pridá deväťdesiaty PR
a nezmení ani jedno z tých čísel, je pohyb, nie pokrok — a summary to má
povedať rovno.
