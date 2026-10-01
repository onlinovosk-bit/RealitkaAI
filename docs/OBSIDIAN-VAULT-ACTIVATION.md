# Obsidian Vault Activation

This repository has been prepared as an Obsidian vault root.

## Activation marker

- Vault metadata file: `.obsidian/app.json`
- Activation context: Ruflo swarm orchestration for Realvia L99 release gates

## Notes

- This is a repository-level activation marker only.
- Desktop Obsidian app login/workspace preferences remain user-local.


## Čo sa zrkadlí a čo nie

Vault má hodnotu nad **malou kurátorovanou množinou**. Nie je sklad 300+
pracovných papierov. Rozcestník grafu: [[docs/architecture/MAPA|Mapa]].
Rozhodnutia: [[memory/decisions|Rozhodnutia]]. Retrieval:
[[docs/architecture/brain-retrieval-contract|Brain retrieval contract]].

### Zrkadlí sa (čítanie / graf)

| Cesta | Prečo |
|---|---|
| `memory/decisions.md` | Jediný SoT rozhodnutí |
| `memory/*.md` | Session, open tasks, people — operačná pamäť |
| `brain/ENGINE.md` | Brain OS špecifikácia a brány |
| `brain/lessons/**` | Overené lekcie |
| `brain/audits/**` | Commitnuté týždenné audity (po aktivácii workflow) |
| `docs/architecture/adr-*.md` | ADR |
| `docs/architecture/antipatterns-log.md` | AP register |
| `docs/architecture/l99-parked-concepts.md` | Podmienky odparkovania |
| `docs/architecture/engineering-constitution.md` | Builder/Judge |
| `docs/architecture/revolis-constitution-v2.md` | Founder Reality Check |
| `docs/architecture/MAPA.md` | Rozcestník path-qualified `[[...]]` hrán |
| `docs/architecture/brain-retrieval-contract.md` | Ako hľadať v registri |
| `docs/audit/**` | Trvanlivé auditné nálezy |

### Nezrkadlí sa

| Cesta | Prečo |
|---|---|
| `docs/reports/**` | Ephemeral working papers (~3-day life) |
| `docs/briefs/**` (wholesale) | Pracovné briefy; v registri ostávajú len explicitne kurátorované build packages |
| `docs/prompts/**` (wholesale) | Kickoff texty; výnimky len kurátorované process roots |
| `RealitkaAI-Memory` | Swarm sem **nezapisuje** (founder 2026-09-04) |

### Ako sa vault plní

**Ručne, mimo swarmu.** Tento dokument definuje zrkadlenie; neautomatizuje sync.
Odkazy v mape sú **path-qualified** (`[[docs/architecture/...|label]]`), nie
kratké `[[INDEX]]` bez jednoznačného Markdown cieľa.
