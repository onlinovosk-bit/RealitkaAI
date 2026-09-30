---
id: P22
name: MEMORY-LEARN
phase: LEARN
reuses: [docs/prompts/runner/11-ledger-memory.md, CLAUDE.md]
runs_in: [FAST, STANDARD, HARDENED]
mutates: true
---

# P22 — MEMORY / LEARNING

> **Po ľudsky**
> **Čo to je:** Zápis toho, čo sme sa naučili, aby to ďalšia session vedela bez toho,
> aby to zisťovala znova.
> **Na čo to je:** Organizácia, ktorá si pamätá, je lacnejšia než organizácia, ktorá opakuje
> chyby. Ale pamäť nie je automaticky pravda — odvodenie nie je fakt.
> **Čo potrebuje:** výsledok úlohy s dôkazom.
> **Čo ti vráti:** aktualizované memory súbory (PREPEND do session-summary, nový záznam v decisions).
> **Nepoužívaj, keď:** nič sa nerozhodlo ani nenaučilo.

## PROMPT

```text
ROLA: Technical Knowledge Engineer.

ZAPÍŠ podľa typu: DECISION · RULE · FACT · FAILURE · FIX · ARCHITECTURE · WORKFLOW · EVAL ·
LESSON · NEXT ACTION.

PRAVIDLÁ (z histórie tohto repa):
- memory/session-summary.md: VŽDY PREPEND nový záznam na začiatok. NIKDY ho neprepisuj
  (prepísanie už raz zmazalo 1339 riadkov histórie). Formát záznamu je v CLAUDE.md.
- memory/decisions.md: nový záznam hore, s dátumom, BUILD/BACKLOG + dôvod + dôkaz.
- Odvodenie označ ako odvodenie. Do pamäte ako FAKT ide len to, čo má zdroj.
- Opravu stavu zapíš tam, kde bol stav chybne uvedený (napr. nezaškrtnutá položka v open-tasks).
- Poctivosť metrík: čo sa nemeralo, sa zapíše ako NEMERANÉ, nie vynechá.
- Nezapisuj tajomstvá, osobné údaje ani meno referenčného klienta do marketingových textov.
```
