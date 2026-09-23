---
id: TASK-TC-BATCH-1
type: task
status: done
owner: tc-orchestrator
created_at: 2026-09-15T20:17:17.832Z
scope:
  repo_paths:
    - apps/crm/src/lib/acquisition/sync/persist/__tests__/persist-sync.test.ts
    - apps/crm/src/lib/moat-capture/__tests__/moat-capture.test.ts
    - apps/crm/src/app/(public)/buyer-onboarding/__tests__/actions.test.ts
  forbidden_paths:
    - apps/crm/next.config.js
    - apps/crm/tsconfig.json
    - apps/crm/scripts/typecheck-baseline.json
    - apps/crm/src/lib/infra/**
    - apps/crm/supabase/migrations/**
acceptance:
  - id: B1
    desc: "typovych chyb ubudlo, nepribudlo"
    cmd: "node apps/crm/scripts/typecheck-baseline.mjs"
    expect: exit_code == 0
  - id: B2
    desc: "hermeticke testy prechadzaju (bez RLS a integration)"
    cmd: 'npm --prefix apps/crm test -- --exclude "**/tests/rls/**" --exclude "**/*.integration.test.ts"'
    expect: exit_code == 0
  - id: B3
    desc: "API kontrakt bez noveho porusenia"
    cmd: "node apps/crm/scripts/check-api-contract.mjs --ci"
    expect: exit_code == 0
  - id: B4
    desc: "diff nevysiel zo scope"
    cmd: "git diff --name-only origin/main...HEAD"
    expect: all_paths_in(scope.repo_paths)
budget:
  max_iterations: 3
  max_cost_usd: 2
risk: low
evidence:
  commands:
    - "git merge-base --is-ancestor b324c71 HEAD  # exit 0 - commit davky je predkom HEAD"
    - "git branch -a --contains b324c71  # main, remotes/origin/main (aj audit/2026-09-16, docs/operating-mode-b)"
    - "git show --stat b324c71  # fix(types): typecheck paydown batch 1 (21 errors) (#560); 6 suborov, +239/-34; obsahuje vsetky tri subory scope"
    - "git log --oneline --all -- apps/crm/src/lib/acquisition/sync/persist/__tests__/persist-sync.test.ts apps/crm/src/lib/moat-capture/__tests__/moat-capture.test.ts 'apps/crm/src/app/(public)/buyer-onboarding/__tests__/actions.test.ts'  # b324c71 je posledna zmena vsetkych troch suborov"
    - "git log -1 --format=%ad --date=iso b324c71  # 2026-09-16 12:23:00 +0200"
    - "grep -n TASK-TC-BATCH-1 .ai/bus/ledger/2026-09.jsonl  # 4 behy: RUN-20260915201856 REJECT, RUN-20260916064357 REJECT, RUN-20260916072230 REJECT, RUN-20260916080336 HUMAN"
  files:
    - apps/crm/src/lib/acquisition/sync/persist/__tests__/persist-sync.test.ts
    - apps/crm/src/lib/moat-capture/__tests__/moat-capture.test.ts
    - apps/crm/src/app/(public)/buyer-onboarding/__tests__/actions.test.ts
    - .ai/bus/ledger/2026-09.jsonl
  urls: []
verdict:
  result: HUMAN
  reason: "rozpocet prekroceny - 3 behov >= limit 3"
  checked_at: 2026-09-16T08:05:03.627Z
  ledger_run_id: RUN-20260916080336-TASK-TC-BATCH-1
founder_approval:
  verdict_run_id: RUN-20260916080336-TASK-TC-BATCH-1
  approved_by: "Andrej Ondrus"
  approved_at: "2026-09-16T10:16:38+02:00"
  reason: "Tri behy rozpoctu minula vada kontraktu, nie praca davky. Beh 1: B2 vyzadovala credentials. Beh 2: B6 mala neplatnu cestu k workflowu. Beh 3: B1-B4 PASS. Limit max_iterations zostava 3, nezdvihnuty."
---
# TASK-TC-BATCH-1

Integrovana davka 1 profilu PARALLEL-3, 3 subory.

## Najprv som hladal

Orchestrator zlucil vetvy workerov do batch/tc-1. Kazdy worker menil prave
jeden subor; disjointnost overena pred merge.

## Rozsah kontrol

Judge spusta styri brany: B1, B2, B3, B4.

Bus validator (#555) NIE JE na baze, acceptance B5 vynechana. Nie je to
preskocena kontrola, je to kontrola, ktora na tejto baze neexistuje.
Po merge #555 ju dalsia davka dostane automaticky.

## Amendment B2, 2026-09-16

Z B2 vylucene tests/rls/** a **/*.integration.test.ts.

Dovod: pat suborov hadze Error zo straznej funkcie nad process.env este
pred spustenim akehokolvek produkcneho kodu:
  assertLocalTestDb    tests/rls/isolation-helpers.ts:33
  getRequiredTestEnv   tests/rls/enrichment-log-rls.test.ts:16
  getRequiredTestEnv   tests/rls/realsoft-import-logs-rls.test.ts:16
  testEnv              tests/rls/valuation-tenants-rls.test.ts:21
  requireLocalTestDb   src/app/api/valuation/submit/__tests__/route.integration.test.ts:17
Vyzaduju lokalnu ephemeral Supabase DB. Kriterium vylucenia je vlastnost
testu, nie jeho vysledok.

Ziadny z troch suborov davky nespada pod vylucene vzory. Overene prikazom
git diff --name-only 86e0198a..batch/tc-1 - tri subory, ziadny pod tests/rls/
a ziadny konciaci na .integration.test.ts.

## Kde vylucene testy realne bezia

Nie su bez pokrytia. Bezia v CI, a bezia skor, nez sa cokolvek zluci:
  .github/workflows/saas-grade-pipeline.yml
  on: pull_request, branches [main], types [opened, synchronize, reopened]
  krok "supabase start" vytvori jednorazovu lokalnu DB
  krok "Guard - TEST_SUPABASE_* must point to ephemeral local DB" overi,
    ze do testov nevstupi nic ine nez 127.0.0.1

Toto NIE JE acceptance polozka. Judge ju nespusta a spustit ju nemoze,
lebo nema a nesmie mat pristup k ziadnym credentials. Je to zaznam o tom,
kde sa kontrola vykonava.

## Znama nedeterministickost brany B2

Prvy beh po amendmente padol na src/lib/stealth-recruiter/routes.test.ts
(Test timed out in 5000ms). Subor nie je v davke.
  izolovany beh        2 testy, 451 ms, exit 0
  opakovany plny beh   291 passed, 6 skipped, exit 0, 71,4 s
  cerveny beh                                            94,3 s
Zaver: limit meria vytazenie stroja, nie kod davky. Zaznamenane ako znama
nedeterministickost brany B2, nie ako zlyhanie davky.
Naprava mimo tejto davky: samostatny PR, vitest.config.ts testTimeout 15000.

## Historia overovania tejto davky

Prvy beh Judge, 2026-09-15T20:20:33.619Z, davku zamietol s odovodnenim
"B2: exit 1, ocakavane 0". Zaznam je v ledgeri pod identifikatorom
RUN-20260915201856-TASK-TC-BATCH-1 a zostava nedotknuty.

Blok verdict bol vycisteny 2026-09-16, aby Judge mohol davku po amendmente
B2 overit znova. Ledger je zdrojom pravdy o predchadzajucich behoch;
tento subor drzi len posledny verdikt.

## Rozhodnutie foundera k verdiktu HUMAN

Verdikt HUMAN vydany 2026-09-16, dovod: 3 behy >= limit max_iterations 3.
Ziadny z troch behov nebol minuty na opravu kodu davky:
  beh 1  vada kontraktu, B2 vyzadovala credentials
  beh 2  vada kontraktu, B6 mala neplatnu cestu
  beh 3  B1-B4 PASS
Schvalujem integraciu davky 1. Limit nezdvihnuty, zostava 3.
Naprava mimo tejto davky: rozpocet ma pocitat iteracie prace, nie opravy
kontraktu; amendmenty kontraktu maju mat vlastne pocitadlo.

Andrej Ondrus / 2026-09-16 / 10:16:38+02:00
Podpis viazany na verdict_run_id RUN-20260916080336-TASK-TC-BATCH-1
(front matter founder_approval).

## Zosuladenie stavu so stromom, 2026-09-17

FINDING: kod davky je na `main`, karta drzala `status: running`.
EVIDENCE: `git merge-base --is-ancestor b324c71 HEAD` -> exit 0;
`git branch -a --contains b324c71` -> `main`, `remotes/origin/main`;
`git show --stat b324c71` -> commit `fix(types): typecheck paydown batch 1
(21 errors) (#560)` meni vsetky tri subory zo `scope.repo_paths`.

ACTION: `status` zmeneny `running` -> `done`, doplneny blok `evidence`
podla pravidla STATE MUST BE EVIDENCE-BACKED
(`docs/prompts/multi-agent-protocol-v0/06-operating-mode-b.md`).

Stav po vrstvach:

| vrstva | stav | dokaz |
|---|---|---|
| commit | **na `main`** | `git merge-base --is-ancestor b324c71 HEAD` exit 0 |
| PR | **unknown** | cislo `#560` je iba z predmetu commitu `b324c71`; `gh pr view 560` v tejto session nebezal |
| produkcia | **unknown** | ziaden deploy dokaz v repe |

FINDING: `verdict.result` zostava `HUMAN` a je **nedotknuty**.
EVIDENCE: `06-operating-mode-b.md`, sekcia "Pravidla pridane z behov 16. az 17. 9.":
"Verdikt zapisuje iba Judge. Rucne `verdict.result` = porusenie."
Verdikt `HUMAN` z behu `RUN-20260916080336-TASK-TC-BATCH-1` je posledny, co Judge
zapisal, a plati dalej. Co ho uzatvara, nie je prepis verdiktu, ale podpis foundera
v `founder_approval` (Andrej Ondrus, 2026-09-16T10:16:38+02:00), viazany na ten isty
`verdict_run_id`. `status: done` teda znamena: Judge vydal HUMAN, founder branu
zavrel, kod je na `main`.
