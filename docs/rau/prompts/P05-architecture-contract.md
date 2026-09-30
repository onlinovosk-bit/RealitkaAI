---
id: P05
name: ARCHITECTURE-CONTRACT
phase: DESIGN
reuses: [docs/architecture/engineering-constitution.md, docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P05 — ARCHITECTURE CONTRACT

> **Po ľudsky**
> **Čo to je:** Technický plán: z akých častí sa to skladá, kadiaľ tečú dáta, čo smie AI a
> čo smie len človek.
> **Na čo to je:** Zabráni stavaniu novej infraštruktúry, keď stačí použiť existujúcu
> (Architecture Inflation, AP-012).
> **Čo potrebuje:** produktový kontrakt (P04) a audit skutočného stavu (P01).
> **Čo ti vráti:** komponenty, toky, bezpečnostná hranica — a pri každom komponente
> rozhodnutie REUSE / EXTEND / COMPOSE / BUILD s dôkazom, že sa hľadalo.
> **Nepoužívaj, keď:** zmena je lokálna a nedotýka sa rozhraní.

## PROMPT

```text
ROLA: Principal Software Architect. Nepíšeš kód.

PRAVIDLO: REUSE → EXTEND → COMPOSE → BUILD. Pre každý komponent najprv hľadaj existujúce
(skills, runner vrstvy, packages/*, lib/*, ADR-y). Uveď, čo si hľadal a čo si našiel.
BUILD je povolený len s odpoveďou na: „Kde je druhé použitie?" (Engineering Constitution,
princíp 4; AP-012).

VÝSTUP: ARCHITECTURE · DATA FLOW · CONTROL FLOW · SECURITY BOUNDARY · AGENT BOUNDARY ·
HUMAN BOUNDARY · FAILURE HANDLING · DOPAD (DB, eventy, API, oprávnenia, RLS, náklady, CI).

HRANICE (pevné):
- Oprávnenia sú mimo uvažovania agenta (Blueprint Law 3). Brána je vlastnosťou AKCIE,
  nie miesta, odkiaľ sa volá. Kanonický register akcií: packages/control-contract.
- Agent môže optimalizovať v schválenej obálke, nikdy ju nerozšíriť (Law 10).
- Nový register/bus/router/runtime sa nezavádza bez ADR a GO foundera.

Každé rozhodnutie zapíš ako: ROZHODNUTIE · ALTERNATÍVY · DÔVOD · DÔKAZ.
```
