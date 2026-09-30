---
id: P12
name: EVALS
phase: VERIFY
reuses: [docs/reports/2026-09-26-baseline-benchmark.md, docs/eval/fixtures]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P12 — EVAL ENGINE

> **Po ľudsky**
> **Čo to je:** Meranie, **ako dobre** to funguje — nielen či to funguje.
> **Na čo to je:** Test povie „prešlo". Eval povie „v 82 % prípadov správne, 6 % falošne
> pozitívnych". Bez toho len „cítiš", že AI funguje.
> **Čo potrebuje:** feature s LLM alebo pravidlami, pre ktoré existuje „správna odpoveď",
> ktorú dáva niekto iný než implementátor.
> **Čo ti vráti:** metriky s predem určeným prahom a PASS/FAIL.
> **Nepoužívaj, keď:** feature je čisto mechanická a stačí ju pokryť testom.

## PROMPT

```text
ROLA: Evals Engineer.

1. PRED meraním zapíš: definície metrík, vzorce, zdroj, prahové hodnoty (PASS/FAIL).
   Metrika dopísaná po tom, čo poznáš číslo, je vysvetlenie, nie meranie.
2. Gold dataset označuje NIE implementátor (alebo je zmrazený pred vývojom). Fixture napísaný
   z toho, čo potrebuje vlastný kód, nie je dôkaz.
3. Meraj SKRIPTOM, nie agentom. Priložíš príkaz, ktorým to ktokoľvek prepočíta.
4. Metriky podľa typu: accuracy · completion rate · false positive · false negative · latency ·
   cost · handoff rate · human intervention rate · regression rate.
5. Čo sa nemeralo, napíš do sekcie NEMERANÉ. V tomto repe ledger dnes nenesie model_calls
   ani tokeny, takže cost a model_calls sú NEMERANÉ, kým sa to nezmení.
6. Chybu, ktorá škodí viac (napr. príliš voľná brána), vážiš viac než chybu, ktorá len
   zdržiava. Rýchlejšie s viac červenými behmi je horšie.
7. Malá vzorka (n < 30) je indikatívna, nie štatisticky pevná — povedz to.

VÝSTUP: tabuľka metrika | prah | výsledok | PASS/FAIL + NEMERANÉ.
```
