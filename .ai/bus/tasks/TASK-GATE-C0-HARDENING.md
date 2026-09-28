---
id: TASK-GATE-C0-HARDENING
type: task
status: open
owner: cursor
created_at: 2026-09-22T00:00:00Z

scope:
  repo_paths:
    - scripts/bus/handshake.ts
    - scripts/bus/__tests__/handshake.test.ts
    - packages/bus-core/src/http.ts
    - packages/bus-core/tests/http.test.ts
    - docs/ops/2026-09-2*-gate-c0-*.md
    - .ai/bus/tasks/TASK-GATE-C0-HARDENING.md
  forbidden_paths:
    - scripts/bus/consume.ts
    - packages/bus-core/src/execution-state.ts
    - packages/bus-core/src/execution-cap.ts
    - packages/bus-core/src/github-store.ts
    - apps/**
    - .github/workflows/**
    - docs/architecture/adr-2026-09-21-bus-auth-identity.md
    - docs/architecture/adr-2026-09-21-bus-runner-v2.md

acceptance:
  - id: A1
    desc: "cely bus suite prechadza"
    cmd: "npm run bus:test"
    expect: exit_code == 0
  - id: A2
    desc: "typy prechadzaju"
    cmd: "npm run bus:typecheck"
    expect: exit_code == 0
  - id: A3
    desc: "diff nevysiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
  - id: A4
    desc: >-
      MODE: remote sa uz neda vyrobit samotnym flagom. Mutacny dokaz:
      handshake spusteny s --url proti endpointu, ktory NEDOLOZI identitu,
      NESMIE vypisat plnohodnotny remote PASS.
    expect: "dolozeny pred/po vypis, nie iba zeleny test"
  - id: A5
    desc: "Gate A/B sa neoslabili — from-binding a ack brany drzia"
    cmd: "npm run bus:test"
    expect: "ziadny existujuci auth test nebol zmeneny ani odstraneny; git diff to ukazuje"
  - id: A6
    desc: >-
      kazda brana je dokazana mutaciou, nie zelenym testom: docasne rozbi
      novu podmienku, uloz cerveny vystup, vrat spat, uloz zeleny
    expect: "oba vystupy v reporte"

budget:
  max_iterations: 8
  max_cost_usd: 6
  max_runtime_minutes: 60

risk: high

evidence:
  files:
    - docs/ops/2026-09-21-gate-c0-remote-execution-evidence.md
    - docs/architecture/adr-2026-09-21-bus-auth-identity.md
    - scripts/bus/handshake.ts
    - packages/bus-core/src/http.ts
---

# GATE C-0 HARDENING

## Stav

- **#626 uz opravil** povodny handshake/degraded-mode problem. Handshake berie
  `REVOLIS_BUS_TOKEN_SOL` aj `REVOLIS_BUS_TOKEN_CLAUDE` a posiela kazdu spravu
  pod vlastnou identitou. Tuto cast neriesis.
- **`MODE: remote` vsak stale vznika iba z flagu `--url`.** To je falsovatelne,
  a preto Gate C-0 **nie je PASS**.
- **C-1 nezacinaj.**

## Uloha

Navrhni a implementuj sposob, ktorym bude `MODE: remote` zalozeny na
nefalsovatelnom dokaze identity/povodu oboch stran, nie iba na pritomnosti
`--url`.

Ciel **nie je** „urobit remote true". Ciel je, aby artefakt nevedel klamat.

## Postup: AUDIT → navrh → implementacia

Implementuj az po audite, a iba v rozsahu potrebnom pre C-0.

1. Zmapuj aktualny C-0 flow proti `main`.
2. Presne identifikuj, kde sa dnes `MODE: remote` odvodzuje.
3. Identifikuj, co je dokaz identity ChatGPT/Sol strany.
4. Identifikuj, co je dokaz identity Claude/Runner strany.
5. Navrhni **minimalnu** zmenu, ktora odstrani falsovatelne kriterium.
6. Zachovaj existujuce bezpecnostne hranice.

## Tri overene naleze — vychodzi bod auditu, nie jeho nahrada

Overene citanim `main` @ `36495ff4`. Neber ich ako hotovy zaver, over si ich.

| # | Nalez | Miesto |
|---|---|---|
| 1 | `MODE: remote` je ciste `if (remoteUrl)`, kde `remoteUrl` je hodnota za `--url` | `scripts/bus/handshake.ts:348-349, 354, 363` |
| 2 | **`COPY_PASTE_REQUIRED: no` je odvodene z toho isteho flagu** — druhe falsovatelne tvrdenie v tom istom artefakte, v zadani nepomenovane | `scripts/bus/handshake.ts:392` |
| 3 | `/health` uz priznava `outbox_provenance` (`bound` / `unverified`), ale `checkEndpoint()` ho **vobec necita** — cita len `auth_mode` a `from_binding` | `packages/bus-core/src/http.ts:218` vs `scripts/bus/handshake.ts` `checkEndpoint` |

Strukturalne pozorovanie, nie predpisane riesenie: v lokalnom rezime si
harness server **sam spusta** (`startLocalServer`), takze proces uz dnes vie,
ci endpoint zalozil on. To je fakt, nie flag.

## Hranice

- **Ziadne oslabenie Gate A/B.** Existujuce auth testy sa nemenia ani nemazu.
- **Ziadny degraded-mode PASS vydavany ako plnohodnotny remote PASS.** Ak sa
  identita nedoloži, artefakt to musi povedat — nie mlcat.
- **Ziadny C-1.**
- **Ziadne nesuvisiace zmeny.**
- Ak by oprava vyzadovala zmenu v `forbidden_paths`, **zastav a napis preco**.

## Vystup

- presny dokaz **pred/po** — mutacny, nie zeleny test
- testy
- vysledny Gate C-0 status
- otvorene otazky

**STOP.** Po dodani nepokracuj.
