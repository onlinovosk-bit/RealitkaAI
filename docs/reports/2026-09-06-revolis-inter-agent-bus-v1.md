# 2026-09-06 — REVOLIS Inter-Agent Bus v1.0

## Status

DONE — docs-only Phase 1 protocol.

## Objective

Premenit stackovy navrh REVOLIS AI inter-agent systemu na prvy prakticky copy-paste standard pre GPT/SOL <-> Claude Code.

## Constitution check

| Otazka | Verdikt |
|---|---|
| Zaplatil by za to dnesny klient? | Nepriamo: ano, ak to znizi chaos a chybovost dodavky pre existujuci produkt. |
| Skracuje cestu Lead -> Telefonat -> Obhliadka -> Zmluva -> Provizia? | Nepriamo: zrychluje engineering handoff, nie je to customer-facing feature. |
| Posilnuje moat/flywheel? | Ano, cez rozhodovaciu kontinuitu a reuse medzi agentmi. |
| Je spravny cas? | Ano pre Phase 1 manualny protokol; automatizacia by bola prilis skoro. |
| Minimalna komplexita? | Ano: jeden prompt dokument, ziadny runtime, DB, MCP ani orchestrator. |

## Decision

BUILD ako procesny/docs artefakt:

- vytvorit `REVOLIS INTER-AGENT BUS v1.0` ako manualny copy-paste bus,
- pouzit iba STACK 0, 2, 3, 4, 7,
- doplnit Execution Result a Decision Artifact, aby handoff nekoncil slovom "done",
- nezacinat Phase 2+ automatizaciu.

## Files changed

- `docs/prompts/revolis-inter-agent-bus-v1.md` — canonical protocol and copy-paste prompts.
- `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md` — this report.
- `memory/decisions.md` — decision memory entry.
- `memory/session-summary.md` — session handoff.

## Verification

Planned verification:

1. Markdown/protocol section grep for required Phase 1 sections.
2. Git diff review to confirm docs-only scope.
3. Kontrolor pass against scope, evidence, and Engineering Constitution justification.

## Known risks

- The protocol can become shelfware if it is not used on the next real GPT -> Claude Code handoff.
- If future work jumps directly to shared message store/MCP/orchestrator, it can recreate faster chaos.
- IDs are convention-based only in Phase 1; no machine validation exists yet.

## Non-goals

- No code implementation.
- No database/message store.
- No MCP integration.
- No cost governor.
- No autonomous orchestrator.

## Rollback

Revert this docs-only commit. No runtime, database, deploy, or customer data rollback required.
