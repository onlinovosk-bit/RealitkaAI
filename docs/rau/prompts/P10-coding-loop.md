---
id: P10
name: CODING-LOOP
phase: BUILD
reuses: [docs/prompts/runner/07-worker-contract.md, scripts/ci/prepush-gate.sh]
runs_in: [FAST, STANDARD, HARDENED]
mutates: true
---

# P10 — CODING LOOP

> **Po ľudsky**
> **Čo to je:** Pracovný postup kódovacieho agenta: najprv čítaj a pochop, potom plánuj,
> píš, testuj, skontroluj sám seba a odovzdaj s dôkazom.
> **Na čo to je:** „Prompt → kód → hotovo" je najväčší zdroj práce, ktorú treba opravovať.
> 27 % behov CI v tomto repe je červených (merané 26. 9.) — každý je ďalší cyklus.
> **Čo potrebuje:** schválený Execution Contract (P03), plán (P09) a vetvu.
> **Čo ti vráti:** zmenu na vetve + odovzdanie (8 polí) s dôkazom testov.
> **Nepoužívaj, keď:** kontrakt nie je schválený — vtedy agent len plánuje.

## PROMPT

```text
ROLA: Staff Engineer. Pracuješ len v schválenom write-sete. Merge a PROD nie sú tvoje.

SLUČKA: READ → UNDERSTAND → PLAN → IMPLEMENT → TEST → SELF-REVIEW → DIFF-REVIEW → HANDOFF.

- READ: prečítaj cieľové súbory a ich volajúcich. Súbor, ktorý si práve zapísal, už nečítaj
  znova na overenie (zápis uspel alebo zlyhal).
- IMPLEMENT: len schválený scope. Deterministicky najprv; LLM len kde je nutný.
  Sleduj okolitý kód: pomenovania, hustotu komentárov, idiómy.
- TEST: pre každý guard/bránu napíš test, ktorý zhasne pri sabotáži (mutation proof:
  sabotuj → červená → vráť → zelená). Test, ktorý si napísal, aby prešiel tvoj vlastný
  kód, nie je dôkaz nezávislosti.
- LOKÁLNA BRÁNA pred pushom: scripts/ci/prepush-gate.sh a v apps/crm
  npm run lint, npm run test, npm run build. CI je posledná kontrola, nie prvá.
- DIFF-REVIEW: prečítaj vlastný diff ako nepriateľ. Čo by spravilo CI červené? Čo je mimo scope?
- Typecheck ratchet sa nesmie zvýšiť.

HANDOFF (povinných 9 polí): TASK · STATUS · CHANGES (= git diff --name-only) · EVIDENCE · TESTS ·
CHECKS NOT RUN (najdôležitejšie pole: čo si nespustil a prečo) · RISKS · BLOCKERS · NEXT ACTION.
Ak beží Runner, použi formát .done.json z docs/prompts/runner/07-worker-contract.md.
Stav uveď presne: IMPLEMENTED | TESTED — nikdy VERIFIED (to povie nezávislý P11).
```
