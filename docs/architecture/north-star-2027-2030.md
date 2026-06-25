# North Star 2027–2030 (r4)

> Revolis buduje systém, ktorý sa s každou novou kanceláriou stáva inteligentnejším pre všetky ostatné — bez porušenia ich súkromia. Ak to feature nerobí, nie je to moat.

## Loops

| Loop | Názov | Stav (2026-06) | Meranie |
|------|-------|------------------|---------|
| **1** | **Revenue** | Staviame | Follow-up Agent (draft-only), % leadov kontaktovaných do 24h, konverzia pipeline |
| **2** | **Learning** | Substrát žije | `decisions` (Prediction Registry), `exclusivity_outcomes` (Genome), closed-loop KPI |
| **3** | **Network** | Smer | Knowledge Monopoly medzi kanceláriami — **nemožný pred zákazníkom #2** |
| **4** | **Evolution** | Smer | Genome Factory — auto-deploy len za Guardian 5/5 + human approval |

## Genome Test (gate pre BUILD)

Feature sa stavia len ak má **30-dňové KPI pre zákazníka A** a zapisuje výsledok do Genome (Loop 2).

Ak feature neposúva Loop 1 alebo nezapisuje do Loop 2 → **VALIDATE** alebo **BACKLOG**, nie BUILD.

## Čo Revolis nie je

- Generic AI chat pre realitky
- Horizontal CRM s „AI features“
- Automatické odosielanie bez human-in-the-loop (Follow-up = draft-only)

## Referencie

- Ústava: `docs/architecture/revolis-constitution-v2.md`
- Parked concepts: `docs/architecture/l99-parked-concepts.md`
- Overnight Brief 10: `docs/briefs/overnight/overnight-master-brief-10-loop1-genome.md`
