---
id: TASK-OQ2-WATCHDOG
type: task
status: open
owner: cursor
created_at: 2026-09-21T00:00:00Z

scope:
  repo_paths:
    - scripts/watchdog/**
    - docs/runbooks/bus-runner-watchdog.md
    - docs/reports/2026-09-2*-oq2-watchdog*.md
    - .ai/bus/tasks/TASK-OQ2-WATCHDOG.md
  forbidden_paths:
    - scripts/bus/**
    - packages/bus-core/**
    - apps/**
    - .github/workflows/**
    - docs/architecture/adr-2026-09-21-bus-runner-v2.md

acceptance:
  - id: A1
    desc: "bus testy prechadzaju — dokaz, ze runner runtime ostal nedotknuty"
    cmd: "npm run bus:test"
    expect: exit_code == 0
  - id: A2
    desc: "diff nevysiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
  - id: A3
    desc: "watchdog testy prechadzaju, vsetkych sedem scenarov"
    cmd: "node --test scripts/watchdog/**/*.test.ts"
    expect: exit_code == 0
  - id: A4
    desc: "watchdog nema ziadnu zavislost na bus-core ani na CRM"
    cmd: >-
      node -e "const fs=require('fs');const files=fs.readdirSync('scripts/watchdog',{recursive:true})
      .filter(f=>String(f).endsWith('.ts'));const bad=[];for(const f of files){const s=fs.readFileSync('scripts/watchdog/'+f,'utf8');
      if(/from\s+['\"].*(bus-core|apps\/crm)/.test(s))bad.push(f)}
      if(bad.length){console.error('zakazany import:',bad);process.exit(1)}"
    expect: exit_code == 0
  - id: A5
    desc: "ziadny novy credential s repo write scope v diffe"
    cmd: "git diff origin/main...HEAD"
    expect: "ziadny PAT, token s contents:write, ani navod na jeho zriadenie pre watchdog"

budget:
  max_iterations: 8
  max_cost_usd: 4
  max_runtime_minutes: 45

risk: medium

evidence:
  commands: []
  files:
    - scripts/bus/consume.ts
    - packages/bus-core/src/execution-state.ts
    - docs/architecture/adr-2026-09-21-bus-runner-v2.md

verdict:
  result: null
  reason: null
  checked_at: null
  ledger_run_id: null
---

# TASK-OQ2-WATCHDOG — externý watchdog nad `liveness.json`

Founder GO `OQ-2 = A` (2026-09-21). Runner ostáva izolovaný od CRM, `bus-core` bez novej
závislosti, runner host bez ďalšieho secretu, a alertovacia cesta nezávisí od BUS-u,
ktorý môže byť práve nefunkčný.

**Runner runtime sa nemení.** Watchdog číta artefakt, ktorý runner už píše.

## Čo runner dnes píše — overené, nie prevzaté

`scripts/bus/consume.ts:826-833` po každom cykle prepíše `livenessFile` obsahom:

```
{ at, cycles, executed, failed, errors, consecutive_errors }
```

Zápis je obalený `.catch(() => {})` (`:832`), takže **zlyhanie zápisu je tiché** —
súbor jednoducho prestane starnúť.

## Dve vlastnosti signálu, ktoré musí watchdog rešpektovať

Toto nie je detail; naivná implementácia tu vyrobí presne ten spam, ktorý OQ-6 zavrel.

### S1 — `failed` je kumulatívny za životnosť procesu, nie per-cyklus

`const report` je na `:803` **mimo** `while` slučky (`:808`) a inkrementuje sa `+=`
(`:813`).

- `failed > 0` platí **navždy** od prvého zlyhania až do reštartu → podmienka
  `failed > 0 → alert` páli pri každom polle.
- Reštart vynuluje počítadlo → zlyhanie spred reštartu zmizne.

**Požiadavka:** alertovať na **nárast** oproti poslednej videnej hodnote, nie na
absolútnu hodnotu. Pokles počítadla (alebo `cycles` klesne) = **nový proces**, teda
re-baseline, **nie** „vyriešené".

### S2 — `failed` NIE JE signál `FAILED_PERSISTENT`

`action: "failed"` vracajú tri miesta: `:609`, `:728` (skutočná persistence give-up)
a `:732`. Je to **generické počítadlo zlyhaní**.

Z `liveness.json` sa dnes **nedá odlíšiť** „odpoveď existuje, ale nedá sa zapísať"
(potrebuje človeka) od prechodného zlyhania.

**Požiadavka:** watchdog to takto aj pomenuje. Alert znie „runner hlási nové zlyhanie,
príčina neznáma z liveness — pozri host log", **nie** „FAILED_PERSISTENT".
Jemnejšie rozlíšenie by si vyžiadalo zmenu `consume.ts` = samostatné GO, mimo tejto karty.

## Signály

| # | Podmienka | Význam |
|---|---|---|
| 1 | `failed` **narástol** oproti poslednej videnej hodnote | nové zlyhanie, príčina neznáma |
| 2 | `at` je starší než prah (návrh: 5× poll interval = 5 min) | runner stale / mŕtvy |
| 3 | súbor chýba alebo sa nedá prečítať | runner health failure |
| 4 | súbor sa nedá rozparsovať / chýbajú polia | malformed — hlásiť ako health failure, **nie** ticho ignorovať |
| 5 | `consecutive_errors` rastie | runner v backoffe, BUS alebo sieť nedostupná |

Signál 2 je **primárny fail-safe**: keďže zápis liveness je `.catch(() => {})`, každé
zlyhanie zápisu sa prejaví ako zastavené starnutie. Nespoliehať sa len na `failed`.

## Dead-man's switch — povinné

Watchdog nesmie byť jedinou vrstvou. Bez externého heartbeatu sme len presunuli ticho
z „runner mlčí" na „watchdog mlčí".

- Navrhnúť **minimálny** externý heartbeat s čo najmenšou secret surface.
- Ak vyžaduje platenú/externú službu alebo nový secret → **STOP pred implementáciou**,
  zapísať presný `GO REQUIRED` bod s variantmi.
- Neimplementovať heartbeat, ktorý potrebuje credential, bez samostatného GO.

## Bezpečnosť — tvrdé hranice

- Watchdog **nedostane** `contents: write` do repa.
- Watchdog **nedostane** machine PAT (to je OQ-3, samostatná hranica, samostatný PR).
- Žiadny nový credential s repo write scope.
- K liveness artefaktu **read-only** prístup.
- Žiadny import `bus-core` ani CRM kódu (vynútené `A4`).

## Testy — všetkých sedem

1. `failed` narástol → alert
2. `failed` nezmenený, hoci `> 0` → **žiadny** alert (anti-spam, S1)
3. počítadlo kleslo / `cycles` kleslo → re-baseline, žiadny falošný „vyriešené"
4. `at` starý → stale alert
5. liveness chýba → health failure
6. liveness malformed → health failure, nie tiché preskočenie
7. zdravý runner → ticho
8. scenár zlyhania samotného watchdogu / dead-man's switch

## Adversariálna kontrola

Doložiť — mechanizmom a miestom v kóde, nie tvrdením — že implementácia nevytvára:

- novú `AUTO-SAFE` write cestu do repa
- external side effect z runnera
- nový privilegovaný secret na runner hoste
- obídenie Founder Approval Boundary (ADR §7)

## STOP podmienky

- `scripts/bus/**` a `packages/bus-core/**` sú zakázané — runner runtime sa nemení.
- Žiadny Telegram/SMTP/Resend secret v runneri ani vo watchdogu bez samostatného GO.
- OQ-3 (machine PAT, `REVOLIS_BUS_BRANCH=bus/main`, branch protection) **nepatrí sem**.
- Ak dead-man's switch vyžaduje nový credential, write permission alebo zmenu infra →
  STOP a nahlásiť presný `GO REQUIRED` bod.

## Report

`OQ2-WATCHDOG PASS/FAIL` + presný secret surface + runtime/data flow + PASS/FAIL pre
každý z ôsmich testov + adversariálne overenie + čo ostáva `BLOCKED`.
