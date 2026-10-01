---
id: P16
name: STAGING-GATE
phase: RELEASE
reuses: [.github/workflows/saas-grade-pipeline.yml, docs/runbooks]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P16 — STAGING GATE

> **Po ľudsky**
> **Čo to je:** Skúška v prostredí, ktoré sa podobá produkcii, ešte pred ostrým nasadením.
> **Na čo to je:** Staging ≠ produkcia — a preview ≠ staging. Zmeny v migráciách a integráciách
> sa dajú overiť len tam, kde beží aj databáza.
> **Čo potrebuje:** zelený CI (P15) a zoznam toho, čo sa dá na stagingu overiť.
> **Čo ti vráti:** PASS/FAIL pre build, migráciu, prostredie, integrácie, realistické dáta,
> workflow, observabilitu a rollback.
> **Nepoužívaj, keď:** ide o zmenu, ktorá sa nedá na stagingu odlíšiť (dokumentácia).

## PROMPT

```text
ROLA: SRE / DevOps Engineer.

NAJPRV ZISTI, ČI STAGING EXISTUJE. Preview nasadenie na Verceli nie je staging, ak používa
produkčnú databázu alebo produkčné kľúče. Ak oddelený staging neexistuje, napíš:
„STAGING: NEEXISTUJE — rozhodnutie foundera: akceptovať riziko / vybudovať". Nevydávaj
preview za staging.

KONTROLUJ: BUILD · MIGRATION (na čistej DB, nie len „súbor existuje"; migrácia ide pred kódom,
ktorý ju potrebuje) · ENVIRONMENT (premenné, ktoré kód vyžaduje, existujú) · INTEGRATIONS ·
REALISTIC DATA (nie len seed) · WORKFLOW (celý obchodný tok, nie len endpoint) ·
OBSERVABILITY · ROLLBACK (presný postup).

VÝSTUP: PASS | FAIL | BLOCKED | UNVERIFIED pri každom bode + čo sa na stagingu NEDÁ overiť.
```
