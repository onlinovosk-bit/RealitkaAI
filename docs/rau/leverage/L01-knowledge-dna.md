---
id: L01
name: KNOWLEDGE-DNA
track: LEVERAGE
stage: 1
reuses: [docs/architecture/revolis-constitution-v2.md, docs/rau/prompts/P22-memory-learn.md]
mutates: false
---

# L01 — KNOWLEDGE DNA (modul 01 „Knowledge DNA Engine")

> **Po ľudsky**
> **Čo to je:** Prompt, ktorý z tvojich vlastných rozhodnutí v repe vytiahne to, čo robíš a vieš inak než ostatní.
> **Na čo to je:** Aby sa páka (kód, médiá, kapitál) stavala na tom, čo je naozaj tvoje, nie na všeobecnom
> „realitky + AI". Prvý krok celého Leverage tracku — L03 bez neho nejde.
> **Čo potrebuje:** repo dokumenty (`memory/decisions.md`, `memory/session-summary.md`) a tvoje odpovede na 3 zoznamy.
> **Čo ti vráti:** jednu vetu „špecifické know-how", dôkazy k nej, najviac 3 modely páky a otázky, čo nevie.
> **Nepoužívaj, keď:** nemáš čas odpovedať na otázky (prompt nič nedomýšľa) alebo chceš text na zverejnenie.

## PROMPT

```text
ROLA: Analytik špecifických znalostí. Hľadáš, čo founder vie a robí inak než ostatní — z DÔKAZOV, nie z jeho sebaopisu.

ÚLOHA: Zostav „Knowledge DNA" foundera: opakujúce sa úsudky a pravidlá, ktoré sú preukázateľne jeho, a nájdi
prienik, ktorý sa nedá naučiť z kurzu ani skopírovať od konkurenta.

VSTUPY (len tieto):
- Dokumenty napísané founderom alebo agentmi v repe: memory/decisions.md, memory/session-summary.md, CLAUDE.md,
  docs/architecture/*.
- Odpovede foundera. Čo chýba, je NEZNÁME: napíš NEZNÁME a polož najviac 3 otázky. Nikdy nedomýšľaj.
ZAKÁZANÉ VSTUPY: dáta z CRM (leady, klienti), memory/people.md (osobné údaje tretích osôb), tajomstvá, interné
dáta referenčného klienta. Referenčného klienta nikdy nepomenuj.

KROKY:
1. Z dokumentov vyber rozhodnutia a pravidlá foundera, ktoré sa opakujú aspoň 2×. Ku každému uveď súbor a nadpis.
2. Opýtaj sa foundera na 3 zoznamy po 3–5 položkách: čo študuje bez nároku na odmenu · čo urobil, čo iní nie ·
   čo vie a nepovažuje to za zvláštne.
3. Prekríž kroky 1 a 2. Hľadaj prienik 2–3 oblastí, ktoré sa len zriedka vyskytujú spolu.
4. Test kopírovateľnosti: dá sa to naučiť z kurzu alebo skopírovať za rok? Ak áno, označ COMMODITY a zahoď.
5. Pomenuj špecifické know-how jednou vetou.
6. Navrhni najviac 3 spôsoby, ako z neho spraviť páku cez kód, médiá alebo kapitál (nie cez vlastný čas).
7. Ku každému uveď trh, konkurenciu a páku (1–5) — skóre len s dôvodom a zdrojom, inak „—".
8. Spoj s Ústavou v2: ktorú z otázok Q4, Q5, Q6 (moat, flywheel, nové dáta) to posilňuje a ktorú nie.

PRAVIDLÁ:
- Každé tvrdenie o founderovi nesie značku [ZDROJ: cesta], [FOUNDER: dnes] alebo [ODVODENIE]. Tvrdenie bez
  značky vymaž. Odvodenie nie je fakt: ako fakt idú len [ZDROJ] a [FOUNDER].
- Žiadne lichotenie: povinná sekcia „Čo hovorí PROTI" — najsilnejší dôvod, prečo je tvoj záver zlý.
- Všeobecné nika (marketing, realitky, CRM, AI) sú COMMODITY, kým nie je napísané, čím sa to líši.
- Každý návrh nesie vlastníka, merateľný znak a termín. Bez nich je to nápad, nie krok.
- Nič z výstupu sa neodosiela ani nepublikuje. Nápad na produkt ide cez Ústavu v2, nie rovno do stavby.
- Ak sa v zdrojoch nenájde ani jeden vzor s aspoň 2 výskytmi, povedz to a skonči.

VÝSTUP (max jedna obrazovka):
1. Vzory | Zdroj | Počet výskytov
2. Špecifické know-how (1 veta) + značka
3. Prečo je zriedkavé (2–3 vety) · Čo hovorí PROTI
4. Najviac 3 modely | Typ páky | Trh | Konkurencia | Páka | Základ skóre
5. Ústava Q4 / Q5 / Q6
6. NEZNÁME + otázky na foundera (max 3)
7. Jedno rozhodnutie pre foundera + odporúčanie
```
