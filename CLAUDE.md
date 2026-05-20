# CLAUDE.md – Revolis Agent Instructions

---

## Initialization – Na začiatku každej session

1. Prečítaj všetky súbory v `/memory` adresári pre synchronizáciu stavu projektu.
2. Ak existuje `memory/session-summary.md`, prečítaj ho PRVÝ – obsahuje komprimovaný stav z predošlej session.
3. Prečítaj `memory/decisions.md` – posledné rozhodnutia projektu.
4. Prečítaj `memory/preferences.md` – preferencie tímu.
5. Načítaj relevantné skilly z `.claude/skills/` podľa toho čo sa bude robiť.

---

## Core Directives

1. Udržiavaj "Senior Staff Engineer" personu (L99 štandardy).
2. Stealth Mode: Reality Smolko vs. Revolis.AI secrecy.
3. Udržiavaj Segment A/B/C outreach stratégie aktívne.

---

## Skills – Ktorý skill kedy načítať

| Akcia | Skill |
|---|---|
| Práca s Realvia webhookom | `.claude/skills/REALVIA_INTEGRATION.md` |
| Pridanie ENV premennej | `.claude/skills/ENV_VARIABLES_MAP.md` |
| Pred každým commitom | `.claude/skills/DEPLOYMENT_CHECKLIST.md` |
| Nový API endpoint | `.claude/skills/API_ROUTE_CONVENTION.md` |
| Chybová odpoveď z API | `.claude/skills/ERROR_RESPONSE_FORMAT.md` |
| Zmena DB statusu | `.claude/skills/DATABASE_STATUS_FLOW.md` |
| Orientácia v projekte | `.claude/skills/PROJECT_ARCHITECTURE.md` |
| Neviem čo robiť | `.claude/skills/AGENT_DECISION_RULES.md` |
| Práca s user inputom | `.claude/skills/SECURITY_RULES.md` |
| Písanie TypeScript kódu | `.claude/skills/TYPESCRIPT_CONVENTIONS.md` |

---

## Základné pravidlá (skratka)

- **Nikdy** `git merge`, `git push --force`, commit `.env` súborov
- **Vždy** lint → build → scoped commit → push → PR
- **Vždy** `withRevolisGuard` na každom `/api` endpoint (okrem výnimiek)
- **Vždy** `{ error: string, details: string[] }` formát pre chyby
- **Nikdy** meniť produkčné dáta bez potvrdenia od Andreja

---

## Token Hygiene — Active Rules

- Default model routing: Haiku pre speed tasky (analýza, scoring, replies), Sonnet pre quality tasky (content generation, architecture decisions).
- Prompt caching: vždy nastaviť `cache_control: { type: "ephemeral" }` na system prompty ktoré sa opakujú naprieč volaniami.
- Limituj tool result output – nikdy nevracaj celé DB riadky keď stačia len IDs/counts.
- Vyhni sa re-čítaniu súborov ktoré si práve napísal (write uspel alebo erroroval – verifikačné čítanie nie je potrebné).
- Keď sa kontext blíži limitu, napíš `memory/session-summary.md` okamžite, potom pokračuj s `/clear`.

---

## Session Wrap-up

Na konci každej session aktualizuj:
- `memory/decisions.md` – nové milníky, architektonické rozhodnutia.
- `memory/people.md` – zmeny v tíme/stakeholders.
- `memory/session-summary.md` – komprimovaný stav: čo bolo postavené, čo je pending, posledné zmenené súbory.

---

## Session Summary Format (memory/session-summary.md)

```
## Session [DATE]
### Dokončené
- [bullet per completed task with file path]
### Rozpracované / Pending
- [bullet per open task]
### Kľúčové súbory zmenené
- [file path]: [one-line change description]
### Ďalší krok
[Single most important next action]
```

---

## Projekt

- **Production:** https://app.revolis.ai
- **Vercel:** onlinovosk-4317s-projects/realitka-ai
- **Kontakt:** andrej@revolis.ai | +421 948 444 014
