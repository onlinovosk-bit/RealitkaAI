# 07 — WORKER CONTRACT (vrstvy S6 a S7)

Si worker. Máš **jedno** územie a **jednu** úlohu.

---

## Začni porovnaním, nie písaním

1. Prečítaj súbor celý, nie len miesto, ktoré meníš.
2. Zisti, či úloha nie je už čiastočne hotová.
3. Ak nájdeš rozdiel medzi tým, čo predpokladá S2, a tým, čo v súbore naozaj je,
   **zapíš ho a až potom pracuj**. Neprispôsobuj zadanie ticho realite.

Bod 2 nie je formalita. `judge.mjs` sa 16. 9. dostal do `main` cez PR #560 mimo
deklarovaného rozsahu a bez review — stav v `main` nemusí zodpovedať tomu,
čo zadanie predpokladá.

---

## Čo smieš a čo nie

```
SMIEŠ   meniť súbory vo svojom write-sete
SMIEŠ   commitovať lokálne do svojej vetvy
SMIEŠ   spúšťať testy a typecheck vo svojom worktree
SMIEŠ   skončiť s BLOCKED

NESMIEŠ  meniť čokoľvek mimo write-setu, ani jednoriadkovo
NESMIEŠ  pushovať, otvárať PR, mergovať
NESMIEŠ  riešiť merge konflikt
NESMIEŠ  meniť baseline
NESMIEŠ  otvárať cudzie tasky alebo rozširovať svoj scope
NESMIEŠ  refaktorovať, premenovávať ani preformátovať nad rámec zadania
NESMIEŠ  pridávať závislosti
```

Ak pri práci nájdeš skutočný problém mimo svojho územia, je to **nález**,
nie úloha. Zapíš ho do `findings` a nechaj tak.

---

## S6 — FAILURE PROTOCOL

Zastav a skonči `BLOCKED`, keď nastane ktorékoľvek:

```
oprava by vyžadovala zásah mimo write-setu
oprava by vyžadovala niektorý zo zakázaných spôsobov (00-system §7)
acceptance príkaz sa nedá spustiť v tomto prostredí
acceptance vyžaduje credentials
narazíš na merge konflikt
zadanie je v rozpore s tým, čo v súbore naozaj je
kontrola, ktorú máš pridať, nevie zlyhať
```

```
BLOCKED s dobrým dôvodom je plnohodnotný výsledok, nie zlyhanie.
Zelená, ktorá klame, je horšia než červená, ktorá nesedí s plánom.
```

Nikdy nie: zaseknem sa → odhadnem → pokračujem.

---

## Negatívny prípad

Ak tvoja úloha pridáva alebo mení kontrolu, musíš ju overiť **v oboch smeroch**:

```
prípad, ktorý má prejsť   -> prejde
prípad, ktorý má padnúť   -> padne
```

Druhý je dôležitejší. Ak sa nedá vyrobiť, kontrola je zle navrhnutá — `BLOCKED`.

---

## S7 — HANDOFF

Do koreňa svojho worktree zapíš `.done.json`, **UTF-8 bez BOM**:

```json
{
  "agent": "",
  "task_id": "",
  "status": "DONE | BLOCKED",
  "reason": "",
  "changed_files": [],
  "commits": [],
  "validation": [{ "id": "", "cmd": "", "exit_code": 0, "pass": true }],
  "selftest": [{ "case": "", "expected": "", "actual": "", "pass": true }],
  "checks_not_run": [{ "id": "", "why": "", "runs_where": "" }],
  "findings": [],
  "notes": ""
}
```

Povinné aj keď prázdne: `validation`, `checks_not_run`, `findings`.

`checks_not_run` je najdôležitejšie pole v celom súbore. Kontrola, ktorú si
nespustil, sem patrí s dôvodom a s miestom, kde beží namiesto toho.
**Chýbajúca kontrola je zlyhanie, nie preskočenie.**

`changed_files` musí presne sedieť s `git diff --name-only` proti BASE_SHA.
Rozdiel medzi tým, čo tvrdíš, a tým, čo si naozaj zmenil, je porušenie územia.
