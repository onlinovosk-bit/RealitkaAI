---
id: DEC-20260917-002-operating-mode-b
type: decision
status: done
owner: founder
created_at: 2026-09-17T08:55:00+02:00
decided_by: founder
source: "chat:2026-09-17: \"Rozhodol som sa pre riešenie B. GO na riešenie B.\" · odpovede founder na otázky: Executor = \"Claude Cowork (cloud) (Recommended)\" · Orchestrátor = \"Pozastaviť (Recommended)\" · Nočná vlna = \"Vypnúť (Recommended)\""
scope:
  repo_paths:
    - docs/prompts/multi-agent-protocol-v0/06-operating-mode-b.md
    - docs/prompts/multi-agent-protocol-v0/README.md
  external_systems:
    - claude-scheduled-task:trig_01LnCAgnpBZQK46Lth1mDLhV
evidence:
  commands:
    - "update_trigger trig_01LnCAgnpBZQK46Lth1mDLhV enabled=false -> response enabled:false, updated_at 2026-09-17T06:51:04Z"
  files:
    - docs/prompts/multi-agent-protocol-v0/06-operating-mode-b.md
  urls: []
next_action:
  gate: GO REQUIRED
  description: "Founder pridá onlinovosk-bit/RealitkaAI do authorized sources Cowork session; potom prvý task v režime B s metrikou founder_relays."
---

# DEC-20260917-002 — Operating mode B

| rozhodnutie | stav |
|---|---|
| Režim spolupráce | **B** — jeden executor + subagenti; ChatGPT a Grok iba ako poradcovia cez founderovo rozhodnutie |
| Executor | **Claude Cowork (cloud)** |
| Land `tc-orchestrator` | **pozastavený** (patche `chore/land-tc-orchestrator`, `chore/tc-orchestrator-contract-fixes` zostávajú nelandované) |
| Nočná vlna (runner, 22:00) | **vypnutá** 2026-09-17 06:51 UTC, dá sa zapnúť |

Pravidlá a tok: `docs/prompts/multi-agent-protocol-v0/06-operating-mode-b.md`.
