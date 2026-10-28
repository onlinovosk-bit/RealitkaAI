# Agentic Prompt Stacks — 2026-10-23

Vetva tohto súboru: `cursor/agentic-visual-qa-dd79` (fáza 2), základ je vetva fázy 1. Nie je druhý report.
Vetva tohto súboru: `cursor/agentic-orchestration-dd79` (fáza 5), základ je vetva fázy 4. Nie je druhý report.

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

**Verdikt:** RGBA guard je IMPLEMENTED a TESTED. Syntetické PNG nižšie nie sú snímky produktových rout. Samostatné snímky lokálneho UI sú v odseku „Prehliadač“.

Prvý pokus v commite porovnávača: `chromium.launch()` exit 1, chýbala binárka `chromium_headless_shell-1217`. Potom `npx playwright install chromium` skončil exit 0 (Chrome for Testing v cache `chromium-1217` a `chromium_headless_shell-1217`).

Zachytenie v tomto turne:

- Príkaz: `node scripts/ci/visual-qa-capture.mjs`
- Exit: 0
- Schválená snímka: `scripts/ci/fixtures/visual-qa/approved.png` (64×64, 169 B, pozadie `#102040`)
- Test-only regresia: `scripts/ci/fixtures/visual-qa/regression.png` (64×64, 188 B, biely blok 32×32). Do `apps/crm` sa nezapisuje.
- `compareRgba` prah `0.02`: regresia voči schválenej → `FAIL` `visual_regression`, `changedPixels` 1024, `changedRatio` 0.25. Schválená voči sebe → `PASS` `within_threshold`, 0 zmenených pixelov.
- Review artefakty: `/opt/cursor/artifacts/visual-qa/approved.png`, `/opt/cursor/artifacts/visual-qa/regression.png`
- `node --test scripts/ci/__tests__/visual-qa.test.mjs` po zachytení: exit 0, 4 pass, 0 fail. Štvrtý test číta uložené PNG a `.rgba` a Chromium nespúšťa. Spúšťač prehliadača nie je v kroku CI helper (ten beží pred `playwright install`).

- `scripts/ci/lib/visual-qa.mjs` — `compareRgba`. Bez `maxChangedRatio` je `BLOCKED` / `missing_threshold`.

Syntetický pixel test nie je screenshotová validácia prehliadača.

### Prehliadač — lokálne UI

Server už bežal: `next dev` v `apps/crm`, `http://127.0.0.1:3000` (proces štartoval pred týmto zachytením, stránky sa skladajú z aktuálneho stromu). Príkaz `node scripts/ci/visual-qa-pages.mjs`, exit 0. HEAD stromu pri zachytení: `576cb1213bbc0deee9a893f9ce0ece137f2c9b81`. Chromium cez Playwright, nie smoke test.

| Route | HTTP | Finálna URL | Súbor |
|---|---|---|---|
| `/proof` | 200 | `/proof` | `scripts/ci/fixtures/visual-qa/pages/proof.png` |
| `/proof` 390×844 | 200 | `/proof` | `scripts/ci/fixtures/visual-qa/pages/proof-mobile.png` (text `PROOF OF VALUE` je na stránke) |
| `/landing` | 200 | `/landing` | `scripts/ci/fixtures/visual-qa/pages/landing.png` |
| `/login` | 200 | `/login` | `scripts/ci/fixtures/visual-qa/pages/login.png` |
| `/dashboard`, `/forecast`, `/team`, `/settings`, `/import/universal` | 200 po presmerovaní | `/login` | rovnaké snímky prihlásenia, nie obsah za auth |

Kópie: `/cursor/stores/self/media/visual-qa/` a `/opt/cursor/artifacts/visual-qa/pages/`. Manifest: `scripts/ci/fixtures/visual-qa/pages/pages-manifest.json`. Dashboard za prihlásením sa nezobrazil.

CI na prvom hede `6c55672a`: required check `Lint, test, build` zlyhal (run 39947704502). Test 33 volal `git diff origin/main...HEAD`; v checkout-e CI revízia `origin/main` nie je. Oprava: ten istý test ide s `--base HEAD`.

Na recenzovanom hede `93ed763ea3284d527c2b7e53a4070374013f06b4` som v tomto turne čítal run [39953704621](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/39953704621): workflow `CI - Revolis.AI` conclusion `success`, job `Lint, test, build` conclusion `success`, krok `Playwright smoke (next start + ephemeral DB)` conclusion `success`. Samostatný workflow `Preview — Playwright smoke` na tom istom SHA je run [39954401354](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/39954401354), conclusion `skipped`. Skip nie je prehliadačový PASS.

### Review blockers na `93ed763e` (reprodukované pred opravou)

- `node scripts/ci/revolis-verify.mjs workflow --task blocked.json --base HEAD` s `assertedState: IN_PROGRESS`, `started: true`: exit **0**, stdout `Kód: blocked`, `PR ready: nie`.
- `evaluateWorkflow` s `artifact: does-not-exist.md`, `source: diff`, bez `previousState`: `prReady: true`, `effectiveState: PR_READY`.

Oprava je na vetve fázy 1. Blocked a `prReady: false` majú nenulový exit (blocked je 2). `PR_READY` len po otvorení súboru v repe. Chýbajúci `previousState` je `invalid_transition`.

Fázy 3–5, merge a deploy táto vetva nerobí.
## Fáza 3 — API Lifecycle Guard

**Verdikt:** klasifikátor a inventár sú IMPLEMENTED a TESTED. Živá stránka poskytovateľa sa neťahala (`vendor_deprecation_fetched: false`). Nie je to migrácia a nie je to PRODUCTION_VERIFIED.

Inventár `scripts/ci/api-lifecycle-inventory.json` vznikol extrakciou, nie odpisom z pamäte. `CODEOWNERS` v repe nie je, preto `ownership_gap: true` a `owner: null` na každom zázname.

| id | hodnota nájdená v súbore | api verzia |
|---|---|---|
| anthropic-sonnet | `claude-sonnet-4-6` v `apps/crm/src/lib/ai/claude.ts` | medzera |
| anthropic-haiku | `claude-haiku-4-5-20251001` v tom istom súbore | medzera |
| openai-ghostwriter | `gpt-4o` | medzera |
| openai-call-script | `gpt-4o-mini` | medzera |
| openai-assistant-chat | `gpt-4o-mini` | medzera |
| openai-transcribe | `whisper-1` | medzera |
| google-ads-rest | API verzia `v25` v `google-ads-client.ts` | pin v kóde |
| stripe-node-client | `new Stripe(` v `billing-store.ts` bez `apiVersion` | medzera |
| dep-anthropic-sdk / dep-openai / dep-stripe | rozsahy `^0.91.1` / `^6.33.0` / `^21.0.1` z `apps/crm/package.json` | rozsah balíka, nie API verzia |

Komentár v `google-ads-client.ts`, že v18 je sunset, sa neberie ako potvrdený primárny zdroj. Oznámenie s citátom a bez overenia je `unverified_notice`.

Brána: `autoMigrate` je false pre missing source, unverified notice aj confirmed deprecation. Founder `action: migrate` na potvrdenom oznámení dá `allowed: true` a stále `autoMigrate: false` (`founder_authorized_not_automatic`). Neoverené oznámenie ostane `allowed: false` aj s tým istým povolením.

### Príkaz

`node --test scripts/ci/__tests__/api-lifecycle.test.mjs` → exit 0, 2 pass, 0 fail, 0 skipped.

### Bezpečnosť

Žiadny fetch deprecation stránky, žiadna zmena modelu v CRM, žiadny zápis do PROD. Inventár nie je úplný zoznam všetkých HTTP integrácií; je to množina, ktorú extraktor naozaj našiel.

### Engineering justification

- **Trigger:** new-file
- **Decision path:** new-code (klasifikátor; inventár je extrakt existujúcich súborov, nie druhý katalóg cien)
- **Alternatives considered:** ručný zoznam modelov v dokumente — zamietnuté, lebo by sa dal odpísať bez súboru
- **Why not reuse:** cost governor nerieši deprecation notice a nespúšťa ani nezakazuje migráciu API
- **Expected outcome:** neoverené vypnutie má `autoMigrate: false`
- **Related paths:** `scripts/ci/lib/api-lifecycle.mjs`, `scripts/ci/api-lifecycle-inventory.json`
- **Contradiction check:** none. Komentár o sunsete v18 sa nepoužil ako dôvod zmeny klienta.

## Fáza 4 — cost route advisor

**Verdikt:** `selectRoute` je IMPLEMENTED a TESTED na reprodukovateľnom fixture. Živé vendor ceny a produkčná telemetria sú INCOMPLETE / NEMERANÉ. Produkčné limity sa nezmenili. Nie je to automatický switch a nie je to PRODUCTION_VERIFIED.

Fixture `case-alpha`, metrika `exact_match`, latka `0.8`, rozpočet `0.1`. Čísla sú stropy v teste, nie cenník poskytovateľa.

| kandidát | strop v teste | skóre | výsledok |
|---|---|---|---|
| fixture-cheap | 0.02 | 0.5 | pod latkou, nevybraný |
| fixture-mid | 0.05 | 0.9 | vybraný, `applied: false` |
| fixture-dear | 0.2 | 0.95 | drahší, nevybraný |

Ďalšie výsledky toho istého behu: chýbajúci `price_source` → `INCOMPLETE` / `measurement_incomplete`; `budget_remaining_usd: null` → `BLOCK` / `budget_unknown`; rozpočet `0.01` → `BLOCK` / `budget_exhausted`; `environment: production` a `apply_switch: true` → `BLOCK` / `production_switch_forbidden`, `selected: null`; `retries_used: 1` pri `max_retries: 0` → `BLOCK` / `retry_limit`. Model id v tvare tajomstva sa v telemetrii rediguje.

### Príkazy

- `node --experimental-strip-types --test packages/bus-core/tests/cost-governor.test.ts` → exit 0, 22 pass, 0 fail (predtým 19).
- `npx tsc -p packages/bus-core/tsconfig.json --noEmit` → exit 0.

CI job `bus:test` tento súbor už spúšťa. Beh na GitHube po rebase ešte nie je prečítaný.

### Bezpečnosť a cena

Žiadny call na poskytovateľa, žiadna zmena `INTERNAL_GOVERNOR_LIMITS`, žiadny nákup kreditov, žiadny produkčný prepínač. `applied` je vždy false.

### Engineering justification

- **Trigger:** new-abstraction v existujúcom súbore
- **Decision path:** reuse
- **Alternatives considered:** čítať sadzby z `llm-usage-cost.ts` — zamietnuté, lebo to nie je overený živý cenník
- **Why not reuse:** N/A — reuse applied (`redactSecrets`, limity sa nekopírujú do nových čísel)
- **Expected outcome:** lacnejší kandidát pod latkou sa nevyberie; chýbajúci rozpočet fail-closed
- **Related paths:** `packages/bus-core/src/cost-governor.ts`
- **Contradiction check:** none pre automatický produkčný router — ten sa nestavia. Backlog `model-router` a `cost-governor` ostáva BACKLOG. Founder GO v tomto zadaní kryje len fail-closed radu.

`applied` ostáva false. Limity `0.5 / 5 / 25` sa nemenia. Routing sa z tejto tabuľky neprepína. Merge a deploy sa nerobia.

### Ceny — overené v tomto turne vs unknown

Žiadne číslo nižšie nie je nameraný náklad (žiadny invoice, žiadny usage export). Overené riadky sú publikovaný cenník prečítaný 2026-10-23. Ostatné ostávajú unknown a nie sú overené.

**Overené (list price, nie measured cost)**

| Čo kód drží | Jednotka | Podmienka z prečítanej stránky | Zhoda | Zdroj |
|---|---|---|---|---|
| Sonnet v `llm-usage-cost.ts`: input 3.0, output 15.0. Konštanta `CLAUDE_SONNET` je `claude-sonnet-4-6`. | USD / 1M tokenov | Riadok Claude Sonnet 4.6: base input $3 / MTok, output $15 / MTok | áno | https://platform.claude.com/docs/en/about-claude/pricing |
| `gpt-4o` 2.5 / 10.0, `gpt-4o-mini` 0.15 / 0.6, `gpt-4.1` 2.0 / 8.0, `gpt-4.1-mini` 0.4 / 1.6 | USD / 1M tokenov | Tabuľka Standard, stĺpce Input a Output (nie Batch, nie long context) | áno | https://developers.openai.com/api/docs/pricing |
| `CACHE_WRITE_MULTIPLIER` 1.25 a `CACHE_READ_MULTIPLIER` 0.1 | násobok base input | Stránka: 5-minútový cache write je 1.25× a cache hit je 10 % base input | áno ako násobok, nie ako dolárová sadzba Haiku 4.5 | tá istá Claude stránka |

**Unknown (kód alebo test číslo má, tento turn ich ako cenu poskytovateľa neoveril)**

| Číslo | Kde | Prečo unknown |
|---|---|---|
| Haiku input 0.8, output 4.0 | `llm-usage-cost.ts`, kľúč `CLAUDE_HAIKU` = `claude-haiku-4-5-20251001` | Tá istá Claude stránka má Claude Haiku 4.5 za $1 / $5 za 1M tokenov. $0.80 / $4 je riadok retired Claude Haiku 3.5, nie model id v kóde. Nie je to overená cena Haiku 4.5. |
| `whisper-1` | inventár transcribe | Na OpenAI pricing stránke som nenašiel riadok `whisper-1`. `gpt-realtime-whisper` $0.017/min je iný produkt. |
| `USD_TO_EUR` 0.92 | `llm-usage-cost.ts` | Nie je na cenníku modelu. |
| `RETAIL_EUR_PER_CREDIT` 0.86 | `llm-usage-cost.ts` | Nie je na cenníku modelu. |
| `INTERNAL_GOVERNOR_LIMITS` 0.5 / 5 / 25 USD, `warn_remaining_ratio` 0.2, `max_retries` 0 | `cost-governor.ts` | Politický strop v kóde, nie vendor cena. V tomto commite sa nemení. |
| Fixture stropy 0.02, 0.05, 0.2 a test katalóg sonnet/opus 5, haiku 0.2 | `cost-governor.test.ts` | Vstupy testu, nie cenník. |

`selectRoute` tieto sadzby nečíta a model neprepína.

## Fáza 5 — orchestrácia

**Verdikt tohto commitu:** `runPipeline` je IMPLEMENTED a TESTED. Povinný `FAIL` dá `prReady` false, `actions` [], `performsMerge` false, `performsDeploy` false, `postReleaseRan` false. Skok cez `validate` sa do `pr_readiness` nedostane. Prítomnosť súboru nie je PASS.

Na neposkladanej vetve (pred týmto rebase) probe hlásil visual a lifecycle `module_absent`. Tento commit tie moduly neimportuje; dôkaz, že ich orchestrácia na poskladanom hrote vidí, je samostatný commit na tejto istej vetve, až keď ten beh naozaj prebehne.

### Príkaz

`node --test scripts/ci/__tests__/orchestrate.test.mjs` v pôvodnom commite: exit 0, 5 pass, 0 fail, 0 skipped.

### Bezpečnosť

Žiadne tajomstvá, žiadny zápis do PROD, žiadna zmena výdavkových limitov, žiadny automatický prepínač modelu, žiadna migrácia API. Orchestrátor nevydá merge ani deploy. Post-release stage nie je.

### Engineering justification

- **Trigger:** new-file
- **Decision path:** new-code pre stavový beh; brány samotné ostávajú v predchádzajúcich fázach
- **Alternatives considered:** skopírovať súrodenecké moduly do tejto vetvy — zamietnuté, lebo by zdvojili PR
- **Why not reuse:** existujúci `revolis-verify` nespája povinný FAIL so zákazom merge/deploy v jednom príkaze
- **Expected outcome:** povinný FAIL nie je PR ready a výsledok nemá merge/deploy
- **Related paths:** `scripts/ci/lib/orchestrate.mjs`, `scripts/ci/revolis-orchestrate.mjs`
- **Contradiction check:** none

Merge a deploy sa nerobia.

### Reprodukcia #922 pred opravou sondy

Na recenzovanom hede `ae3b12a2b889dd89fb7ff6a20000bb56ebd0469a` (súbory `visual-qa.mjs` a `api-lifecycle.mjs` chýbali): `node scripts/ci/revolis-orchestrate.mjs --fixture orch.json` so všetkými stage `PASS` a `checks: [{id: visual, required: true, status: PASS}]` skončil exit **0**, `prReady: true`.

Oprava v nasledujúcom commite volá `probeStacks` z `revolis-orchestrate.mjs`. `MISSING` / `FAILED` / `NOT_VERIFIED` nie sú úspech. JSON id zásobníka sa ignoruje.

## Fáza 6 — dôkaz po review

Stavy nižšie sú len tam, kde ich tento turn zmeral. Nie je tu MERGED ani PRODUCTION_VERIFIED. PR_READY pre tieto PR sa neudeľuje: nezávislá recenzia opráv ešte nie je a CI nových headov v čase tohto odseku nie je prečítané.

| Nález | Stav |
|---|---|
| #918 exit 0 pri `blocked` / `prReady: false` | FIXED. CLI s `previousState: PLANNED` a `assertedState: IN_PROGRESS` má exit 2. |
| #918 `PR_READY` z neotvoreného artefaktu | FIXED. `does-not-exist.md` ostáva `TESTED`, blocker `review_artifact_unopened`. |
| #918 chýbajúci `previousState` | FIXED. Kód `invalid_transition`, `prReady: false`. |
| #918 pokazený vstup a blocked | FIXED. `evaluateWorkflow(null)`, reťazec v `evidence` a `checks: "PASS"` nie sú ready. |
| #922 príkaz nevolal `probeStacks` | FIXED. Test vstupného príkazu s prázdnym `--root` má `visual` `MISSING` a exit nie 0. |
| #922 rovnaké `NOT_VERIFIED` pre prítomný aj chýbajúci súbor | FIXED. `MISSING`, `FAILED`, `NOT_VERIFIED`, `VERIFIED` sú rozdielne. Iba `VERIFIED` má `passesAsPass`. |
| #922 JSON `PASS` pri chýbajúcom module | FIXED. Rovnaký test posiela `status: PASS` a ready nie je. |
| #919 blocking defect | žiadny v review. Syntetické RGBA ostáva unit test. Prehliadačové snímky UI sú v odseku Prehliadač, exit 0 príkazu `visual-qa-pages.mjs`. |
| #920 blocking defect | žiadny v review. `autoMigrate` ostáva false. |
| #921 blocking defect | žiadny v review. Ceny sú v tabuľke fázy 4. Limity 0.5 / 5 / 25 a `applied: false` sa nemenia. |

Lokálne príkazy na poskladanom strome v tomto turne, exit 0: `revolis-verify` 37 pass, `visual-qa` 4 pass, `api-lifecycle` 2 pass, `orchestrate` 8 pass (spolu 51 v jednom `node --test`), `cost-governor` 22 pass. CI nových SHA sa dopĺňa až po pushi, keď je beh vidno. `Preview — Playwright smoke` na recenzovaných SHA bol `skipped` (nie prehliadačový PASS): #918 run 39954401354, #919 run 39961159489, #920 run 39961443149, #921 run 39961750764, #922 run 39956901951.

`Lint, test, build` na recenzovaných headov, prečítané v tomto turne, conclusion `success`: #918 run 39953704621 (krok `Playwright smoke (next start + ephemeral DB)` success), #919 run 39960870282, #920 run 39960873220, #921 run 39960882714, #922 run 39956504297. To nie je CI nových headov.

Zostáva: nezávislá recenzia týchto opráv, CI na nových SHA, obsah `/dashboard` za prihlásením (snímka skončila na `/login`). Haiku 4.5 sadzba v kóde sa nezhoduje s prečítaným cenníkom a ostáva unknown.

### #922 CI `a3844370` — cost `import_failed`

Beh [39975457756](https://github.com/onlinovosk-bit/RealitkaAI/actions/runs/39975457756) na `a38443706fb1f138529dcea202f35e62d5ad3419`, job `Lint, test, build`, krok `Test CI helper scripts`: subtest `overený strom je ready a JSON zásobníka to neprepíše` nie je ok. Exit 1, `prReady` false, `blockedBy` cost `FAILED` / `import_failed`. completion, visual a lifecycle boli `VERIFIED`. Negatívne testy v tom istom súbore prešli. Krok beží na Node 20, ktorý import `.ts` odmietne (`ERR_UNKNOWN_FILE_EXTENSION`).

Oprava nenačíta `.ts` ako úspech bez behu. Keď natívny import spadne, `loadStackModule` preloží súbor balíkom `typescript` z `node_modules` alebo `apps/crm/node_modules` a spustí `selectRoute`. Chýbajúci prekladač ostáva `import_failed`. `MISSING` a `NOT_VERIFIED` ostávajú neúspech.

Lokálne po oprave: `node --test scripts/ci/__tests__/orchestrate.test.mjs` exit 0, 10 pass, 0 fail. Ten istý vstupný príkaz s `--no-experimental-strip-types` (rovnaké odmietnutie `.ts` ako Node 20) exit 0, všetky štyri sondy `VERIFIED`, `prReady` true, merge aj deploy false. Rovnaký príkaz s prekladačom iba v `apps/crm/node_modules/typescript` exit 0 a cost `VERIFIED`. Nový beh CI tohto commitu sa sem nezapisuje ako zelený, kým `Lint, test, build` na novom SHA neskončí success a krok Playwright smoke nie je preskočený.

### #922 base `main` — tento commit spúšťa `Lint, test, build`

Stacked base `cursor/agentic-cost-routing-dd79` does not match the workflow’s `pull_request.branches: [main]`, so this commit exists to run `Lint, test, build`. Push na `1b579380` nespustil `CI - Revolis.AI`. `workflow_dispatch` z tohto prostredia vrátil HTTP 403. Trigger súboru sa nemení. Base #922 je po `edited` nastavená na `main` a až nasledujúci push je `synchronize`. Diff voči `main` obsahuje aj nadradené commity stacku. #918–#921 ostávajú na svojich bases. Memory Guard, Memory Engine, Vercel a Snyk nie sú required check. Preskočený `Preview — Playwright smoke` nie je prehliadačový PASS. Merge a deploy sa nerobia.
