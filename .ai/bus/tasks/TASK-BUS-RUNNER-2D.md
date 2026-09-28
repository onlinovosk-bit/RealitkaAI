---
id: TASK-BUS-RUNNER-2D
type: task
status: open
owner: cursor
created_at: 2026-09-21T00:00:00Z

scope:
  repo_paths:
    - docs/architecture/runner-contract-2d.md
    - docs/architecture/runner-audit-2d.md
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
    desc: "diff nevysiel zo scope ÔÇö iba docs a tato karta"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
  - id: A3
    desc: "capability povrch sa NEROZSIRIL ÔÇö stale jedina, bus-alive"
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
    desc: "audit ma zaver pre OQ-2, OQ-3 (navrh/BLOCKED) a OQ-5, OQ-6 (naozaj zavrete?)"
    cmd: "grep -c 'OQ-2\\|OQ-3\\|OQ-5\\|OQ-6' docs/architecture/runner-audit-2d.md"
    expect: "kazde OQ ma vlastnu sekciu; OQ-2/OQ-3 s navrhom alebo BLOCKED, OQ-5/OQ-6 s verdiktom"
  - id: A5
    desc: "adversarialny audit ma zaver pre kazdu triedu z policy B, s riadkom kodu"
    cmd: "grep -c 'repo write\\|git write\\|merge\\|deploy\\|external side effect\\|credentials' docs/architecture/runner-audit-2d.md"
    expect: "kazda z siestich tried ma vlastny riadok s cestou a cislom riadku, nie suhrnne tvrdenie"

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

# TASK-BUS-RUNNER-2D ÔÇö runner contract + adversari├ílny audit (NIE implement├ícia)

Krok 2D z `docs/architecture/adr-2026-09-21-bus-runner-v2.md` ┬ž9 je ÔÇ×Always-on runner
na hoste". T├íto karta **nie je GO na jeho implement├íciu**. Je to prv├í polovica: prelo┼żi┼ą
tri founderove rozhodnutia (┬ž1.1ÔÇô1.3) do konkr├ętneho runner kontraktu a **adversari├ílne
overi┼ą, ┼że nevznik├í nov├í cesta k `AUTO-SAFE` write alebo external side effect**.

Implement├ícia runnera je samostatn├ę GO po prijat├ş tohto kontraktu.

## Najprv som h─żadal ÔÇö stav prerekviz├şt (overen├ę v k├│de, nie z ADR)

| krok | stav | d├┤kaz |
|---|---|---|
| 2A ADR | Ôťů | `fb59e23` (#607) |
| 2B atomick├Ż `move()` | Ôťů | `0341c45` (#611), `github-store.ts:158` ÔÇö jeden tree, retry raz z ─Źerstv├ęho readu |
| 2C lease + stavov├Ż model | Ôťů | `b71f8dc` (#615), `packages/bus-core/src/execution-state.ts` |
| 2D always-on runner | ÔŁî | `scripts/bus/` nem├í poll slu─Źku; `consume.ts` je jednorazov├Ż beh |
| 2E read-only capabilities | ÔŁî | `consumer.ts:80` ÔÇö `DEFAULT_CAPABILITIES = [BUS_ALIVE_CAPABILITY]` |

2D teda **smie za─Źa┼ą** ÔÇö 2B aj 2C s├║ hotov├ę. Blokuj├║ ho otvoren├ę ot├ízky, nie poradie.

## ─îo z ┬ž10 e┼íte blokuje 2D

`OQ-1` (TTL / heartbeat / timeout) je **u┼ż zodpovedan├í v k├│de**:
`execution-state.ts:17-19` ÔÇö `CLAUDE_RUN_TIMEOUT_MS = 10 min`, `LEASE_TTL_MS = 2 min`,
`HEARTBEAT_INTERVAL_MS = 30 s`, koment├ír ÔÇ×Founder decisions, 2026-09-21". Kontrakt to
m├í potvrdi┼ą ako ratifikovan├ę, nie znovu otv├íra┼ą.

Zvy┼ín├ę ┼ítyri mus├ş kontrakt vyrie┼íi┼ą **pred** implement├íciou:

- **OQ-2 ÔÇö retry budget.** `MAX_PERSISTENCE_ATTEMPTS = 2` existuje, ale ADR p├Żta aj
  *ako sa founder o `FAILED_PERSISTENT` dozvie mimo BUS-u*. Kan├íl dnes neexistuje.
- **OQ-3 ÔÇö hosting a identita tokenu.** Fine-grained PAT sa ned├í obmedzi┼ą na vetvu;
  `contents: write` plat├ş na cel├Ż repozit├ír. Kto token dr┼ż├ş, ─Źi dedikovan├Ż machine
  account, a ─Źo br├íni runnerovi p├şsa┼ą mimo `bus/`.
- **OQ-5 ÔÇö denn├Ż strop vykonan├ş.** Dnes neexistuje ┼żiadny. Pri poll ├í 60 s je to jedin├í
  poistka proti neohrani─Źen├ęmu n├íkladu.
- **OQ-6 ÔÇö opakovan├ę blockery. Toto je pre 2D najv├í┼żnej┼íie.** `consume.ts` nech├í
  odmietnut├Ż task z├ímerne otvoren├Ż (ÔÇ×only the founder closes a blocked task"). Pri
  jednorazovom behu spr├ívne. Pri poll ├í 60 s ten ist├Ż task vyrob├ş blocker **ka┼żd├║
  min├║tu** ÔÇö 1440 blockerov denne do vl├íkna, ktor├ę m├í nies┼ą rozhodnutia. Bez rie┼íenia
  OQ-6 runner nesmie be┼ża┼ą.

## Adversari├ílny audit ÔÇö povinn├í ─Źas┼ą

Pre **ka┼żd├║** zo ┼íiestich tried z policy B (`ADR ┬ž1.1`: repo write, git write, merge,
deploy, external side effect, credentials/secrets) dolo┼żi┼ą samostatn├Żm riadkom:

1. ktor├Ż konkr├ętny mechanizmus br├íni tomu, aby sa tam runner dostal bez GO
2. kde je to v k├│de vyn├║ten├ę (cesta + riadok), nie kde je to nap├şsan├ę v ADR
3. ─Źo by muselo zlyha┼ą, aby sa t├í bari├ęra obi┼íla

S├║hrnn├ę ÔÇ×policy B to zakazuje" je **odmietnutie karty**. ADR ┬ž1.1 hovor├ş, ┼że form├ílna
pe─Źiatka (`return null` vo `verify()`) je poru┼íen├şm ÔÇö to ist├ę plat├ş pre tento audit.

**Zn├íma diera, ktor├║ audit mus├ş pomenova┼ą:** `BusCapability`
(`packages/bus-core/src/consumer.ts:35-49`) m├í polia `id`, `idempotent`, `matches`,
`prompt`, `verify`. **Pole `sideEffects` neexistuje.** ADR ┬ž11 pritom uv├ídza
`sideEffects: "none"` ako podmienku pre `AUTO-SAFE`. Mitig├ícia z ADR sa teda proti
dne┼ín├ęmu rozhraniu ned├í vyn├║ti┼ą. Kontrakt m├í navrhn├║┼ą, ─Źi sa pole dopln├ş (a v ktorom
kroku), alebo ─Ź├şm sa nahrad├ş.

## ─îo m├í kontrakt obsahova┼ą

`docs/architecture/runner-contract-2d.md`:

1. **Proces** ÔÇö ─Źo runner sp├║┼í┼ąa, v akom cykle, ako sa zastav├ş. Poll 60 s (┬ž1.2),
   ┼żiadny verejn├Ż endpoint, ┼żiadny webhook.
2. **Identita a opr├ívnenia** ÔÇö odpove─Ć na OQ-3 vr├ítane toho, ─Źo runner **nesmie**
   a ako je to vyn├║ten├ę mimo dobrej v├┤le (branch protection, machine account).
3. **Strop** ÔÇö odpove─Ć na OQ-5: konkr├ętne ─Ź├şslo a ─Źo sa stane pri jeho dosiahnut├ş.
4. **Potla─Źenie opakovan├Żch blockerov** ÔÇö odpove─Ć na OQ-6 vr├ítane toho, ─Źo je podnet
   na prehodnotenie (zmena tasku? zmena allowlistu?).
5. **Eskal├ícia mimo BUS** ÔÇö odpove─Ć na OQ-2.
6. **Observability** ÔÇö JSONL run log + heartbeat s├║bor pod─ża ┬ž8. ┼Żiadne periodick├ę
   ÔÇ×som ┼żiv├Ż" spr├ívy na BUS.
7. **Adversari├ílny audit** ÔÇö ┼íes┼ą tried, vi─Ć vy┼í┼íie.
8. **─îo kontrakt nerozhoduje** ÔÇö explicitne, v duchu ADR ┬ž12.

## STOP podmienky

- **┼Żiadny runtime k├│d.** `packages/bus-core/src/**` a `scripts/bus/**` s├║ zak├ízan├ę.
- ┼Żiadna nov├í capability, ┼żiadna zmena `DEFAULT_CAPABILITIES`.
- ┼Żiadna zmena ADR ÔÇö kontrakt je nov├Ż dokument, ADR ost├íva ako prijat├ę rozhodnutie.
- ┼Żiadny token, PAT, secret ani hosting sa nenastavuje. Kontrakt ich **popisuje**,
  nezria─Ćuje.
- ┼Żiadny webhook, ┼żiadny Cloudflare tunel, ┼żiadny multi-runner (ADR ┬ž12).
- Ak niektor├í otvoren├í ot├ízka nem├í odpove─Ć bez founderovho rozhodnutia, zap├şsa┼ą ju ako
  `BLOCKED ÔÇö vy┼żaduje founder GO` s n├ívrhom. Nevyp─║┼ła┼ą ju odhadom.

## Report

`BUS-RUNNER-2D-CONTRACT PASS/FAIL` + odpovede na OQ-2/3/5/6 + audit ┼íiestich tried +
zoznam toho, ─Źo ost├íva `BLOCKED`.
# TASK-BUS-RUNNER-2D — adversariálny audit **už nasadeného** runnera

> **Oprava 2026-09-21, po merge #617.** Pôvodná verzia tejto karty tvrdila, že
> 2D runner neexistuje, a žiadala návrh kontraktu *pred* implementáciou. To bolo
> nesprávne: kód 2D je na `main` od `e6a2ddc` (#617, 14:18), teda skôr, než karta
> vznikla. Pôvodná kontrola bežala proti zastaranému `origin/main`.
>
> Zadanie sa tým **nezrušilo, ale obrátilo**: audit sa nerobí pred kódom, ale nad
> kódom, ktorý už existuje — a **pred tým, než runner dostane hosta a token**.

Runner je dnes **kód bez hosta**: `scripts/bus/consume.ts:752,789` má
`DEFAULT_POLL_INTERVAL_MS = 60_000` a always-on slučku, ale pre jeho beh neexistuje
runbook ani identita tokenu. To je jediná vec, ktorá dnes drží dosah chyby nízko.

## Stav overený v kóde (nie z ADR)

| položka | stav | dôkaz |
|---|---|---|
| 2A ADR | ✅ | `fb59e23` (#607) |
| 2B atomický `move()` | ✅ | `0341c45` (#611), `github-store.ts:158` |
| 2C lease + stavový model | ✅ | `b71f8dc` (#615), `execution-state.ts` |
| 2D always-on slučka | ✅ **shipped** | `e6a2ddc` (#617), `consume.ts:752,789` |
| OQ-1 TTL / heartbeat / timeout | ✅ ratifikované v kóde | `execution-state.ts:17-19` |
| OQ-5 denný strop | ✅ **shipped** | `execution-cap.ts`, `DAILY_EXECUTION_CAP = 100` |
| OQ-6 blocker dedup | ✅ **shipped** | `consume.ts:511` `blocker_deduped` |
| OQ-2 eskalácia mimo BUS | ❌ **otvorené** | `FAILED_PERSISTENT` sa zapíše do ledgeru (`consume.ts:726`); žiadny kanál k človeku |
| OQ-3 hosting + identita tokenu | ❌ **otvorené** | žiadny runbook v `docs/runbooks/`; v kóde sa riešiť nedá |
| `sideEffects` na capability | ❌ **chýba** | `consumer.ts:35-49` — polia sú `id`, `idempotent`, `matches`, `prompt`, `verify` |
| capability povrch | 1 | `consumer.ts:80` — len `BUS_ALIVE_CAPABILITY` |

## Úloha

### 1. Adversariálny audit šiestich tried policy B

Pre **každú** triedu z `ADR §1.1` (repo write, git write, merge, deploy,
external side effect, credentials/secrets) doložiť samostatným riadkom:

1. ktorý konkrétny mechanizmus bráni tomu, aby sa tam **bežiaci** runner dostal bez GO
2. kde je to v kóde vynútené — cesta + riadok, nie odkaz na ADR
3. čo by muselo zlyhať, aby sa bariéra obišla

Súhrnné „policy B to zakazuje" = odmietnutie karty. ADR §1.1 sám hovorí, že formálna
pečiatka vo `verify()` je porušením; to isté platí pre tento audit.

**Povinne pomenovať:** ADR §11 uvádza `sideEffects: "none"` ako podmienku pre
`AUTO-SAFE`, ale to pole na `BusCapability` **neexistuje**. Mitigácia z ADR sa proti
dnešnému rozhraniu nedá vynútiť. Navrhnúť, či sa doplní a v ktorom kroku.

### 2. Overiť, že OQ-5 a OQ-6 sú naozaj zavreté

Nie „commit to tvrdí". Doložiť testom alebo čítaním kódu:

- **OQ-5:** čo presne sa stane pri dosiahnutí `DAILY_EXECUTION_CAP`. Zastaví sa
  automatické vykonávanie, alebo sa len zaloguje? ADR žiada zastavenie.
- **OQ-6:** za akých podmienok `blocker_deduped` **prestane** platiť. ADR §10 pýta,
  čo je podnet na prehodnotenie — zmena tasku? zmena allowlistu? Ak dedup nikdy
  nevyprší, odmietnutý task zostane ticho navždy.

### 3. Zavrieť OQ-2 a OQ-3 — návrhom, nie rozhodnutím

- **OQ-2:** `FAILED_PERSISTENT` dnes končí zápisom do ledgeru. Navrhnúť kanál
  k človeku mimo BUS-u. **Nezriaďovať ho.**
- **OQ-3:** hosting a identita tokenu. Fine-grained PAT sa nedá obmedziť na vetvu —
  `contents: write` platí na celý repozitár. Navrhnúť, čo bráni runnerovi písať mimo
  `bus/`. **Token negenerovať, hosting nenastavovať.** Toto je founderovo rozhodnutie;
  zapísať ako `BLOCKED — vyžaduje founder GO` s variantmi.

## STOP podmienky

- **Žiadny runtime kód.** `packages/bus-core/**` a `scripts/bus/**` sú zakázané.
- Žiadna nová capability, žiadna zmena `DEFAULT_CAPABILITIES`.
- Žiadna zmena ADR — audit je nový dokument.
- **Runner sa nespúšťa.** Žiadny token, secret, hosting, cron, systemd unit.
- Žiadny webhook, žiadny multi-runner (ADR §12).
- Ak otázka nemá odpoveď bez foundera, `BLOCKED` + návrh. Nevypĺňať odhadom.

## Report

`BUS-RUNNER-2D-AUDIT PASS/FAIL` + audit šiestich tried s riadkami kódu + verdikt
k OQ-5 a OQ-6 (naozaj zavreté?) + návrhy k OQ-2 a OQ-3 + zoznam `BLOCKED`.
