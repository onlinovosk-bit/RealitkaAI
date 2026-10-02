---
id: L02
name: LEVERAGE-AUDIT
track: LEVERAGE
stage: 2
reuses: [docs/architecture/agentic/agentic-system-blueprint-v1.0.md, docs/rau/prompts/P22-memory-learn.md]
mutates: false
---

# L02 — LEVERAGE AUDIT (modul 02 „Leverage Engine")

> **Po ľudsky**
> **Čo to je:** Prompt, ktorý zmapuje, čo opakovane robíš, a rozdelí to na štyri vrstvy: práca (čas), kapitál,
> kód a médiá. Nájde činnosť, kde je úsilie veľké a výstup zastropovaný.
> **Na čo to je:** Aby si vedel, kde ti čas „uniká", a zároveň aby sa neoznačili za únik tvoje zámerné rozhodnutia
> (GO, merge, cena, kapitál) — tie majú zostať tvoje.
> **Čo potrebuje:** repo dokumenty a tvoje hodiny týždenne pri každej činnosti.
> **Čo ti vráti:** tabuľku činností podľa vrstvy, najväčší únik a najviac 3 konkrétne upgrady.
> **Nepoužívaj, keď:** nechceš uviesť hodiny — index páky bez nich nevznikne (nebude odhad).

## PROMPT

```text
ROLA: Analytik pákového efektu. Štyri vrstvy: PRÁCA (čas), KAPITÁL (peniaze, ktoré pracujú), KÓD (softvér),
MÉDIÁ (obsah).

ÚLOHA: Zmapuj opakujúce sa činnosti foundera podľa vrstvy páky a nájdi tú, kde je úsilie vysoké a výstup zastropovaný.

VSTUPY (len tieto):
- Dokumenty v repe: memory/session-summary.md, memory/open-tasks.md, memory/decisions.md.
- Odpovede foundera: hodiny týždenne pri každej činnosti a čo z nej vzniká. Čo chýba, je NEZNÁME: napíš
  NEZNÁME a polož najviac 3 otázky. Hodiny, príjem ani publikum nikdy neodhaduj.
ZAKÁZANÉ VSTUPY: dáta z CRM, memory/people.md, tajomstvá, interné dáta referenčného klienta.

KROKY:
1. Vypíš činnosti, ktoré sa opakujú aspoň 2× (zdroj: session-summary, open-tasks). Ku každej súbor a nadpis.
2. Zaraď každú do JEDNEJ vrstvy. Zmiešanú rozdeľ.
3. Označ AUTORITA: kroky, ktoré robí founder zámerne (GO, merge, rozhodnutie o cene, kapitál, externé správy).
   Nie sú to úniky: agent nie je autorita. Neautomatizuj ich a nenavrhuj ich ako upgrade.
4. Skóre 0–10 ku každej činnosti len ak founder dal hodiny a výstup, inak „—".
5. Index páky = hodiny vo vrstvách KÓD, MÉDIÁ, KAPITÁL ÷ všetky hodiny. Len ak hodiny existujú, inak NEZNÁME.
6. Najväčší únik = činnosť (nie AUTORITA) s vysokým úsilím a zastropovaným výstupom.
7. Navrhni najviac 3 upgrady z vrstvy PRÁCA na KÓD alebo MÉDIÁ. Každý ako konkrétny artefakt (napr. „skript X,
   ktorý robí Y"), s vlastníkom, merateľným znakom a termínom.

PRAVIDLÁ:
- Hodina fakturovaného času je PRÁCA, bez ohľadu na sadzbu.
- Činnosť, ktorá by po 60 dňoch bez foundera prestala, označ RIZIKO ZÁVISLOSTI (so zdrojom alebo [FOUNDER]).
- „Zlepšiť proces", „zautomatizovať viac" a podobné vety sú zakázané. Upgrade je pomenovaný artefakt, alebo nie je.
- Každé tvrdenie o founderovi nesie značku [ZDROJ: cesta], [FOUNDER: dnes] alebo [ODVODENIE]. Bez značky vymaž.
- Žiadne lichotenie: povinná sekcia „Čo hovorí PROTI" — najsilnejší dôvod, prečo je tvoj záver zlý.
- Žiadne ceny, limity ani sumy kapitálu: určuje ich len founder. Nič sa neodosiela ani nepublikuje.

VÝSTUP (max jedna obrazovka):
1. Činnosť | Vrstva | Hodiny/týždeň | Skóre | Zdroj
2. AUTORITA (ponechať) — zoznam
3. Index páky (X/10 alebo NEZNÁME)
4. Najväčší únik: činnosť · prečo je to pasca · čo to stojí · Čo hovorí PROTI
5. Najviac 3 upgrady: dnes → cieľ | konkrétny artefakt | vlastník | merateľný znak | termín
6. NEZNÁME + otázky na foundera (max 3)
7. Jedno rozhodnutie pre foundera + odporúčanie
```
