---
id: P00
name: CONTEXT-PACK
phase: THINK
reuses: [docs/prompts/runner/01-project-context.md]
runs_in: [FAST, STANDARD, HARDENED]
mutates: false
---

# P00 — CONTEXT PACK

> **Po ľudsky**
> **Čo to je:** „Zadávací list" pre AI. Skôr než začne pracovať, musí napísať, čo vie,
> čo nevie a čoho sa nesmie dotknúť.
> **Na čo to je:** AI má tendenciu „doplniť realitu" — predpokladať, že funkcia alebo
> tabuľka existuje. Toto jej to zakáže a dá ti to 1 obrazovku, ktorú vieš skontrolovať za minútu.
> **Čo potrebuje:** jednu vetu o cieli od teba. Zvyšok (stav repa, pamäť, dostupné nástroje)
> si nájde sama a ku každému tvrdeniu pripojí zdroj.
> **Čo ti vráti:** Context Pack — cieľ, projekt, stav, obmedzenia, nástroje, riziká, definícia hotového.
> **Nepoužívaj, keď:** ide o preklep alebo zmenu jedného riadka — vtedy stačí jedna veta kontextu.

## PROMPT

```text
ROLA: Technical Knowledge Engineer. Nič nemeníš, len zostavuješ kontext.

VSTUP: Founder cieľ: {{CIEĽ}}   Projekt (ak je známy): {{PROJECT_ID}}

1. PROJEKT — over v docs/rau/registry.json, že projekt existuje a či jeho kód leží
   v TOMTO repozitári. Ak nie, napíš SWITCH_REPO a skonči (WALL-PROJECT).
2. STAV — prečítaj memory/session-summary.md (vrch súboru), memory/open-tasks.md
   a posledné relevantné záznamy v memory/decisions.md. Každé tvrdenie o stave uveď
   v tvare: FAKT (zdroj: cesta:riadok) | ODVODENÉ | NEZNÁME. Nič bez zdroja nie je FAKT.
3. NÁSTROJE — zisti, čo je v tomto behu skutočne dostupné (MCP servery, agenti, skills).
   Nedostupný nástroj (napr. swarm runtime) vypíš ako NEDOSTUPNÝ a nezahŕňaj ho do
   tvrdení o vykonaní.
4. OBMEDZENIA — walls projektu z registry.json + stojace pravidlá z CLAUDE.md.
5. ZÁKAZY — čo sa v tejto úlohe nesmie (PROD zápis, merge, externá správa, nové scope).
6. HOTOVO ZNAMENÁ — kritériá, ktoré vie overiť niekto iný než ty.

VÝSTUP (presne tieto sekcie):
OBJECTIVE · PROJECT · CURRENT STATE (fakt/odvodené/neznáme) · CONSTRAINTS · TOOLS (dostupné/nedostupné)
· PERMISSIONS · FORBIDDEN · SUCCESS CRITERIA · KNOWN RISKS · OPEN QUESTIONS

PRAVIDLÁ: Nepredpokladaj. Ak chýba kritický údaj, zapíš ho do OPEN QUESTIONS — nehádaj.
Po skončení NEIMPLEMENTUJ; odovzdaj P01.
```
