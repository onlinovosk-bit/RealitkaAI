# Report — ADR-2026-09-11b Software Factory V1 Minimum (ingest)

**Dátum:** 2026-09-14  
**Stav ADR:** NÁVRH · čaká founder rozhodnutie (nie GO implementácie)  
**Baseline overenia:** `origin/main` @ `97655763b` (#543 Inter-Agent Bus v1.0)  
**Vstup:** `C:/Users/aondr/Downloads/adr-2026-09-11b-software-factory-v1-minimum.md`  
**V repe:** `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`

## Verdikt

Founderova kritika 12-krokového Soft Factory poradia je konzistentná s predchádzajúcim varovaním „orchestrátor najprv“. Protinávrh **V1 Minimum** (Task Contract + Judge-as-runner + Ledger + tvrdé limity; **ani jeden nie je AI**) je správny smer pre tento týždeň — **ak** founder potvrdí rozhodnutia #1 a #4.

Tento report **neudeľuje** implementačné GO.

## Čo ADR odporúča (7 rozhodnutí)

| # | Otázka | Odporúčanie ADR |
|---|---|---|
| 1 | 12 krokov vs V1 Minimum | **V1 Minimum** |
| 2 | Ledger #9 vs hneď | **hneď** |
| 3 | Cost Governor: optimizer vs limiter | **limiter** |
| 4 | Judge: model vs spúšťač kontrol | **spúšťač kontrol** |
| 5 | Vlastný coder vs Cline | **Cline** zatiaľ |
| 6 | Samostatný projekt vs BUS | **BUS**; pilot = Contract+Ledger, nie coding loop |
| 7 | Agent Pool 7 rolí v V1 | **nie** |

Najdôležitejšie: **#1** (poradie) a **#4** (Judge = deterministický runner).

## Kontrolór — overené vs citované

### Overené na `origin/main` @ `97655763b`

- `.ai/bus/` existuje; README + `message.schema.md` + `AGENT_PROTOCOL.md` + tasks.
- `#543` / tip `97655763b` = „Inter-Agent Bus v1.0“ — sedí s tvrdením ADR o BUS.
- `.ai/bus/tasks/TASK-0008.md` má `id`, `scope.repo_paths`, `evidence.commands`, `next_action.gate` — **nie je greenfield**.
- Schéma v `message.schema.md` **nemá** bloky `acceptance` ani `budget` — rozšírenie je reálna medzera.

### Citované z ADR / zatiaľ **neoverené** na tomto tip main

- `expectedFileHash` + `hashMethod` „po hardeningu 8. 9.“ — na `origin/main` tip **nenájdené** (`git grep` prázdny). Možno lokálny/nepushnutý hardening alebo iná vetva; pred implementáciou treba doložiť SHA/PR.
- BUS-004 fabrikácia hashu `062b1a3…` vs blob `e78099c…` vs raw `08d95c28…` — na tip main **nenájdené** v `.ai/bus` / `docs` / `memory`. Diagnóza „self-approve bez výpočtu“ ostáva logicky platná pre Judge-as-runner; konkrétny dôkazový artefakt treba dohľadať pred citáciou v decision record.

## Čo V1 Minimum nie je

- Nie coding loop / Soft Factory orchestrátor.
- Nie Model Gateway, Adaptive Router, Agent Pool, inteligentný Cost Governor.
- Nie AI Judge („vyzerá to OK?“).

## Ďalší krok (GO brána)

**Founder:** potvrď rozhodnutia #1 a #4 (ideálne všetkých 7) frázou typu `GO SF V1 MINIMUM` / alebo explicitný NO-GO.  
Až potom: schema patch `acceptance`+`budget` + gate runner + ledger append do `.ai/bus/` (docs/code podľa BO), pilot workload = validator+ledger (zlý report max), nie autonómny commit loop.
