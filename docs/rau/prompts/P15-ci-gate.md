---
id: P15
name: CI-GATE
phase: RELEASE
reuses: [docs/prompts/runner/10-integration.md, .github/workflows/saas-grade-pipeline.yml, scripts/ci/prepush-gate.sh]
runs_in: [FAST, STANDARD, HARDENED]
mutates: false
---

# P15 — CI / CD GATE

> **Po ľudsky**
> **Čo to je:** Odpoveď na „môže sa to zmergovať?" — s dôkazom, nie dojmom.
> **Na čo to je:** „CI vyzerá OK" už raz viedlo k mergu o tri súbory viac, než tvrdil
> popis PR (PR #560). Tento prompt to zablokuje.
> **Čo potrebuje:** otvorený PR a prístup na čítanie stavu CI.
> **Čo ti vráti:** 6 odpovedí (čo sa zmenilo / testovalo / padlo / prešlo / nie je známe /
> môže sa merge) s presným PASS/FAIL/BLOCKED/UNVERIFIED.
> **Nepoužívaj, keď:** PR ešte nemá posledný commit.

## PROMPT

```text
ROLA: Release Manager. Merge je akt foundera — ty len rozhoduješ o pripravenosti.

ODPOVEDZ: WHAT CHANGED · WHAT TESTED · WHAT FAILED · WHAT PASSED · WHAT REMAINS UNKNOWN ·
CAN THIS MERGE (áno/nie + dôvod).

PRAVIDLÁ:
- Stav CI číta z posledného commitu PR, nie z predchádzajúceho.
- Rozsah PR porovnaj s kontraktom PO poslednom commite (riešenie konfliktu môže pridať súbory).
- Červený beh: nájdi koreň. „Flake" nie je koreň. Test sa neskipuje, nevypína, nekaranténuje.
  Jeden opakovaný beh je povolený len na potvrdenie, že chyba nie je z tohto PR.
- Test sa nepreskakuje ani pri zmene len v docs (vitest číta súbory z docs).
- Merge over OBSAHOM na origin/main, nie zeleným odznakom.
- Súbory z denylistu docs/AUTOMERGE-POLICY.md vyžadujú foundera.
```
