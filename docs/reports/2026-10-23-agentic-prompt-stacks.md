# Agentic Prompt Stacks — 2026-10-23

Vetva tohto súboru: `cursor/agentic-visual-qa-dd79` (fáza 2), základ je vetva fázy 1. Nie je druhý report.

## G0 — baseline pred zmenou správania

Zaznamenané pred úpravou `verify-core` / CLI. Lokálny `main` aj `origin/main` po `git fetch origin main`: `a2e42ace351033afb123c3871e0fc531bffd0944`.

| Príkaz | Výsledok |
|---|---|
| `node --test scripts/ci/__tests__/revolis-verify.test.mjs` | exit 0, 27 pass, 0 fail |
| `node --experimental-strip-types --test packages/bus-core/tests/cost-governor.test.ts` | exit 0, 19 pass, 0 fail |
| `node scripts/ops/rau-route.mjs --stdin --json --project revolis` | `gate: GO_REQUIRED`, `kind: BUILD`, projekt `revolis` |

RAU route: GO_REQUIRED BUILD revolis. Founder GO v zadaní pokrýva PR-only rozšírenie. Slová merge/deploy/production v zadaní sú zákazy, nie kroky. Strategic Backlog `model-router` a `cost-governor` sa týmto GO neodomkýna pre automatický produkčný prepínač.

Nezaradené do baseline (nespustené): Playwright prehliadač, `npm run test:smoke`, CI na tomto commite, živé ceny modelov, PROD.

### Klasifikácia (z stromu, nie z predpokladu)

| Vrstva | Stav | Dôkaz |
|---|---|---|
| A Visual QA | EXISTS_BUT_INCOMPLETE | Playwright config a CI smoke existujú (`apps/crm/playwright.config.ts`, `preview-playwright-smoke.yml`, `nightly-playwright.yml`). `toHaveScreenshot` / `pixelmatch` / `pngjs`: 0 výskytov. |
| B API lifecycle | MISSING | Deprecation zmienky sú o tabuľkách a cronoch, nie o bráne „neoverené vypnutie modelu nemigruj“. |
| C Cost governor | EXISTS_BUT_INCOMPLETE | `packages/bus-core/src/cost-governor.ts` v1: ALLOW/WARN/DOWNGRADE/ESCALATE/BLOCK, prázdny default katalóg, limity 0.5/5/25 USD, `max_retries` 0. Výber podľa meranej latky kvality nie je. `llm-usage-cost.ts` má tabuľku sadzieb; nie je to živý cenník. |
| D Completion gate | EXISTS_BUT_INCOMPLETE | `scripts/ci/lib/verify-core.mjs` má PASS/FAIL/BLOCKED/NOT_VERIFIED a ručné kritérium nie je PASS. Chýba postupnosť PLANNED → PRODUCTION_VERIFIED. |
| Orchestrácia | EXISTS_BUT_INCOMPLETE | RAU, runner prompty a `cross-agent-engineering-contract.md` opisujú cyklus. Jeden príkaz, ktorý zastaví PR readiness na povinnom FAIL a nevydá merge/deploy, chýba. |

Governance prečítaná pred úpravou: `CLAUDE.md`, `AGENTS.md`, `docs/architecture/cross-agent-engineering-contract.md`, `.claude/skills/rau/SKILL.md`, `revolis-review-plan`, `revolis-verify-completion`, `kontrolor`. Plán fázy 1: `node scripts/ci/revolis-verify.mjs plan-lint` → `PLAN OK`.

## Fáza 1 — completion a evidence gate

**Verdikt na tejto vetve:** IMPLEMENTED a TESTED (unit + CLI odmietnutie tvrdenia). Nezávislá recenzia NOT_VERIFIED (písal to ten istý agent). Nie HUMAN_APPROVED, nie MERGED, nie DEPLOYED, nie PRODUCTION_VERIFIED.

Rozšírené existujúce jadro, nie druhý framework.

- `evaluateWorkflow` / `checkTransition` / `deriveWorkflowState` v `scripts/ci/lib/verify-core.mjs`.
- `node scripts/ci/revolis-verify.mjs workflow --task <file>` a `completion --task` berú statusy kontrol z behu. JSON pole `checks` sa ignoruje.
- Príkaz neudelí stav za `PR_READY`, ani keď JSON tvrdí `actor: founder` a priloží merge artefakt. `performsMerge` a `performsDeploy` sú false.
- Preskok `PLANNED` → `TESTED` a `PR_READY` → `MERGED` je `invalid_transition`.
- Použitie: `.claude/skills/revolis-verify-completion/SKILL.md` a krátky odsek v `AGENTS.md`.

### Príkazy po zmene

`node --test scripts/ci/__tests__/revolis-verify.test.mjs` → exit 0, 33 pass, 0 fail, 0 skipped (predtým 27).

Medzi novými kontrolami: tvrdenie `PR_READY` bez dôkazu → `assertion_not_evidence`, efektívny stav `IN_PROGRESS`; kontrola `FAIL` a rozsah `FAIL` ostávajú `IMPLEMENTED`; CLI s JSON `checks: PASS` bez `--run` skončí nenulovo a vypíše `assertion_not_evidence` a `Merge: nie`.

### Bezpečnosť

Žiadne tajomstvá, žiadny zápis do PROD, žiadna zmena limitov výdavkov. Meno aktéra v JSON nie je identita; preto stavy za `PR_READY` tento príkaz neudeľuje.

### Engineering justification

- **Trigger:** new-abstraction (stavový stroj v existujúcom module; nové súbory nie sú)
- **Decision path:** reuse
- **Alternatives considered:** nový balík `packages/completion-gate` — zamietnuté, lebo `verify-core.mjs` už viaže diff na dôkaz
- **Why not reuse:** N/A — reuse applied
- **Expected outcome:** tvrdenie agenta bez behov neprejde ako PR ready; doterajší `completion` bez `--task` ostáva
- **Related paths:** `scripts/ci/lib/verify-core.mjs`, `scripts/ci/revolis-verify.mjs`
- **Contradiction check:** none voči cost-governor backlogu (táto fáza router nestavia)

## Fáza 2 — Visual QA Guard

**Verdikt v commite porovnávača:** RGBA guard je IMPLEMENTED a TESTED. V tom commite browser screenshot nebol: `chromium.launch()` skončil exit 1, binárka `chromium_headless_shell-1217` chýbala. Tento odsek ten stav nahrádza až ďalší commit, ak v ňom snímky naozaj vzniknú.

- `scripts/ci/lib/visual-qa.mjs` — `compareRgba`. Bez `maxChangedRatio` je `BLOCKED` / `missing_threshold`.
- Syntetický test: biely blok 16/64 pixelov, prah `0.02` → `FAIL` `visual_regression`. Schválená snímka voči sebe → `PASS`. Do `apps/crm` sa regresia nezapisuje.
- `node --test scripts/ci/__tests__/visual-qa.test.mjs` v pôvodnom behu: exit 0, 3 pass, 0 fail.

Syntetický pixel test nie je screenshotová validácia prehliadača.

CI na prvom hede `6c55672a`: required check `Lint, test, build` zlyhal (run 39947704502). Test 33 volal `git diff origin/main...HEAD`; v checkout-e CI revízia `origin/main` nie je. Oprava: ten istý test ide s `--base HEAD`.

Na recenzovanom hede `93ed763ea3284d527c2b7e53a4070374013f06b4` som v tomto turne čítal run [39953704621](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/39953704621): workflow `CI - Revolis.AI` conclusion `success`, job `Lint, test, build` conclusion `success`, krok `Playwright smoke (next start + ephemeral DB)` conclusion `success`. Samostatný workflow `Preview — Playwright smoke` na tom istom SHA je run [39954401354](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/39954401354), conclusion `skipped`. Skip nie je prehliadačový PASS.

### Review blockers na `93ed763e` (reprodukované pred opravou)

- `node scripts/ci/revolis-verify.mjs workflow --task blocked.json --base HEAD` s `assertedState: IN_PROGRESS`, `started: true`: exit **0**, stdout `Kód: blocked`, `PR ready: nie`.
- `evaluateWorkflow` s `artifact: does-not-exist.md`, `source: diff`, bez `previousState`: `prReady: true`, `effectiveState: PR_READY`.

Oprava je na vetve fázy 1. Blocked a `prReady: false` majú nenulový exit (blocked je 2). `PR_READY` len po otvorení súboru v repe. Chýbajúci `previousState` je `invalid_transition`.

Fázy 3–5, merge a deploy táto vetva nerobí.
