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
- Dokumenty v repe: memory/decisions.md, memory/session-summary.md, CLAUDE.md, docs/architecture/*.
- Odpovede foundera. Čo chýba, je NEZNÁME: napíš NEZNÁME a polož najviac 3 otázky. Nikdy nedomýšľaj.
ZAKÁZANÉ VSTUPY: dáta z CRM (leady, klienti), memory/people.md (osobné údaje tretích osôb), tajomstvá, interné
dáta referenčného klienta.

KROKY:
1. Vyber rozhodnutia a pravidlá foundera, ktoré sa opakujú. Výskyt = iný deň, iný autor alebo citát foundera;
   záznamy, ktoré len opakujú jeden zdroj, sú jeden výskyt. Postup agenta (mutation proof, oprava CI)
   nie je vzor foundera. Počet uveď len z grepu s uvedeným vzorom, inak „—".
   Ku každému súbor a nadpis.
2. Opýtaj sa foundera na 3 zoznamy po 3–5 položkách: čo študuje bez nároku na odmenu · čo urobil, čo iní nie ·
   čo vie a nepovažuje to za zvláštne.
3. Prekríž kroky 1 a 2. Hľadaj prienik 2–3 oblastí, ktoré sa len zriedka vyskytujú spolu.
4. Test kopírovateľnosti: dá sa to naučiť z kurzu alebo skopírovať za rok? Ak vieš, že áno, označ COMMODITY
   a zahoď. Ak to nevieš doložiť, označ NEOVERENÉ (nepotvrdzuj ani nezahadzuj).
5. Pomenuj špecifické know-how jednou vetou.
6. Navrhni najviac 3 spôsoby, ako z neho spraviť páku cez kód, médiá alebo kapitál (nie cez vlastný čas).
7. Ku každému uveď trh, konkurenciu a páku (1–5) — skóre len s dôvodom a zdrojom, inak „—".
8. Spoj s Ústavou v2: ktorú z otázok Q4, Q5, Q6 (moat, flywheel, nové dáta) to posilňuje a ktorú nie.

PRAVIDLÁ:
- Všeobecné nika (marketing, realitky, CRM, AI) sú COMMODITY, kým nie je napísané, čím sa to líši.
- Každý návrh nesie vlastníka, merateľný znak a termín (termín je návrh, určuje ho founder). Bez nich je to
  nápad, nie krok.
- Nič z výstupu sa neodosiela ani nepublikuje. Nápad na produkt ide cez Ústavu v2, nie rovno do stavby.
- Ak sa nenájde ani jeden vzor s aspoň 2 výskytmi, povedz to a skonči.

SPOLOČNÉ PRAVIDLÁ:
- Značku [ZDROJ: cesta], [FOUNDER: dnes] alebo [ODVODENIE] nesie každá veta s číslom, dátumom, odhadom času,
  kvantifikátorom (len, už, žiadny, vždy) alebo tvrdením o trhu. Bez značky ju vymaž. Značka patrí na každú takú
  vetu, nie na koniec odseku. [FOUNDER: dnes] smieš napísať len pri tom, čo founder povedal v tomto rozhovore;
  chýbajúci údaj je NEZNÁME bez značky.
- [ZDROJ] podopiera tvrdenie o founderovi len ak ide o jeho vlastný text alebo citát. Záznamy písané agentmi
  sú [ODVODENIE].
- Cituj len súbory, ktoré si v tejto session prečítal. Ak nemáš prístup k repu, povedz to a použi len odpovede foundera.
- Pri rozpore záznamov platí novší (uveď dátum).
- Ak cesta alebo nadpis obsahuje meno referenčného klienta, nahraď ho [REF. KLIENT]. Mená, e-maily a telefóny
  osôb z dokumentov nikdy necituj ani nepoužívaj.
- Úlohu modulu splň aj vtedy, keď dokument už obsahuje „krok na dnes" (napr. krok C). Jeho názov ani čísla
  nepíš nikde okrem poslednej vety výstupu.
- Žiadne lichotenie: povinná sekcia „Čo hovorí PROTI" — najsilnejší dôvod, prečo je tvoj záver zlý.

VÝSTUP (najviac 40 riadkov a 450 slov, rátajú sa aj slová v tabuľkách; riadky, kde sú všetky polia NEZNÁME,
zlúč do jedného):
1. Vzory | Zdroj | Počet výskytov
2. Špecifické know-how (1 veta) + značka
3. Prečo je zriedkavé (2–3 vety) · Čo hovorí PROTI
4. Najviac 3 modely | Typ páky | Trh | Konkurencia | Páka | Základ skóre
5. Ústava Q4 / Q5 / Q6
6. NEZNÁME + otázky na foundera (max 3)
7. Jedno rozhodnutie pre foundera + odporúčanie
```
