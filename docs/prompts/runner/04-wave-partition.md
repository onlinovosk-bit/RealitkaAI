# 04 — NON-CROSSING WAVES + WRITE-PROBE

Neskríženie nie je dohoda medzi agentmi. Je to **vlastnosť rozdelenia**,
overená príkazom.

---

## Podmienky vlny

Vlna N smie obsahovať iba uzly, ktoré súčasne:

```
1. nemajú vzájomný prienik write_territory
2. nemajú medzi sebou hranu v DAG
3. nepotrebujú výstup iného uzla z tej istej vlny
4. majú samostatný validation scope
5. majú rovnaký BASE_SHA
```

Podmienka 3 sa porušuje najčastejšie a najtichšie: dva uzly sú formálne
nezávislé, ale jeden očakáva, že ten druhý „už niečo pripravil".

---

## Maximum SAFE parallelism, nie maximum possible

```
max_workers = 3   pri behu s npm ci a tsc
max_workers = 4   pri audit vlne (read-only, bez závislostí)
```

Štvrtý worker v exekučnej vlne ušetrí minúty a pridá 1,2 GB `node_modules`
a ďalší paralelný `tsc`. Paralelizmus je optimalizácia, nie podmienka
správnosti — pri tesnom disku alebo CPU zníž na 2 a nič iné sa nemení.

**Nikdy nepúšťaj dve vlny naraz.** Vlna je jednotka overenia. Dve naraz
znamenajú dva integračné merge v tom istom `MAX_OPEN_PRS` okne a stratu
prehľadu, ktorá vlna čo pokazila.

---

## Spoločný zdroj, ktorý ničí disjunktnosť

Uzly môžu mať disjunktné územia a **napriek tomu** kolidovať cez spoločný
súbor, ktorý mení každý z nich ako vedľajší účinok.

```
typecheck-baseline.json   žiadna vlna ho nemení; znižuje sa raz, na konci
package.json / lock       zmena = vlastný uzol vo vlastnej vlne
generované typy           uzol, nie vedľajší účinok
```

Preto: **žiadna vlna nespúšťa `--write-baseline`.** Ratchet prechádza aj pri
`count < baseline`.

---

## WRITE-PROBE

Deterministická kontrola **tesne pred** spustením vlny, nie pri plánovaní.
Medzi plánom a behom mohol pribudnúť commit.

```
1. BASE_SHA sa od plánovania nezmenil
2. prienik write_territory naprieč uzlami vlny je prázdny
3. každý worktree existuje, je na svojej vetve, a vetva vetví z BASE_SHA
4. každé územie je v repe zapisovateľné a nie je v forbidden_paths
5. DAG hash je zhodný s tým, nad ktorým sa vlna počítala
```

```
Ktorýkoľvek bod zlyhá -> WAVE STOP -> REPARTITION
Nikdy: "prekryv je malý, pustíme to"
```

### Negatívny prípad write-probe

Write-probe, ktorá nikdy nepadla, nie je kontrola. Pred prvým ostrým použitím
sa overí v oboch smeroch:

```
dve územia disjunktné        -> PASS
dve územia s jedným prienikom -> FAIL, vypíše kolidujúcu cestu
```

Druhý prípad je dôležitejší. Ak neprejde, write-probe sa nepoužíva.

---

## Scaffolding do .git/info/exclude

Súbory, ktoré vytvorí orchestrátor v worktree agenta (`PROMPT.md`, `.done.json`),
**nie sú v jeho území** a nesmú skončiť v commite. Orchestrátor ich pri zakladaní
worktree zapíše do `.git/info/exclude` toho worktree.

Bez toho ich kontrola územia označí ako „mimo územia" a vyhodí celú vlnu —
stalo sa to pri prvom ostrom behu PARALLEL-3 a vyhodilo to všetkých troch
workerov naraz.

---

## Výstup

```json
{
  "wave_id": "", "base_sha": "", "dag_hash": "",
  "tasks": [], "agents": [], "worktrees": [],
  "write_territories": {}, "validation": [], "exit_gate": "",
  "write_probe": { "ran_at": "", "result": "PASS | FAIL", "collisions": [] }
}
```

Vlna bez `write_probe.result: "PASS"` sa nespúšťa.
