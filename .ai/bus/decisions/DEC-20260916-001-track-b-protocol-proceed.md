---
id: DEC-20260916-001-track-b-protocol-proceed
type: decision
contract: REVOLIS_AGENT_CONTRACT_v0.1
status: done
owner: founder
created_at: 2026-09-16T20:50:00Z
items:
  - id: D1
    kind: DECISION
    decided_by: founder
    decides: "Track A / Track B split + Gate 0 protocol experiment"
    source: "chat:2026-09-16: founder poslal do Cowork session syntézu (autor textu: ChatGPT), ktorú odoslaním prevzal ako pokyn. Doslovne: \"CLAUDE — PROCEED.\" · \"Track A: Continue Wave 1 without scope expansion.\" · \"Track B: Create only the minimum executable protocol\" · \"Do not implement new infrastructure. Do not modify .mjs files. Do not create a new memory system. Do not create Learning Router. Do not create MCP adapters.\" · \"Then immediately VALIDATE the protocol using: TASK-RLS-ONBOARDING-SESSION\" · \"A protocol failure is a useful finding, not a reason to abandon Track B.\" · \"PR creation nech je explicitný Founder gate.\""
---

# DEC-20260916-001 — Track B: minimálny protokol + okamžitá validácia

Prepis founderovho pokynu podľa `REVOLIS_AGENT_CONTRACT_v0.1` §4. Bez parafrázy rozhodnutia.

- **Gates:** Gate 0 (Protocol) a Gate 1 (Infra) bežia paralelne. Gate 2 (Autonomous Loop) nasleduje po oboch, Gate 3 (Scale) až po Gate 2.
- **Kritériá Gate 0:** G0-1 až G0-5 v kontrakte.
- **Výsledok:** `docs/reports/2026-09-16-gate0-protocol-validation.md`.

**Nejednoznačnosť `source`:** text napísal ChatGPT, founder ho iba poslal. §4.2 takýto prípad
výslovne nerieši. Návrh na v0.2: „relayed text odoslaný founderom = founder source, s uvedením autora“.
