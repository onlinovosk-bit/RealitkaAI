# F — REVOLIS RELEASES & PRODUCTION

Toto je **sekcia v repe**, nie Cursor projekt. Nástroj, ktorý by projekt založil a potvrdil, v tomto behu nebol (pozri [conversation-governance.md](../conversation-governance.md)). Kým taký dôkaz nie je, vydania ostávajú tu.

Misia: pripravenosť vydania, CI, blokátory, rollback, incidenty, dôkaz po nasadení.

## Aktuálny stav z tohto behu

- CI workflow [`.github/workflows/saas-grade-pipeline.yml`](../../../.github/workflows/saas-grade-pipeline.yml) existuje. Beh tohto pipeline som nespúšťal a zelené CI netvrdím.
- [l99-golden-rule.mdc](../../../.cursor/rules/l99-golden-rule.mdc) vyžaduje zelené CI, smoke a aktuálny `main` pred mergom. Samotný merge aj tak čaká na FOUNDER GO ([kontrakt](../../architecture/cross-agent-engineering-contract.md)).
- Kontrakt §5 a §7: `/api/healthz` v čase auditu kontraktu (2026-10-21) vracal statické `{ok:true}` bez SHA. V tomto behu som endpoint nevolal. Medzera je záznam kontraktu, nie dnešná sonda.
- Checklisty v strome CRM, existenciu súboru som overil, obsah nie: [release-quality-gate.md](../../../apps/crm/docs/release-quality-gate.md), [go-live-checklist.md](../../../apps/crm/docs/go-live-checklist.md), [rollback-command-set-predeploy.md](../../../apps/crm/docs/rollback-command-set-predeploy.md).
- Aktuálny `main` v tomto worktree po `git fetch origin main`: `a2e42ace`. To je základ vetvy Project OS, nie dôkaz produkčného nasadenia.

## Rozhodnutia

2026-10-20 „PREFLIGHT AUDIT + CRON-TRUTH-01" v [memory/decisions.md](../../../memory/decisions.md) (hlavička v prvej dvadsiatke). Telo som nečítal. Nepreberám z neho verdikt.

SESSION v [STATUS.md](../../STATUS.md) pri míľniku 7 výslovne hovorí, že CI na heade tej steny nebolo merané a že produkcia odhlásenia čaká na GO.

## Aktívne línie

Žiadne vydanie tento brief neotvára. Klasifikácia chatov s názvom o CI a Vercel je v správe, s istotou podľa názvu.

## Zdroje

- [.claude/skills/merge-gate/SKILL.md](../../../.claude/skills/merge-gate/SKILL.md)
- [.claude/skills/wall-close/SKILL.md](../../../.claude/skills/wall-close/SKILL.md)
- [docs/AUTOMERGE-POLICY.md](../../AUTOMERGE-POLICY.md) — súbor existuje vo výpise `docs/`. Obsah som nečítal. Nie je povolenie na merge.

## Blokátory

Merge a nasadenie sú brány foundera. Chýbajúca cena Stripe a čakajúca migrácia odhlásenia sú produktové a bezpečnostné brány popísané v briefoch A a C. Tu sa neopakujú ako nové fakty.

## Ďalší krok

Keď bude nástroj vedieť založiť projekt a vznik sa dá overiť, founder rozhodne, či sa z tejto sekcie stane projekt. Dovtedy sa práca na vydaní značí oblasťou F a ostáva v repe.

## Hranice

Žiadny deploy, žiadny merge, žiadny zásah do Vercel nastavení. Preview deploy pre dokumentáciu nespúšťam a netvrdím.
