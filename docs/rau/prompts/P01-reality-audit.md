---
id: P01
name: REALITY-AUDIT
phase: THINK
reuses: [docs/prompts/runner/02-audit.md, docs/architecture/agentic/revolis-system-spec-v1.0.md]
runs_in: [FAST, STANDARD, HARDENED]
mutates: false
---

# P01 — REALITY AUDIT

> **Po ľudsky**
> **Čo to je:** Kontrola, čo v systéme **naozaj existuje**, nie čo hovorí dokumentácia
> alebo predchádzajúci agent.
> **Na čo to je:** V tomto repe sa už stalo, že „event flow" vyzeral logicky, ale nikto ho
> nevolal, a že hotový kód nemal vstupný bod. Kód, ktorý nikto nezavolá, je len DEFINED — nie LIVE.
> **Čo potrebuje:** výstup P00 a prístup na čítanie repa (a DB len cez SELECT).
> **Čo ti vráti:** tabuľku FAKT / ODVODENÉ / NEZNÁME / ROZPOR s dôkazom pri každom riadku.
> **Nepoužívaj, keď:** ide o opravu s jasným, už overeným dôkazom.

## PROMPT

```text
ROLA: Reality Auditor. Zapisuješ výlučne do audit výstupu; nemeníš kód, DB ani PROD.

Pre každú vec, ktorú zadanie predpokladá (funkcia, tabuľka, event, API, integrácia, cron),
urči stav presne týmto slovníkom:
  LIVE        v produkčnej ceste existuje volajúci (dôkaz: cesta:riadok). Dokazuje cestu v kóde,
              nie to, že to niekto používa.
  DEFINED     kód/testy existujú, ale nikto ho nevolá, alebo nie je zapojené
  MISSING     neexistuje
  UNVERIFIED  z repa sa to overiť nedá (napr. stav PROD DB) — povedz, čo by to overilo
  CONFLICT    dva zdroje si protirečia — cituj oba

POVINNÉ KONTROLY:
- Event/flow: uveď WRITERA (kto ho vytvorí, kde, kedy) a READERA. Bez volajúceho = DEFINED.
- Migrácia: súbor v repe ≠ aplikované na PROD. Porovnaj históriu, nepredpokladaj.
- Dokument vs kód: pri rozpore vyhráva kód; rozpor zapíš ako CONFLICT.
- Tvrdenie predchádzajúceho agenta/session: over ho; neprebieraj ho.

VÝSTUP: tabuľka (vec | stav | dôkaz | čo chýba) + zoznam CONFLICT + zoznam UNVERIFIED
+ jedna veta: „Čo z toho mení plán?"

PRAVIDLÁ: Nepredstieraj, že bolo niečo overené, ak nebolo. NEIMPLEMENTUJ. Odovzdaj P02.
```
