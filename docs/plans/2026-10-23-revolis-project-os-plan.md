# Plán — Revolis Project OS (iba dokumenty)

Dátum plánu: 2026-10-23. Vetva: `cursor/revolis-project-os-d61a`. Základ: `origin/main` `a2e42ace`.

Tento súbor je plán pred písaním ostatných súborov. Mapa nižšie je záväzný zoznam ciest. Ďalšie súbory vzniknú až po `plan-lint`.

## Rozsah

Jedna logická zmena: dokumentácia Project OS pre Cursor, Claude Code a Grok. Žiadny aplikačný kód, žiadna zmena existujúcich inštrukcií, žiadny druhý prompt systém.

Presné cesty, ktoré plán povoľuje vytvoriť alebo doplniť:

1. `docs/plans/2026-10-23-revolis-project-os-plan.md` — tento plán (vzniká ako prvý).
2. `docs/reports/2026-10-23-revolis-project-os.md` — správa pre foundera. Mapa súborov v nej bude zapísaná pred súbormi 4–14.
3. `docs/architecture/MAPA.md` — jeden aditívny odkaz na `docs/project-os/README.md`. Súbor sa neprepisuje.
4. `docs/project-os/README.md` — register, čo Project OS je a čo nie je.
5. `docs/project-os/taxonomy.md` — taxonómia A–I, vylúčenia, pomenovanie konverzácií.
6. `docs/project-os/classification-and-handoff.md` — kam patrí úloha, ktorý existujúci skill alebo pravidlo, brány GO, čoho sa nedotýkať.
7. `docs/project-os/conversation-governance.md` — výber projektu pred väčšou úlohou; čo sa nesmie tvrdiť bez nástroja.
8. `docs/project-os/briefs/a-core-product.md`
9. `docs/project-os/briefs/b-engineering-agentic.md`
10. `docs/project-os/briefs/c-security-compliance.md`
11. `docs/project-os/briefs/d-marketing-sales.md`
12. `docs/project-os/briefs/e-integrations-operations.md`
13. `docs/project-os/briefs/f-releases-production.md` — oblasť F ako sekcia v repe, nie ako Cursor projekt.
14. `docs/project-os/briefs/g-onlinovo-excluded.md` — iba vylúčenie. Žiadna úprava Onlinovo kódu ani `docs/onlinovo/`.
15. `docs/project-os/briefs/h-business-administration.md` — stub, ak v repe nie je overený stav.
16. `docs/project-os/briefs/i-personal-research.md` — stub, záchytná oblasť.

Prečo `docs/project-os/` a nie existujúci domov: `docs/architecture/` drží ústavy a kontrakt a nemá sa z neho stať druhý systém pravidiel. `docs/briefs/` sú vykonávacie nočné briefy. `docs/plans/` je miesto pre tento jednorazový plán. `docs/security/` obsahuje len `AI_SECURITY.md`. `docs/ops/` sú runbooky. Jedna nová zložka je najmenší domov pre register, taxonómiu, workflow a deväť briefov.

## Znovupoužitie

Project OS len odkazuje. Autoritou ostávajú:

- `docs/architecture/cross-agent-engineering-contract.md`
- `AGENTS.md` a `.cursor/rules/revolis-cross-agent.mdc` (neupravovať)
- `CLAUDE.md`, `.cursor/rules/*.mdc`, `.claude/skills/*/SKILL.md`, `memory/working-agreement.md` (neupravovať)
- `docs/architecture/revolis-constitution-v2.md`
- `docs/architecture/engineering-constitution.md`
- `docs/architecture/engineering-os-revolis-rightsized.md`
- `docs/architecture/master-data-sourcing-map.md`
- `docs/architecture/clay-positioning-reframe.md`
- `docs/STATUS.md` a `memory/decisions.md` ako zdroje stavu a rozhodnutí (v tomto pláne sa nezapisujú)
- `memory/INDEX.md` a prvý záznam `memory/session-summary.md`
- existujúci Cursor projekt s názvom behu `Revolis Security Audits` pre oblasť C

Žiadny nový skill, hook, MCP ani prompt stack.

## Akceptačné kritériá

- `node scripts/ci/revolis-verify.mjs plan-lint docs/plans/2026-10-23-revolis-project-os-plan.md` skončí exit 0.
- Relatívne odkazy v nových súboroch `docs/project-os/` a v `docs/reports/2026-10-23-revolis-project-os.md` smerujú na existujúci súbor (kontrola skriptom, exit 0).
- `git diff origin/main -- AGENTS.md CLAUDE.md .cursor/rules .claude/skills memory/working-agreement.md docs/onlinovo packages/mcp-onlinovo` je prázdny.
- Oblasť F je v `docs/project-os/taxonomy.md` popísaná ako sekcia v repe. V správe je uvedené, že nástroj na založenie Cursor projektu tento beh nenašiel.
- Správa obsahuje tabuľku len pre behy, ktoré vrátil `list-cloud-agents` v tomto behu (117 záznamov, `totalMatched` 117).

## Riziká

- Klasifikácia podľa názvu bez tela konverzácie je nízka alebo stredná istota. Zle zaradený názov by zviedol foundera presunúť chat. Mitigácia: stĺpec istoty, akcia `review` pri nejasnom názve, žiadny presun nástrojom.
- Aditívny odkaz v `docs/architecture/MAPA.md` je jediný zásah do existujúceho indexu. Ak by pôsobil ako nové pravidlo, v PR sa vráti a odkaz ostane len v `docs/project-os/README.md`.
- `apps/crm/supabase/.branches/` je neuložený cudzí stav z checkoutu. Tento plán ho nepridáva, nemaže a nezaraďuje do rozsahu.
- Dokončovací verifikátor pre čistú dokumentáciu nemusí naplánovať test. Výsledok sa zapíše tak, ako ho nástroj vráti. Nie je to zelené CI.

## Brány

Kroky tohto plánu sú dokumentácia, commit a PR na revíziu. Nespúšťajú merge, nasadenie, migráciu, zápis do produkčnej databázy, zmenu tajomstiev, nový opakovaný náklad ani externé odoslanie.

Tie isté úkony ostávajú zakázané bez samostatného FOUNDER GO. Tento plán ich nepovoľuje a brány v `docs/architecture/cross-agent-engineering-contract.md` (sekcia Autorita) neoslabuje. Zelené CI merge neschvaľuje.

## Kroky

1. Zapísať tento plán vrátane mapy súborov.
2. Spustiť `node scripts/ci/revolis-verify.mjs plan-lint docs/plans/2026-10-23-revolis-project-os-plan.md`.
3. Zapísať `docs/reports/2026-10-23-revolis-project-os.md` s tou istou mapou skôr, než vzniknú súbory v `docs/project-os/`.
4. Doplniť register, taxonómiu, workflow, governance a briefy podľa mapy.
5. Do `docs/architecture/MAPA.md` pridať jeden odkaz na register.
6. Skontrolovať, že každý nový relatívny odkaz mieri na súbor na disku.
7. Spustiť `node scripts/ci/revolis-verify.mjs completion` so `--scope` obmedzeným na cesty z mapy a s `--run`.
8. Commitnúť iba súbory z mapy, pushnúť vetvu a otvoriť PR pripravený na revíziu.

## Mimo rozsahu

- Merge, nasadenie, zápis do produkčnej databázy, tajomstvá, nový platený nástroj, externá správa.
- Úprava `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `.claude/skills/`, `memory/working-agreement.md`, `memory/decisions.md`, `memory/session-summary.md`, `docs/STATUS.md`.
- Onlinovo, Shoptet, `docs/onlinovo/`, `packages/mcp-onlinovo/`.
- Mazanie konverzácií, súborov, projektov alebo histórie.
- Premenovanie chatov a zakladanie Cursor projektov (nástroj na to v tomto behu nie je overený).
- Presun ChatGPT konverzácií (žiadny nástroj ich v tomto behu nečítal).
- Nový prompt systém, skill alebo hook.
