# Klasifikácia úlohy a odovzdanie

Spoločný postup pre Cursor, Claude Code a Grok. Obchodnú hodnotu úlohy určuje founder. Tento postup určuje domov, existujúci nástroj a bránu.

## Postup

1. Pomenuj primárny cieľ jednou vetou.
2. Zaradiť ho podľa [taxonomy.md](taxonomy.md). Pri zmiešanom cieli nechaj posúdenie.
3. Otvor brief oblasti a pracuj z odkazov v ňom. Pravidlá nekopíruj do nového promptu.
4. Pred netriviálnou zmenou použi [.claude/skills/revolis-review-plan/SKILL.md](../../.claude/skills/revolis-review-plan/SKILL.md) a `node scripts/ci/revolis-verify.mjs plan-lint`.
5. Pred tvrdením, že je hotovo, použi [.claude/skills/revolis-verify-completion/SKILL.md](../../.claude/skills/revolis-verify-completion/SKILL.md).
6. Výstup s hodnotou zapíš do `docs/reports/YYYY-MM-DD-nazov.md` ([l99-repo-is-comms-channel.mdc](../../.cursor/rules/l99-repo-is-comms-channel.mdc)).
7. Merge, LIVE nasadenie, zápis do produkčnej databázy, tajomstvá, nový opakovaný náklad a externé odoslanie čakajú na samostatné FOUNDER GO. Zelené CI ich neschvaľuje ([kontrakt, Autorita](../architecture/cross-agent-engineering-contract.md)).

## Kam čo patrí

| Oblasť | Kam v repe | Existujúci skill alebo pravidlo | Súhlas foundera |
|---|---|---|---|
| A Core product | [brief A](briefs/a-core-product.md) | [Ústava v2](../architecture/revolis-constitution-v2.md), [data-sourcing map](../architecture/master-data-sourcing-map.md), [pozicionovanie](../architecture/clay-positioning-reframe.md) | Nová produktová funkcia ide cez Reality Check. BUILD/BACKLOG sa zapisuje do `memory/decisions.md` až ako súčasť tej steny, nie z tohto rozcestníka. |
| B Engineering | [brief B](briefs/b-engineering-agentic.md) | [kontrakt](../architecture/cross-agent-engineering-contract.md), [review-plan](../../.claude/skills/revolis-review-plan/SKILL.md), [verify-completion](../../.claude/skills/revolis-verify-completion/SKILL.md), [kontrolor](../../.claude/skills/kontrolor/SKILL.md), [task-loop](../../.claude/skills/task-loop/SKILL.md), [strategic-analysis](../../.claude/skills/strategic-analysis/SKILL.md) | Nový MCP, nový opakovaný náklad a prepísanie skillov sú mimo bežnej úlohy. |
| C Security | existujúci projekt Revolis Security Audits + [brief C](briefs/c-security-compliance.md) | [kontrolor](../../.claude/skills/kontrolor/SKILL.md), [prod-migration](../../.claude/skills/prod-migration/SKILL.md) pri DDL, [AI_SECURITY.md](../security/AI_SECURITY.md) ako historická politika | Read-only audit áno. Náprava v produkcii, tajomstvo a migrácia len na GO. |
| D Marketing a predaj | [brief D](briefs/d-marketing-sales.md) | [pozicionovanie](../architecture/clay-positioning-reframe.md), [prime directive](../../.cursor/rules/l99-prime-directive.mdc) | Externá správa a odoslanie kampane len na GO. |
| E Integrácie | [brief E](briefs/e-integrations-operations.md) | [data-sourcing map](../architecture/master-data-sourcing-map.md), [REALVIA_ONBOARDING.md](../REALVIA_ONBOARDING.md), [memory/integrations.md](../../memory/integrations.md) | Kľúče, súhlas referenčného klienta a zápis do cudzieho systému len na GO. |
| F Vydania | sekcia, [brief F](briefs/f-releases-production.md) | [l99-golden-rule.mdc](../../.cursor/rules/l99-golden-rule.mdc), [merge-gate](../../.claude/skills/merge-gate/SKILL.md), [wall-close](../../.claude/skills/wall-close/SKILL.md) | Merge a nasadenie len na GO, a až keď je CI na aktuálnom heade zelené. |
| G Onlinovo | [brief G](briefs/g-onlinovo-excluded.md) | žiadny nové. Existujúce súbory sa z Revolis úlohy neotvárajú na zápis | Úloha, ktorej cieľ je Onlinovo, sa v tomto repe nerobí. |
| H Administratíva | [stub H](briefs/h-business-administration.md) | žiadny overený | Citlivé osobné veci sa nezakladajú v briefoch. |
| I Výskum | [stub I](briefs/i-personal-research.md) | [rau](../../.claude/skills/rau/SKILL.md) len keď ide o nové founder zadanie v Revolis zmysle; inak nič | Rovnaké brány, ak z výskumu vznikne zmena v repe. |

## Čoho sa úloha nedotýka, kým to cieľ výslovne nie je

- `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `.claude/skills/`, `memory/working-agreement.md`
- `docs/onlinovo/`, `packages/mcp-onlinovo/`, kód Shoptet
- produkčná databáza, Vercel env, Stripe Live, tajomstvá
- cudzie neuložené zmeny v worktree
- históriu v `memory/decisions.md` a `memory/session-summary.md` (len PREPEND na konci steny, ktorá tie súbory má v zadaní)

## Odovzdanie medzi nástrojmi

Claude Code, Cursor aj Grok čítajú ten istý kontrakt. Grok ide cez [AGENTS.md](../../AGENTS.md). Cursor ide cez [.cursor/rules/revolis-cross-agent.mdc](../../.cursor/rules/revolis-cross-agent.mdc). Nový súbor s pravidlami pre jeden nástroj sa nezakladá.

Handoff v správe obsahuje: oblasť, primárny cieľ, súbory, čo je overené príkazom, čo je BLOCKED alebo NOT_VERIFIED, a ktorá brána čaká na foundera. Telo cudzej konverzácie sa do handoffu neprepisuje.
