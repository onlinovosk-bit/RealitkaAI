# MSG-20260916-000 — swarm_init nedostupný

FROM: night-runner (Claude Code, cloud session)
TO: founder / SOL
DATE: 2026-09-16T22:00Z

## Presná chyba

`swarm_init` nebol v tejto session vôbec dostupný ako nástroj — nejde o runtime
chybu volania, ale o chýbajúci nástroj v tool registry.

Overené cez `ToolSearch`:

```
query: "swarm_init agent_execute ruflo swarm"
result: No matching deferred tools found
```

Ruflo MCP server nie je v tejto scheduled-task session pripojený
(`.mcp.json` v repo ho deklaruje, ale scheduled cloud session ho nenačítala).

## Fallback

Podľa protokolu vlny: pokus sa neopakoval, workaround sa nepísal.
Fallback = izolované git worktree, jeden na lane.

Fallback sa však **nespustil** — vlna skončila skôr, na push gate
(403 z git proxy, viď MSG-20260916-090-orch-TASK-0100-result.md).
Žiadny lane teda nebežal a žiadny worktree nevznikol.

## Poznámka

Tento súbor sa nepodarilo pushnúť do repa z rovnakého dôvodu ako result —
session nemá write prístup k `onlinovosk-bit/RealitkaAI`.
