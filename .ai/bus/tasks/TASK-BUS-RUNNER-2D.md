---
id: TASK-BUS-RUNNER-2D
type: task
status: open
owner: cursor
created_at: 2026-09-21T00:00:00Z

scope:
  repo_paths:
    - docs/architecture/runner-contract-2d.md
    - docs/reports/2026-09-2*-bus-runner-2d-*.md
    - .ai/bus/tasks/TASK-BUS-RUNNER-2D.md
  forbidden_paths:
    - packages/bus-core/src/**
    - scripts/bus/**
    - apps/**
    - .github/workflows/**
    - docs/architecture/adr-2026-09-21-bus-runner-v2.md

acceptance:
  - id: A1
    desc: "bus testy prechadzaju (dokaz, ze sa nesiahlo na runtime)"
    cmd: "npm run bus:test"
    expect: exit_code == 0
  - id: A2
    desc: "diff nevysiel zo scope — iba docs a tato karta"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
  - id: A3
    desc: "capability povrch sa NEROZSIRIL — stale jedina, bus-alive"
    cmd: >-
      node -e "const c=require('fs').readFileSync('packages/bus-core/src/consumer.ts','utf8');
      const m=c.match(/DEFAULT_CAPABILITIES:\s*BusCapability\[\]\s*=\s*\[([^\]]*)\]/);
      const ids=(m?m[1]:'').split(',').map(s=>s.trim()).filter(Boolean);
      if(ids.length!==1||ids[0]!=='BUS_ALIVE_CAPABILITY'){console.error('capability surface changed:',ids);process.exit(1)}"
    expect: exit_code == 0
  - id: A4
    desc: "kontrakt odpoveda na vsetky styri otvorene otazky, ktore 2D blokuju"
    cmd: "grep -c 'OQ-2\\|OQ-3\\|OQ-5\\|OQ-6' docs/architecture/runner-contract-2d.md"
    expect: "kazde OQ-2, OQ-3, OQ-5, OQ-6 ma vlastnu sekciu s rozhodnutim alebo explicitnym BLOCKED"
  - id: A5
    desc: "adversarialny audit ma zaver pre kazdu triedu z policy B"
    cmd: "grep -c 'repo write\\|git write\\|merge\\|deploy\\|external side effect\\|credentials' docs/architecture/runner-contract-2d.md"
    expect: "kazda z siestich tried ma vlastny riadok s dokazom, nie suhrnne tvrdenie"

budget:
  max_iterations: 6
  max_cost_usd: 4
  max_runtime_minutes: 45

risk: high

evidence:
  commands: []
  files:
    - docs/architecture/adr-2026-09-21-bus-runner-v2.md
    - packages/bus-core/src/consumer.ts
    - packages/bus-core/src/execution-state.ts
    - packages/bus-core/src/github-store.ts
    - scripts/bus/consume.ts

verdict:
  result: null
  reason: null
  checked_at: null
  ledger_run_id: null
---

# TASK-BUS-RUNNER-2D — runner contract + adversariálny audit (NIE implementácia)

Krok 2D z `docs/architecture/adr-2026-09-21-bus-runner-v2.md` §9 je „Always-on runner
na hoste". Táto karta **nie je GO na jeho implementáciu**. Je to prvá polovica: preložiť
tri founderove rozhodnutia (§1.1–1.3) do konkrétneho runner kontraktu a **adversariálne
overiť, že nevzniká nová cesta k `AUTO-SAFE` write alebo external side effect**.

Implementácia runnera je samostatné GO po prijatí tohto kontraktu.

## Najprv som hľadal — stav prerekvizít (overené v kóde, nie z ADR)

| krok | stav | dôkaz |
|---|---|---|
| 2A ADR | ✅ | `fb59e23` (#607) |
| 2B atomický `move()` | ✅ | `0341c45` (#611), `github-store.ts:158` — jeden tree, retry raz z čerstvého readu |
| 2C lease + stavový model | ✅ | `b71f8dc` (#615), `packages/bus-core/src/execution-state.ts` |
| 2D always-on runner | ❌ | `scripts/bus/` nemá poll slučku; `consume.ts` je jednorazový beh |
| 2E read-only capabilities | ❌ | `consumer.ts:80` — `DEFAULT_CAPABILITIES = [BUS_ALIVE_CAPABILITY]` |

2D teda **smie začať** — 2B aj 2C sú hotové. Blokujú ho otvorené otázky, nie poradie.

## Čo z §10 ešte blokuje 2D

`OQ-1` (TTL / heartbeat / timeout) je **už zodpovedaná v kóde**:
`execution-state.ts:17-19` — `CLAUDE_RUN_TIMEOUT_MS = 10 min`, `LEASE_TTL_MS = 2 min`,
`HEARTBEAT_INTERVAL_MS = 30 s`, komentár „Founder decisions, 2026-09-21". Kontrakt to
má potvrdiť ako ratifikované, nie znovu otvárať.

Zvyšné štyri musí kontrakt vyriešiť **pred** implementáciou:

- **OQ-2 — retry budget.** `MAX_PERSISTENCE_ATTEMPTS = 2` existuje, ale ADR pýta aj
  *ako sa founder o `FAILED_PERSISTENT` dozvie mimo BUS-u*. Kanál dnes neexistuje.
- **OQ-3 — hosting a identita tokenu.** Fine-grained PAT sa nedá obmedziť na vetvu;
  `contents: write` platí na celý repozitár. Kto token drží, či dedikovaný machine
  account, a čo bráni runnerovi písať mimo `bus/`.
- **OQ-5 — denný strop vykonaní.** Dnes neexistuje žiadny. Pri poll á 60 s je to jediná
  poistka proti neohraničenému nákladu.
- **OQ-6 — opakované blockery. Toto je pre 2D najvážnejšie.** `consume.ts` nechá
  odmietnutý task zámerne otvorený („only the founder closes a blocked task"). Pri
  jednorazovom behu správne. Pri poll á 60 s ten istý task vyrobí blocker **každú
  minútu** — 1440 blockerov denne do vlákna, ktoré má niesť rozhodnutia. Bez riešenia
  OQ-6 runner nesmie bežať.

## Adversariálny audit — povinná časť

Pre **každú** zo šiestich tried z policy B (`ADR §1.1`: repo write, git write, merge,
deploy, external side effect, credentials/secrets) doložiť samostatným riadkom:

1. ktorý konkrétny mechanizmus bráni tomu, aby sa tam runner dostal bez GO
2. kde je to v kóde vynútené (cesta + riadok), nie kde je to napísané v ADR
3. čo by muselo zlyhať, aby sa tá bariéra obišla

Súhrnné „policy B to zakazuje" je **odmietnutie karty**. ADR §1.1 hovorí, že formálna
pečiatka (`return null` vo `verify()`) je porušením — to isté platí pre tento audit.

**Známa diera, ktorú audit musí pomenovať:** `BusCapability`
(`packages/bus-core/src/consumer.ts:35-49`) má polia `id`, `idempotent`, `matches`,
`prompt`, `verify`. **Pole `sideEffects` neexistuje.** ADR §11 pritom uvádza
`sideEffects: "none"` ako podmienku pre `AUTO-SAFE`. Mitigácia z ADR sa teda proti
dnešnému rozhraniu nedá vynútiť. Kontrakt má navrhnúť, či sa pole doplní (a v ktorom
kroku), alebo čím sa nahradí.

## Čo má kontrakt obsahovať

`docs/architecture/runner-contract-2d.md`:

1. **Proces** — čo runner spúšťa, v akom cykle, ako sa zastaví. Poll 60 s (§1.2),
   žiadny verejný endpoint, žiadny webhook.
2. **Identita a oprávnenia** — odpoveď na OQ-3 vrátane toho, čo runner **nesmie**
   a ako je to vynútené mimo dobrej vôle (branch protection, machine account).
3. **Strop** — odpoveď na OQ-5: konkrétne číslo a čo sa stane pri jeho dosiahnutí.
4. **Potlačenie opakovaných blockerov** — odpoveď na OQ-6 vrátane toho, čo je podnet
   na prehodnotenie (zmena tasku? zmena allowlistu?).
5. **Eskalácia mimo BUS** — odpoveď na OQ-2.
6. **Observability** — JSONL run log + heartbeat súbor podľa §8. Žiadne periodické
   „som živý" správy na BUS.
7. **Adversariálny audit** — šesť tried, viď vyššie.
8. **Čo kontrakt nerozhoduje** — explicitne, v duchu ADR §12.

## STOP podmienky

- **Žiadny runtime kód.** `packages/bus-core/src/**` a `scripts/bus/**` sú zakázané.
- Žiadna nová capability, žiadna zmena `DEFAULT_CAPABILITIES`.
- Žiadna zmena ADR — kontrakt je nový dokument, ADR ostáva ako prijaté rozhodnutie.
- Žiadny token, PAT, secret ani hosting sa nenastavuje. Kontrakt ich **popisuje**,
  nezriaďuje.
- Žiadny webhook, žiadny Cloudflare tunel, žiadny multi-runner (ADR §12).
- Ak niektorá otvorená otázka nemá odpoveď bez founderovho rozhodnutia, zapísať ju ako
  `BLOCKED — vyžaduje founder GO` s návrhom. Nevypĺňať ju odhadom.

## Report

`BUS-RUNNER-2D-CONTRACT PASS/FAIL` + odpovede na OQ-2/3/5/6 + audit šiestich tried +
zoznam toho, čo ostáva `BLOCKED`.
