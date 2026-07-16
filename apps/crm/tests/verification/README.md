# Verification suite — živá špecifikácia

Súbory `*.verification.test.ts` dokumentujú **očakávané produkčné správanie** po merge (flagy, gating, cron kontrakty, capability JSON). Nie sú múzeum — keď sa zmení sémantika v `src/`, musia sa aktualizovať v **tom istom PR**.

## Pravidlo pre agentov (swarm + L99)

Ak meníš správanie flagu, featury, gatingu alebo verejného kontraktu:

1. `rg -l "<kľúčové slovo>" tests/verification/` — nájdi dotknuté súbory.
2. Spusti `npx vitest run tests/verification/<súbor>.verification.test.ts`.
3. Uprav asserty v tom istom PR ako produkčná zmena.
4. Orchestrátor: agent nie je DONE, kým verification grep + testy nie sú v PR.

**Build Order workflow:** nový BO používa `docs/briefs/_BO-template.md` — sekcia „Verification map" musí odkazovať na súbory z `docs/briefs/verification-index.md`.

## Ochrana proti zastaranému `main`

`main` má branch protection: **Require branches to be up to date before merging** + required check `Lint, test, build` (vrátane **Playwright smoke** po build). PR postavený na starom `main` sa pred merge musí rebase-núť — sémantické konflikty sa ukážu v CI, nie po merge.

## Incidenty (2026-06)

| Príznak | Príčina |
|---------|---------|
| #160 bez allowlistu | merge zo zastaraného main |
| Stale `market-vision-capabilities.json` | paralelné vetvy bez rebase |
| `decision-flags.verification` fail | #170 zmenila opt-in, test ostal na kill-switch |
