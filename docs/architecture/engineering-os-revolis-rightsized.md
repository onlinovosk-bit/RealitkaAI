---
title: "Engineering OS — Revolis Right-Sized"
project: Revolis.AI
type: governance
status: living-document
created: 2026-06-16
tags: [revolis, engineering-os, triage, constitution, right-sizing]
related:
  - "[[revolis-constitution-v2]]"
  - "[[kontrolor-SKILL]]"
  - "[[master-data-sourcing-map]]"
---

# ENGINEERING OS — Revolis Right-Sized

> Princíp: Engineering OS je správna FILOZOFIA (chyba → pravidlo, rozhodnutie →
> znalosť, úspech → vzor). Ale 15-levelový dokument popisuje OS pre 100-inžiniersku
> firmu. Revolis = 1 founder + AI + 1 klient. Adoptuj to, čo už máš alebo stojí
> hodiny s reálnou hodnotou. Odlož to, čo je trofej veľkej firmy — s podmienkou,
> čo ho odomkne. Nestrácaj 90 dní na OS namiesto klientov 2–10.

## TRIÁŽ VŠETKÝCH 15 LEVELOV

| Level | Stav | Kde to je / podmienka odomknutia |
|---|---|---|
| **L0 Constitution** | ✅ MÁM | `revolis-constitution-v2.md`, `CLAUDE.md`, `.cursor/rules/l99-*` |
| **L1 Knowledge Brain** | ✅ MÁM (light) | Obsidian vault = repo; `docs/architecture`, `docs/audit`, `docs/briefs`, `/memory`. Elaborátnu 15-priečinkovú taxonómiu NEROB — máš dosť. |
| **L2 Agent Organization (40 agentov)** | ⛔ DEFER | Cargo cult pri 1 klientovi. Máš virtuálnu squad. Odomkne: keď objem práce vyžiada delenie rolí (reálne 5+ paralelných oblastí). |
| **L3 Decision Engine (ADR)** | ✅ ADOPT NOW | Máš `decisions.md`; pridaj ľahkú ADR šablónu (nižšie). Lacné, reálna hodnota. |
| **L4 Development Pipeline** | ✅ MÁM (light) | brief → build → test → PR → merge. 11-stupňový pipeline je ťažký; tvoj brief-flow je right-sized verzia. |
| **L5 AI Pipeline** | ✅ MÁM (čiastočne) | Kontrolór = reviewer/security/QA gate; swarm = planner/architect/implementer. Nepreformalizuj. |
| **L6 Quality Gates** | ✅ MÁM | merge gate (`l99-golden-rule`), CI, RLS testy, GUARD, Kontrolór. Pokrýva podstatu z 8 gateov. |
| **L7 Checklists** | ✅ ADOPT-LIGHT | Seeduj 2 reálne (API, migrácia/RLS) z tvojich incidentov. Lacné. |
| **L8 Pattern Library** | 🟡 BACKLOG | Rastie organicky. Odomkne: keď sa vzor 2.+ raz zopakuje, zapíš ho. Nestavaj vopred. |
| **L9 AntiPattern Library** | ✅ ADOPT NOW | NAJVYŠŠIA hodnota. Seedované z reálnych chýb tohto projektu → `antipatterns-log.md`. Kŕmi Kontrolóra. |
| **L10 Metrics (DORA)** | ⛔ DEFER | Zlé metriky pre túto fázu. Deployment frequency neoptimalizuj pri 1 klientovi. Metrika, čo teraz ráta: klienti + tok dát. Odomkne: tím + objem. |
| **L11 Incident Learning** | ✅ MÁM (light) | `docs/audit`, `decisions.md`. Pridaj ľahkú incident→pravidlo šablónu (nižšie). |
| **L12 Autonomous Engineering** | ✅ MÁM (čiastočne) | Swarm to už robí. Netreba „stavať". |
| **L13 Continuous Improvement** | ✅ ADOPT-LIGHT | Cez mesačnú moat revíziu (už v Ústave) + incident→pravidlo. Elaborátny denný loop NEROB. |
| **L14 Founder Dashboard** | 🟡 right-sized inak | Eng-metriky DEFER. Užitočný dashboard pre teba = stav klientov/dát (tečú dáta? ďalšia akcia?) = CEO Command rutina (Brief 13). Už staviaš správnu verziu. |
| **L15 Wisdom Vault** | ✅ EMERGUJE | repo + decisions + ADR + antipatterns v čase. Nestavaj vopred — akumuluje sa. |

## ČO REÁLNE ADOPTOVAŤ TERAZ (hodiny, nie 90 dní)
1. **ADR šablóna** (L3) — viď príloha A. Praktika "nerozhoduj dvakrát".
2. **AntiPattern log** (L9) — `antipatterns-log.md`, seedovaný reálnymi chybami.
3. **2 checklisty** (L7) — API + migrácia/RLS, z tvojich incidentov.
4. **Incident→pravidlo šablóna** (L11) — viď príloha B.
Všetko ostatné = MÁM, BACKLOG (s podmienkou), alebo DEFER (cargo cult teraz).

## ČO NEROBIŤ TERAZ (a prečo)
- 40-agentová org — nemáš objem práce, čo by ju potreboval.
- DORA metrics dashboard — optimalizuje zlú vec pri 1 klientovi.
- 90-dňová roadmapa OS — oportunitný náklad = klienti 2–10. Ústava veto.
- Elaborátna Obsidian taxonómia, Pattern Library vopred, Wisdom Vault vopred —
  emergujú, nestavajú sa dopredu.

---

## PRÍLOHA A — ADR šablóna (ľahká)
Ulož ADR do `docs/adr/ADR-NNN-nazov.md`. Jeden súbor = jedno rozhodnutie.
```
# ADR-NNN: [Názov rozhodnutia]
Dátum: YYYY-MM-DD | Stav: navrhnuté / prijaté / nahradené ADR-XXX
## Problém
[Čo riešime, prečo teraz]
## Možnosti
[Option A / B / C + tradeoffs]
## Rozhodnutie
[Čo sme zvolili]
## Dôsledky
[Čo to znamená, čo sme tým zatvorili/otvorili]
```

## PRÍLOHA B — Incident→pravidlo šablóna (ľahká)
Ulož do `docs/audit/incident-NNN.md`. Cieľ: nikdy tá istá chyba dvakrát.
```
# Incident-NNN: [Čo sa stalo]
Dátum: YYYY-MM-DD
## Čo sa stalo
## Root cause (prečo, nie len čo)
## Fix
## Nové pravidlo / nový Kontrolór check / nový antipattern
```
