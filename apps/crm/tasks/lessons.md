# Revolis.AI — Lessons Learned
> BC-3: Self-Improvement Loop. Tento súbor spravuje Orchestrator Agent.
> Po každej korekcii → zápis tu. Cieľ: 0 opakovaných chýb po 3 výskytoch.

---

## Formát záznamu

```
## Lesson {YYYY-MM-DD} — {one-line title}
**Mistake:** [čo bolo spravené zle]
**Root cause:** [prečo sa to stalo]
**Rule:** [konkrétne pravidlo na prevenciu]
**Agent:** [ktorý agent vlastní túto lekciu]
```

---

## Záznamy

### Lesson 2026-05-06 — Sumár práce vynechal Boris Cherny nasadenie

**Mistake:** Prvý sumár dnešnej práce vynechal explicitnú zmienku o nasadení špecialistu Boris Cherny a jeho 8 disciplín (PART 26 v MASTER_PROMPT_V3.md), napriek tomu že to bol jeden z kľúčových commitov dňa (`2f07168`).

**Root cause:** Sumár bol generovaný z git log subject lines bez dôslednej kontroly čo je v `docs/MASTER_PROMPT_V3.md`. Commit s textom "Boris Cherny Engineering Discipline (8 standards)" bol prítomný, ale výstup ho nezahŕňal ako kľúčový míľnik.

**Rule:** Pri generovaní sumáru práce — explicitne vymenovať každý commit, ktorý obsahuje slová "specialist", "špecialist", "agent", "prompt", "discipline", "standards" ako samostatný bod, nie ho zlúčiť do "docs/arch" kategórie.

**Agent:** Orchestrator (Revolis CRM / Cline)

---

### Lesson 2026-05-06 — tasks/todo.md a tasks/lessons.md chýbali fyzicky

**Mistake:** `MASTER_PROMPT_V3.md` odkazoval na `tasks/todo.md` a `tasks/lessons.md` (BC-1, BC-3), ale tieto súbory neboli nikdy fyzicky vytvorené v repozitári.

**Root cause:** Prompt architektúra bola navrhnutá ako dokument, ale implementačný krok (vytvorenie fyzických súborov) nebol zahrnutý do žiadneho commitu.

**Rule:** Každý nový súbor, na ktorý odkazuje `MASTER_PROMPT_V3.md` alebo `docs/progress.md`, musí byť fyzicky vytvorený v tom istom PR/commite ako dokument, ktorý naň odkazuje.

**Agent:** Engineering [A4] + Orchestrator

---
