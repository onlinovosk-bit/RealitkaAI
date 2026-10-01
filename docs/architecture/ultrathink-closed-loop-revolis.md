---
title: "Ultrathink Closed-Loop — Revolis Flow"
project: Revolis.AI
type: process-reference
status: living-document
created: 2026-06-18
tags: [revolis, closed-loop, decision-process, kontrolor, constitution]
related:
  - "[[kontrolor-SKILL]]"
  - "[[revolis-constitution-v2]]"
  - "[[antipatterns-log]]"
  - "[[strategic-analysis-SKILL]]"
---

# ULTRATHINK CLOSED-LOOP — Revolis Flow

> Referenčný proces pre väčšie rozhodnutia. NIE systém na postavenie — je to
> POSTUPNOSŤ, ktorú už väčšinou máš v existujúcich nástrojoch. Tento dokument
> mapuje 10 fáz na to, čo reálne používaš, aby si pri veľkom rozhodnutí (integrácia,
> migrácia, smer produktu) prešiel celý cyklus, nie len časť.

## 10 FÁZ → kde to v Revolise UŽ JE

| Fáza | Čo robí | Tvoj nástroj |
|---|---|---|
| 1. Context Collector | zbieraj kontext PRED rozmýšľaním (git, dáta, dokumentácia) | git status/diff, real schema, dokumentácia |
| 2. Reality Validator | je to FAKT alebo predpoklad? aký dôkaz? | **Kontrolór** bod 1–2 |
| 3. Weakness Finder | nájdi konkrétnu slabinu, nie vágnu | **strategic-analysis** fáza 1 |
| 4. Root Cause | príčina, nie symptóm (napr. 42P10, nie "audit nejde") | **Kontrolór** + incident šablóna |
| 5. Opportunity Gen | viac variantov, nie jeden | strategic-analysis fáza 2 |
| 6. Decision Engine | rozhodni s tradeoffmi, biznis brána | **Ústava** (12 otázok, veto) |
| 7. Execution Planner | rozbi na kroky, 1 PR = 1 zmena, rollback | brief + Zlaté pravidlo |
| 8. Autonomous Exec | implementuj na vetvu, commit | Cursor/swarm (done = artefakt!) |
| 9. Verification | dokáž, že problém zmizol (nie "agent povedal") | merge gate + CI + RLS + GUARD + re-smoke |
| 10. Learning | zapíš poznatok, aby ďalšie rozhodnutie bolo lepšie | decisions.md + antipatterns-log |

## KĽÚČOVÉ PRAVIDLO CELÉHO CYKLU
**Nikdy nepreskakuj fázu 1–2 (kontext + reality) a fázu 9–10 (verifikácia + učenie).**
Väčšina chýb v tomto projekte vznikla preskočením práve týchto:
- Preskočená fáza 2 → AP-005 (predpoklad ako fakt, "API vráti históriu").
- Preskočená fáza 4 → liečenie symptómu namiesto príčiny.
- Preskočená fáza 9 → AP-001/AP-009/AP-010 (fikcia, text namiesto artefaktu, tichý fail).
- Preskočená fáza 10 → tá istá chyba dvakrát.

## META VRSTVA (pri veľkých rozhodnutiach)
Pred fázou 6 (rozhodnutie) zapni Kontrolór meta-režimy:
- Devil's Advocate (dokáž, že sa mýlime)
- Future Regret (oľutujeme to o 6 mesiacov?)
- Architecture Drift (poškodzuje to štruktúru?)

## ČO TENTO DOKUMENT NIE JE
Nie je to návod postaviť Intent Engine, Simulation Engine, Meta-Orchestrator ani
Engineering Genome. Tie sú odložené (roadmapa: viac zákazníkov + čas). Toto je len
mapa, ako prejsť celý rozhodovací cyklus nástrojmi, ktoré UŽ máš — aby si pri
dôležitom rozhodnutí neostal v polovici (analýza bez verifikácie, alebo exekúcia
bez kontextu).
