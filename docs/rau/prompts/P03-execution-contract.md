---
id: P03
name: EXECUTION-CONTRACT
phase: DESIGN
reuses: [docs/prompts/runner/RUNNER.md, docs/architecture/agentic/agentic-system-blueprint-v1.0.md]
runs_in: [FAST, STANDARD, HARDENED]
mutates: false
---

# P03 — EXECUTION CONTRACT (most medzi tebou a AI tímom)

> **Po ľudsky**
> **Čo to je:** Jedna strana, ktorú schvaľuješ ty. Hovorí presne: čo sa urobí, čo sa
> **neurobí**, ako sa pozná „hotovo", koľko to smie stáť a kedy sa AI musí zastaviť.
> **Na čo to je:** Bez nej AI „vyrobí veľa práce, ktorá sa musí opravovať". S ňou
> schvaľuješ celú stenu naraz, nie desiatky malých otázok.
> **Čo potrebuje:** zvolenú možnosť z P02 (alebo priamo tvoje zadanie pri FAST úlohe).
> **Čo ti vráti:** kontrakt s jasnou bránou „schvaľujem / neschvaľujem" — a cieľový stav dôkazu.
> **Nepoužívaj, keď:** ešte nevieš, či to chceš — najprv P02.

## PROMPT

```text
ROLA: Engineering Manager + Release Manager. Píšeš kontrakt, nie kód.

Vyplň PRESNE tieto polia. Pole, ktoré nevieš doložiť, označ NEZNÁME — nevymýšľaj.

ID · PROJECT (z docs/rau/registry.json) · MODE (FAST|STANDARD|HARDENED; AUTONOMOUS len pre
typy operácií schválené v registry) · WALLS (z registry)
OBJECTIVE (1 veta, merateľná)
SCOPE (čo sa urobí) · NON-SCOPE (čo sa výslovne neurobí)
INPUTS · OUTPUTS · ACCEPTANCE CRITERIA (každé overiteľné príkazom alebo dôkazom)
CIEĽOVÝ STAV DÔKAZU: IMPLEMENTED | TESTED | VERIFIED | PRODUCTION | PRODUCTION VERIFIED
  — tieto stavy sú rôzne; nikdy ich nezamieňaj a nikdy netvrď vyšší, než máš dôkaz.
NEZÁVISLÝ OVEROVATEĽ (kto overí; nesmie to byť ten, kto implementuje)
TOOLS · PERMISSIONS (čo smie čítať/zapisovať; Tier 0–3 podľa Blueprintu §8)
BUDGET (čas, tokeny, €; ak sa to nemeria, napíš „NEMERANÉ")
TIMEBOX · RISKS (P0/P1/P2) · ROLLBACK
STOP CONDITIONS (kedy sa proces zastaví a čaká na foundera)
APPROVAL GATE (presné slovo foundera, ktoré odomyká exekúciu; merge a PROD sú vždy zvlášť)

Na začiatok daj FOUNDER BRIEF: max 12 riadkov — čo, prečo teraz, čo to stojí, čo sa môže
pokaziť, čo od teba potrebujem.

PRAVIDLÁ: Jedna logická zmena = jeden PR. Žiadne nové scope mimo kontraktu.
Kontrakt NEIMPLEMENTUJ — čakaj na approval.
```
