# Swarm 4-vlny — stav aktivácie

**Aktivované:** 2026-07-31 22:26 UTC+2  
**Playbook:** `docs/briefs/overnight/2026-07-31-swarm-4-vlny.md`  
**Základ (štart):** `main` @ `c82c860` (feat billing #335)  
**Retry coordinator:** 2026-07-31 ~23:03 UTC+2 (predchádzajúci beh: ENOTFOUND)

## Vlna 1 — dokončená (merge)

| PR | Branch | Titulok | Stav | Merged (UTC) | URL |
|---|---|---|---|---|---|
| **#336** | `swarm/w1a-simireal-optout` | fix(sales): Simi Real opt-out | **MERGED** | 2026-07-31T20:56:03Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/336 |
| **#337** | `swarm/w1b-identity-fix` | fix(brain): correct ONLINOVO IČO in COMPANY.md | **MERGED** | 2026-07-31T20:56:21Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/337 |
| **#338** | `swarm/w1c-valuation-estimates` | feat(valuation): persist estimate previews to valuation_estimates | **MERGED** | 2026-07-31T20:56:32Z | https://github.com/onlinovosk-bit/RealitkaAI/pull/338 |

**`main` po Vlne 1:** `cf1b4ef4e` — obsahuje #338 (posledný merge v sérii).

**Remote vetvy:** všetky tri `swarm/w1*` už na `origin` (retry: fetch OK, push nebol potrebný).

**CI / merge:** Vlna 1 bola zlúčená pred retry behom; retry overil stav cez `gh pr list` / `gh pr view` — žiadna ďalšia merge akcia.

## Ruflo infra

| Položka | Hodnota |
|---|---|
| MCP swarm ID | `swarm-1785529408671-j4vxvt` |
| CLI swarm ID | `swarm-ms9e7sb0` |
| Topológia | hierarchical, max 8 agentov |
| Session | `overnight-4-vlny-2026-07-31` |
| Hooks | `.claude/settings.json` + 9 hookov (standard template) |
| Write-probe | commit `b1a999c86` na `test/write-probe-swarm4vlny` |

## Agenti (Vlna 1)

| Agent ID | Branch | Commit (lokálne ref) | Vlastnené cesty |
|---|---|---|---|
| `w1a-simireal-optout` | `swarm/w1a-simireal-optout` | `92d7ee16f` | automation/n8n, call-list |
| `w1b-identity-fix` | `swarm/w1b-identity-fix` | `641417e89` | brain/identity/ |
| `w1c-valuation-estimates` | `swarm/w1c-valuation-estimates` | `254cde8a0` | migrations, estimate route, lib/valuation |

## Tasky

| Task ID | Vlna | Stav |
|---|---|---|
| `task-1785529541571-0g159y` | 1A | **done** (#336 merged) |
| `task-1785529540815-ebh73a` | 1B | **done** (#337 merged) |
| `task-1785529541208-n6bn7t` | 1C | **done** (#338 merged) |
| `task-1785529545852-qcr48p` | 2B | **ready** (odblokované po V1) |
| `task-1785529545862-9ilte6` | 2A | **ready** |
| `task-1785529546512-52gc2j` | 3A | blocked (DAG) |
| `task-1785529546987-4kxrjs` | 4A+4B | blocked (DAG) |

## Vlny 2–4

Vlna 2 môže štartovať podľa playbooku. Vlny 3–4 stále blocked na merge predchádzajúcej vlny.

## Hive-mind

Hive ID `hive-1785529619368` — historický bloker: Claude Code CLI not in PATH. Vlna 1 doručená cez PR #336–#338.

## Ďalší krok

1. Spusti **Vlnu 2** podľa playbooku.
2. Ráno: `docs/briefs/overnight/2026-07-31-swarm-verifikacia.md`.
3. Simi Real opt-out (#336) — **merged**.

## Pravidlá

- Žiadny deploy, prod migrácia, prod DELETE, email send.
- Test agency only — nie Smolkov owner účet.
- Jeden agent = jedna branch = vlastnené adresáre.
