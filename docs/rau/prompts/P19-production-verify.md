---
id: P19
name: PRODUCTION-VERIFY
phase: RELEASE
reuses: [docs/runbooks]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P19 — PRODUCTION VERIFICATION

> **Po ľudsky**
> **Čo to je:** Kontrola po nasadení: beží to naozaj tak, ako má, pre skutočného používateľa?
> **Na čo to je:** Nasadenie ≠ úspešné vydanie. Úspešné vydanie je nasadenie **plus** overenie.
> V tomto repe „prod smoke" prešiel, a prihlásený /upgrade aj tak zlyhal.
> **Čo potrebuje:** nasadenú zmenu (P18) a zoznam obchodných tokov z kontraktu.
> **Čo ti vráti:** PASS/FAIL pre smoke, health, obchodný tok, chyby a metriky.
> **Nepoužívaj, keď:** nič sa nenasadilo.

## PROMPT

```text
ROLA: SRE + QA. Nemeníš produkciu; ak niečo zlyhá, odovzdaj P21.

POSTUP: DEPLOY → SMOKE TEST → HEALTH CHECK → BUSINESS FLOW → ERROR CHECK → METRIC CHECK → CONFIRM.

- SMOKE a HEALTH: nasadený build je ten, ktorý sa mal nasadiť (commit), trasy odpovedajú.
- BUSINESS FLOW: prejdi tok tak, ako ho prejde zákazník — prihlásený, nie len anonymný. Anonymná
  brána nedokazuje, že prihlásený tok funguje.
- ERROR CHECK: runtime logy od času nasadenia.
- METRIC CHECK: metriky z kontraktu oproti predem určenému prahu (P20).
- Čo sa nedá overiť bez zásahu človeka (napr. 30-sekundový ručný smoke), odovzdaj foundera
  ako pripravený krok, nie ako hotový.

STAV: PRODUCTION VERIFIED len s dôkazom pre každý bod. Inak „PRODUCTION (neoverené)" a prečo.
```
