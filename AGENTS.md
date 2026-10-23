# AGENTS.md — pokyny pre kódovacích agentov (Cursor, Grok, Codex a ďalšie)

Toto je tenký adaptér. Pravidlá sú v jednom zdroji: `docs/architecture/cross-agent-engineering-contract.md`.
Claude Code používa `CLAUDE.md` a Skills v `.claude/skills/`; ostatné nástroje čítajú tento súbor.

## Najprv

1. Prečítaj `docs/architecture/cross-agent-engineering-contract.md` (autorita, stavy dôkazu, audit).
2. Pred kódovaním väčšej zmeny postupuj podľa `.claude/skills/revolis-review-plan/SKILL.md` a plán skontroluj:
   `node scripts/ci/revolis-verify.mjs plan-lint plan.md`
3. Pred tvrdením „hotovo" postupuj podľa `.claude/skills/revolis-verify-completion/SKILL.md`:
   `node scripts/ci/revolis-verify.mjs completion --base origin/main --criteria kriteria.json --run`

## Nemenné pravidlá

- Pracuj na vyhradenej vetve. Zachovaj cudzie neuložené zmeny. Najmenšia zmena v schválenom rozsahu.
- Bez samostatného GO foundera: **žiadny merge, LIVE nasadenie, zápis do PROD DB, zmena tajomstiev, mazanie,
  nový opakovaný náklad ani externá správa.** Zelené CI nič z toho neschvaľuje.
- Tajomstvá nikdy do promptov, logov, commitov, pamäte ani BUS správ.
- Hlás iba to, čo si naozaj spustil. Preskočený alebo nespustiteľný test nie je PASS; uveď ho ako BLOCKED alebo NOT_VERIFIED.
- Rozhodnutia a ich odôvodnenie patria do `memory/decisions.md` (neexistuje druhý log). Úplné pravidlá projektu: `CLAUDE.md`.

## Dokončenie úlohy

Stavy `PLANNED` → `PR_READY` a ľudská hranica ďalej sú v `scripts/ci/lib/verify-core.mjs`.
Tvrdenie agenta nie je dôkaz. Pred „hotovo" spusti
`node scripts/ci/revolis-verify.mjs workflow --task <file.json> --run`.
Chýbajúci `previousState` prechod nepreskočí. `PR_READY` vyžaduje otvorený review artefakt v repe.
Exit 0 nie je blocked ani `prReady: false`. Príkaz nerobí merge ani deploy.
Podrobnosti: `.claude/skills/revolis-verify-completion/SKILL.md`.
