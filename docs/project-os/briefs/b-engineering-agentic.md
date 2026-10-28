# B — REVOLIS ENGINEERING & AGENTIC SYSTEMS

Misia: jeden spoločný spôsob práce pre Cursor, Claude Code a Grok. Merajú sa overené úlohy. Project OS je rozcestník k tomu spôsobu, nie jeho náhrada.

## Aktuálny stav z tohto behu

- [docs/architecture/cross-agent-engineering-contract.md](../../architecture/cross-agent-engineering-contract.md) je v1.0 z 2026-10-21. Sekcia 6 popisuje `AGENTS.md` a Cursor pravidlo ako doplnenie medzery pre Grok. Súbor [AGENTS.md](../../../AGENTS.md) v koreni je.
- Skilly prítomné vo výpise `.claude/skills/` 2026-10-23: `kontrolor`, `merge-gate`, `prod-migration`, `rau`, `revolis-review-plan`, `revolis-verify-completion`, `strategic-analysis`, `task-loop`, `wall-close`. `gdpr-advisor` v tom výpise nie je.
- Pravidlá Cursor: 13 súborov `.cursor/rules/*.mdc` (výpis glob v tomto behu). Kontrakt v sekcii 5 uvádza 12. Rozdiel som neauditoval súbor po súbore; počet 13 je z výpisu ciest.
- `node scripts/ci/revolis-verify.mjs` existuje (plan-lint tohto plánu skončil `PLAN OK`).
- API Cost Governor: súbor [packages/bus-core/src/cost-governor.ts](../../../packages/bus-core/src/cost-governor.ts) je na aktuálnom `main`. `git log -1` pre tento súbor vrátil `149074b9` so správou, ktorá uvádza `#847`. Rozhodnutie z 2026-10-15 v čase zápisu hovorilo o drafte. To sú dva časové rezy. CRM cesty rozhodnutie zámerne nepripája. P-MR v [l99-parked-concepts.md](../../architecture/l99-parked-concepts.md) ostáva zaparkovaný koncept plného routera.
- [docs/architecture/agentic-system-inventory.md](../../architecture/agentic-system-inventory.md) je discovery z 2026-09-29. Nie je to dnešný stav nasadenia zbernice.
- [engineering-os-revolis-rightsized.md](../../architecture/engineering-os-revolis-rightsized.md) hovorí, že sa nestavia 15-priečinková taxonómia. Project OS je jeden register vedľa toho dokumentu.

## Rozhodnutia

| Zápis | Cesta |
|---|---|
| 2026-10-21 Cross-agent engineering systém v1.0 (BUILD) | [memory/decisions.md](../../../memory/decisions.md) |
| 2026-10-21 GO STRUCTURE-FIRST-1 | ten istý súbor; čítanie pamäte ide cez [memory/INDEX.md](../../../memory/INDEX.md) |
| 2026-10-15 API Cost Governor v1 | ten istý súbor a [docs/reports/2026-10-15-api-cost-governor-v1.md](../../reports/2026-10-15-api-cost-governor-v1.md) |
| 2026-10-20 Prompt Coach len na „GO COACH" | [memory/decisions.md](../../../memory/decisions.md). `memory/working-agreement.md` som v tomto behu needitoval a celé nečítal. |

## Aktívne línie

- P1 v kontrakte §7 (identita nasadenia v `/api/healthz`, smerovanie modelov podľa ceny) je v kontrakte označené ako neurobené. V tomto behu som tie medzery znova nemeral.
- Project OS (táto zložka) je dokumentačná línia, nie runtime.

## Zdroje

- [apps/crm/docs/L99-master-prompt.md](../../../apps/crm/docs/L99-master-prompt.md)
- [docs/architecture/revolis-os-tooling-2026.md](../../architecture/revolis-os-tooling-2026.md) — rozhodnutie o nástrojoch z 2026-07-22
- [docs/architecture/agent-os-plan-2026-08-31.md](../../architecture/agent-os-plan-2026-08-31.md) — starší plán, nie aktuálny kontrakt
- [.claude/skills/rau/SKILL.md](../../../.claude/skills/rau/SKILL.md)

## Blokátory

Zlepšenie času a ceny kontrakt §8 zámerne netvrdí, kým nie je meranie. Tento brief ho netvrdí.

## Ďalší krok

Ďalšia inžinierska stena ide cez existujúci review-plan. Nový skill sa nezakladá, kým founder nepovie, ktorú medzeru z kontraktu §7 otvára.

## Hranice

Žiadny nový MCP, žiadne prepísanie skillov, žiadne tajomstvo v promptoch. Merge a nasadenie ostávajú na FOUNDER GO.
