# Agent Prompting Štandard — Revolis.AI

## 5 povinných častí každého promptu

Chýba čo i len jedna → agent robí chyby alebo sa pýta.

### 1. ROLA & KONTEXT
Kto je agent, v akom prostredí pracuje, čo vie.

```
Si [backend/frontend/QA/DevOps] developer na projekte Revolis.AI.
Stack: Next.js (App Router) + TypeScript + Tailwind CSS + Supabase + Stripe
Pravidlá projektu: pozri CLAUDE.md
[voliteľné: "Pokračuj kde sme skončili: docs/progress.md"]
```

### 2. PRESNÁ ÚLOHA
Jedna konkrétna úloha. Čím konkrétnejšie, tým lepší výsledok.

```
[Čo implementovať, kde, aký výstup očakávať]
[Odkaz na existujúci vzor ak existuje — napr. src/api/users.ts]
```

### 3. OHRANIČENIA & PRAVIDLÁ
Čo agent nesmie urobiť.

```
NIKDY: nemeň existujúce DB migrácie
NIKDY: neodkomentovávaj testy
VŽDY: použi existujúci vzor
VŽDY: error format { error, message, code }
```

### 4. VERIFIKÁCIA
Ako agent overí, že jeho práca je správna. Toto je najvýkonnejšia časť.

```
Po dokončení spusti:
1. npm run lint
2. npm run build
Ak zlyhá → oprav → spusti znova.
Odovzdaj AŽ keď sú všetky zelené.
```

### 5. VÝSTUP & ODOVZDANIE
Čo presne má agent produkovať na konci.

```
STAV: HOTOVO / PROBLÉM: [popis]
HOTOVO:
- [čo si implementoval — max 5 odrážok]
SÚBORY:
- [cesta/k/suboru.ts — čo sa zmenilo]
SUMAR DO DOCS: ulož tento sumar do docs/progress.md
```

---

## Tímová šablóna — skopíruj a vyplň

```markdown
## 1. ROLA & KONTEXT
Si [backend/frontend/QA/DevOps] developer na projekte Revolis.AI.
Stack: Next.js + TypeScript + Tailwind CSS + Supabase + Stripe
Pravidlá projektu: pozri CLAUDE.md

## 2. ÚLOHA
[Jedna konkrétna úloha. Buď špecifický.]
[Čo implementovať, kde, aký výstup očakávať.]
[Odkaz na existujúci vzor ak existuje.]

## 3. OHRANIČENIA
NIKDY: [čo agent nesmie robiť / meniť]
NIKDY: [druhé obmedzenie]
VŽDY: [povinný štandard]
VŽDY: [povinný vzor]

## 4. VERIFIKÁCIA
Po dokončení spusti:
1. npm run lint
2. npm run build
Ak zlyhá → oprav → spusti znova. Odovzdaj AŽ keď sú všetky zelené.

## 5. VÝSTUP
STAV: HOTOVO / PROBLÉM: [popis]
HOTOVO: - [max 5 odrážok]
SÚBORY: - [cesta — čo sa zmenilo]
SUMAR DO DOCS: ulož do docs/progress.md
```

---

## 7 Špecializovaných Agentov

Orchestrátor zapája agentov podľa príslušnosti úlohy. Poradie pre komplexné úlohy:

| # | Agent | Kedy spustiť |
|---|---|---|
| 1 | Architekt | Pred každou veľkou zmenou — analýza bez kódu |
| 2 | Refactor Loop | Podľa plánu architekta — krok za krokom |
| 3 | Bug Hunter | Po refaktore — async, API, state, error handling |
| 4 | Performance Optimizer | Po bug hunteri — re-renders, queries, caching |
| 5 | Clean Code Pass | Naming, dead code, readability |
| 6 | Test Coverage Creator | Core logic, edge cases, API flows |
| 7 | Autonomous Loop | Posledný — necháš bežať |

### AGENT 1 — ARCHITEKT REŽIM

```
Your task is to act as a world-class software architect.
1) Analyze the ENTIRE repository first. Read as much code as needed before changing anything.
2) Infer the current architecture, patterns, and design decisions.
3) Identify architectural weaknesses, tight coupling, duplication, poor module boundaries, naming problems, and scalability risks.
4) Propose a new target architecture that a top 1% engineer in 2026 would design for this project.
5) Create a detailed, step-by-step refactor plan divided into small safe steps.
DO NOT change code yet.
Output only:
- Current architecture summary
- Problems list (prioritized)
- Target architecture
- Step-by-step refactor plan
```

### AGENT 2 — AUTONOMOUS REFACTOR LOOP

```
Follow the previously created refactor plan.
Rules:
- Work step by step.
- After each step, re-read affected files to ensure consistency.
- Preserve functionality.
- Improve naming, structure, and separation of concerns.
- Remove duplication.
- Split large files into logical modules.
- Use existing project patterns where possible, improve them where necessary.
After each completed step:
- Briefly explain what was changed and why.
- Continue automatically to the next step.
Do not ask questions.
Continue until the entire refactor plan is completed.
```

### AGENT 3 — BUG HUNTER MODE

```
Now switch to bug hunting mode.
Task:
- Analyze the entire repository for potential bugs, edge cases, race conditions, unhandled states, unsafe assumptions, and silent failure points.
- Focus especially on async logic, API handling, state management, and error handling.
Fix every issue you find.
For each fix:
- Show the problem
- Show the fix
- Apply the fix
Continue until no more issues can be found.
```

### AGENT 4 — PERFORMANCE OPTIMIZER

```
Switch to performance optimization mode.
Task:
- Identify performance bottlenecks in the project.
- Detect unnecessary re-renders, redundant computations, heavy queries, inefficient loops, large payloads, and bad caching patterns.
Optimize them while preserving behavior.
For each optimization:
- Explain why it was slow
- Apply the optimization
Continue until no significant improvements remain.
```

### AGENT 5 — SENIOR CLEAN CODE PASS

```
Act as a senior engineer obsessed with clean code.
Task:
- Improve naming across the project (variables, functions, files).
- Standardize patterns.
- Remove dead code.
- Simplify complex logic.
- Improve readability everywhere.
Do not change behavior. Only improve clarity and quality.
Continue until the codebase feels like it was written by a single top-tier engineer.
```

### AGENT 6 — TEST COVERAGE CREATOR

```
Analyze the entire project and identify critical logic that lacks tests.
Create meaningful tests for:
- Core business logic
- Edge cases
- Failure scenarios
- API flows
Organize tests cleanly.
Continue until the most important parts of the system are covered.
```

### AGENT 7 — 1000× AUTONOMOUS IMPROVEMENT LOOP

```
From now on, your only goal is to continuously improve this project.
Rules:
- Never ask questions.
- Always find the next thing that can be improved in architecture, code quality, performance, safety, or readability.
- Make the improvement.
- Re-evaluate the project.
- Repeat.
Continue this loop until I stop you.
```

---

## 6 anti-vzorov

| Anti-vzor | Dôsledok | Riešenie |
|---|---|---|
| Vague Task — "urob to lepšie" | Claude optimalizuje čo chce | Konkrétny výsledok + merateľné kritérium |
| Kitchen Sink — príliš veľa naraz | Zanesený kontext, polovičné výsledky | Jedna úloha = jeden agent |
| Chýbajúce ohraničenia | Agent mení súbory ktoré nesmie | Explicitný zoznam NIKDY/VŽDY |
| Bez verifikácie | Ty si jediný QA | Konkrétny príkaz na testy |
| Opravovanie 2× v tej istej session | Kontext plný zlyhaní | Po 2. oprave: /clear + nový prompt |
| Bez tímového štandardu | Každý iná kvalita kódu | Táto šablóna pre všetkých |

## 6 pravidiel tímového štandardu

1. **Jedna úloha = jeden agent** — rozbi komplexný task na podúlohy
2. **QA agent má vždy čistý kontext** — /clear pred každým review
3. **CLAUDE.md = zákon pre všetkých** — aktualizujte tímovo, nie individuálne
4. **Verifikácia je povinná** — každý prompt musí mať konkrétny príkaz na overenie
5. **Sumar pred /clear — vždy** — ukladaj do docs/progress.md pred každým /clear
6. **Tímová šablóna = povinný formát** — odchýlky schvaľuje tím lead

---

*Verzia 1.0 · Revolis.AI · ONLINOVO s.r.o. · Aktualizuj keď tím nájde nové vzory alebo anti-vzory.*
