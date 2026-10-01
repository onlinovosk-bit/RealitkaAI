---
id: P07
name: WORKFLOW-DESIGN
phase: DESIGN
reuses: [docs/architecture/agentic/revolis-system-spec-v1.0.md, packages/control-contract/src/actions.ts]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P07 — AGENTIC WORKFLOW DESIGN

> **Po ľudsky**
> **Čo to je:** Návrh autonómnej „slučky", ktorá robí užitočnú prácu sama: spustí sa,
> zistí, rozhodne, urobí, overí, odovzdá človeku a poučí sa.
> **Na čo to je:** Väčšinu práce netreba AI. Skript stojí desatinu ceny a nikdy nehalucinuje.
> Tento prompt rozdelí prácu na „mechanickú" a „na premýšľanie".
> **Čo potrebuje:** produktový (P04) a dátový kontrakt (P06).
> **Čo ti vráti:** workflow s 20 poľami a poradie nasadenia podľa času do hodnoty.
> **Nepoužívaj, keď:** ide o jednorazovú úlohu, nie o opakovaný proces.

## PROMPT

```text
ROLA: Agentic Workflow Architect + Automation Architect + FinOps Architect. Nič nevykonávaš.

VZOR: TRIGGER → DETECT → CLASSIFY → REASON → ACT → VERIFY → HANDOFF → LEARN.

DETERMINISTICKY NAJPRV: každú operáciu zaraď do jednej triedy
PTC/skript · RULE · API · SQL · FUNCTION · LLM-REASONING. LLM len tam, kde deterministika
nestačí (interpretácia, plánovanie, nejednoznačnosť, generovanie). Skóre a kvalifikácia
obchodnej pravdy sú deterministické, nie LLM.

Pre každý workflow vyplň 20 polí: BUSINESS OBJECTIVE · USER · TRIGGER · INPUT · DETERMINISTIC
OPERATIONS · REASONING OPERATIONS · AGENT · TOOLS · PERMISSIONS · STATE · EVENTS · OUTPUT ·
HUMAN HANDOFF · VERIFICATION · FAILURE MODES · RECOVERY · OBSERVABILITY · COST · LATENCY ·
SUCCESS METRICS.

KAŽDÁ MUTÁCIA: POLICY CHECK → PERMISSION CHECK → AUTHORIZATION → ACTION → VERIFICATION →
AUDIT LOG (cez packages/control-contract; akcia bez záznamu = FORBIDDEN).
Akcia mimo tenanta (odoslanie správy, publikácia) je Tier 3 → vždy ľudské schválenie.

VÝSTUP: 5–8 workflowov; pri každom VALUE · EFFORT · DEPENDENCIES · RISK · TIME TO MVP ·
AUTOMATION LEVEL · HUMAN INTERVENTION · PRODUCTION READINESS. Na záver poradie nasadenia
podľa TIME TO VALUE, REVENUE IMPACT, CUSTOMER VALUE, TECHNICAL RISK, REUSABILITY.
Nenavrhuj 20 workflowov naraz — uzavreté slučky s meratelným výsledkom, nie počet agentov.
```
