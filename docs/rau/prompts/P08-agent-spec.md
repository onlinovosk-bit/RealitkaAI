---
id: P08
name: AGENT-SPEC
phase: DESIGN
reuses: [docs/architecture/agentic/agentic-system-blueprint-v1.0.md, packages/control-contract/src/agent.ts, apps/crm/src/lib/agents/agent-specs.ts]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P08 — AGENT SPECIFICATION

> **Po ľudsky**
> **Čo to je:** „Pracovná zmluva" pre jedného AI agenta: čo je jeho misia, čo smie, čo
> **nesmie** a kedy musí zavolať človeka.
> **Na čo to je:** Pri autonómii je dôležitejšie „čo nesmie" než „čo má robiť". Dnes žiadny
> produktový agent Revolisu nemá takúto zmluvu (system spec §21).
> **Čo potrebuje:** workflow (P07), v ktorom je agent nevyhnutný.
> **Čo ti vráti:** Agent Spec podľa Blueprintu §3 L1 + DO-NOT-DO, limity a formát odovzdania.
> **Nepoužívaj, keď:** úlohu zvládne skript — agent nie je potrebný.

## PROMPT

```text
ROLA: Agentic Workflow Architect. Agent Spec je nadradený promptu; prompt v sebe nesmie
skrývať bezpečnostné predpoklady, ktoré v spec nie sú.

Vyplň: AGENT-ID (napr. REVOLIS-…) · VERSION · MISSION · INPUTS · OUTPUTS · TOOLS ·
ALLOWED ACTIONS · FORBIDDEN ACTIONS (DO-NOT-DO — povinné, nie prázdne) · DECISION RIGHTS ·
TIER každej akcie (0 informačná, 1 vratná, 2 materiálna, 3 nevratná/vysoké riziko) ·
MEMORY POLICY · APPROVAL POLICY · FAILURE POLICY · ESCALATION CONDITIONS · COST LIMIT ·
TIME LIMIT · SUCCESS CRITERIA · EVAL SUITE (aj na ZAKÁZANÉ správanie) · HANDOFF FORMAT
(TASK, STATUS, CHANGES, EVIDENCE, TESTS, CHECKS NOT RUN, RISKS, BLOCKERS, NEXT ACTION).

REGISTER: nový agent sa zapisuje do existujúceho apps/crm/src/lib/agents/agent-specs.ts
(testom stráži drift) — nevytváraj druhý register. Najprv over, ktorí agenti tam už sú.

PRAVIDLÁ:
- Agent nikdy nie je autorita: nerozširuje vlastné oprávnenia, nevypína bezpečnostné prvky,
  nemení governance.
- Pamäť nie je automaticky pravda: odvodenie agenta sa ticho nestáva záznamom o fakte.
- Limit, ktorý sa nemeria, nie je limit. Ak model/cost nie sú zaznamenané, napíš NEMERANÉ.
```
