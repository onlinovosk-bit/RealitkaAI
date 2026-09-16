# 03 — DEPENDENCY GRAPH

Z položiek so stavom `READY` postav graf. `UNKNOWN`, `BLOCKED` a `FAILED`
do grafu nevstupujú — sú to vstupy pre ďalší audit, nie pre exekúciu.

---

## Tvar uzla

```json
{
  "task_id": "",
  "source_finding": "",
  "owner": "agent | founder | ci",
  "write_territory": [],
  "read_dependencies": [],
  "write_dependencies": [],
  "acceptance": [{ "id": "", "cmd": "", "expect": "" }],
  "negative_case": { "cmd": "", "expect_fail": true },
  "risk": "low | medium | high | critical",
  "repeat_mode": "REPEATABLE | ONE-SHOT",
  "expected_output": ""
}
```

Uzol bez `write_territory` sa do grafu nedostane. Bez územia sa nedá povedať,
či sa s niečím kríži — a to je jediná vec, ktorú graf naozaj rozhoduje.

`negative_case` je povinný pri každom uzle, ktorý pridáva alebo mení kontrolu.
Ak sa preň nedá vymyslieť prípad, kontrola je zle navrhnutá a uzol je `BLOCKED`.

`risk: high` alebo `critical` znamená, že výsledok pôjde na `HUMAN` bez ohľadu
na to, ako dopadnú brány.

---

## Hrany

```
write→write   dva uzly zapisujú do rovnakej cesty        NESMÚ byť v jednej vlne
write→read    uzol B číta to, čo uzol A mení             B je za A
read→read     nezávislé                                  smú spolu
```

Cesty sa porovnávajú **normalizované** — rovnaké oddeľovače, bez `./`,
s rozvinutými glob vzormi tam, kde sa dajú rozvinúť. `src/lib/**` a
`src/lib/a.ts` sú kolízia, nie dve rôzne územia.

---

## Zlučovanie a delenie

```
NIKDY nespájaj dva uzly len preto, že vyzerajú podobne.
NIKDY nespájaj dva uzly, ktoré majú rôzne acceptance.
Uzol s viac než jedným súborom sa delí, ak sa deliť dá bez straty významu.
```

Menšie územie znamená menší dosah chyby a ostrejšiu kontrolu rozsahu.
Výnimkou je súbor, ktorý sa mení spolu s iným vždy — ten zostáva celok.

---

## Cykly

Cyklus v grafe je **nález, nie chyba behu**. Zapíše sa, uzly v cykle sa označia
`BLOCKED` s dôvodom `dependency_cycle`, a Runner pokračuje so zvyškom.

Runner cyklus **nerozväzuje sám.** Je to rozhodnutie o poradí práce a patrí
founderovi.

---

## Výstup

```
audit/dag.json          uzly a hrany
audit/dag-summary.md    počty, cykly, uzly bez územia, uzly bez acceptance
```

`dag-summary.md` je to, čo číta človek. Tri čísla v ňom rozhodujú, či má zmysel
pokračovať: koľko uzlov je `READY`, koľko z nich má úplné acceptance, a koľko
z nich má negatívny prípad.

Ak je tretie číslo výrazne menšie než druhé, graf obsahuje veľa kontrol,
ktoré nevedia zlyhať. To sa rieši pred vlnou, nie po nej.
