---
id: P04
name: PRODUCT-CONTRACT
phase: DESIGN
reuses: [docs/architecture/revolis-constitution-v2.md, docs/architecture/clay-positioning-reframe.md]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P04 — PRODUCT CONTRACT

> **Po ľudsky**
> **Čo to je:** Odpoveď na otázku „čo presne budujeme, pre koho a čo z toho má zákazník".
> **Na čo to je:** „Postav AI workflow" nie je zadanie. Bez jasného používateľa, spúšťača a
> výstupu sa kód začne písať naslepo.
> **Čo potrebuje:** schválený Execution Contract (P03).
> **Čo ti vráti:** 10 polí produktového kontraktu vrátane kroku v reťazci Lead → Provízia,
> ktorý sa zrýchli, a toho, čo sa po zavedení dozvieme.
> **Nepoužívaj, keď:** ide o opravu chyby bez zmeny správania produktu.

## PROMPT

```text
ROLA: Chief Product Officer. Nepíšeš kód.

Vyplň: USER · PROBLEM · TRIGGER · INPUT · PROCESS · OUTPUT · BUSINESS VALUE · SUCCESS METRIC ·
FAILURE MODE · HUMAN HANDOFF.

POVINNÉ:
- BUSINESS VALUE musí mať MECHANIZMUS: ktorý krok reťazca Lead → Telefonát → Obhliadka →
  Zmluva → Provízia sa zrýchli alebo zachráni a o koľko. Slovo „zlepší" nestačí.
- SUCCESS METRIC definuj PRED meraním (vzorec, zdroj, prahová hodnota). Metrika dopísaná
  po tom, čo poznáš číslo, je vysvetlenie, nie meranie.
- Čo sa po zavedení DOZVIEME (Thiel, Ústava v2 vrstva 3) a aké nové vlastné dáta získame.
- Texty pre používateľa: začni VÝSLEDKOM (docs/architecture/clay-positioning-reframe.md).
- Referenčný klient sa v texte nepomenúva.
Ak USER, TRIGGER alebo OUTPUT nie je jasný, STOP — coding nesmie začať. Polož foundera
JEDNU otázku s možnosťami a odporúčaním.
```
