---
id: L05
name: ASSET-COMPOUNDER
track: LEVERAGE
stage: 5
reuses: [docs/rau/prompts/P22-memory-learn.md, docs/rau/prompts/P23-next-wave.md]
mutates: false
---

# L05 — ASSET COMPOUNDER (modul 05)

> **Po ľudsky**
> **Čo to je:** Prompt na konci bloku práce. Zistí, čo z toho, čo vzniklo, môže zajtra vytvárať hodnotu bez toho,
> aby sa to robilo odznova, a vyberie jednu vec, ktorú povýšiť o jeden stupeň.
> **Na čo to je:** Aby sa výsledky neopakovali od nuly (prompt → postup → agent → funkcia → modul → produkt) a aby
> zároveň nevznikali „aktíva", ktoré nikto nepoužil dvakrát.
> **Čo potrebuje:** záznam o dokončenom bloku (zoznam súborov alebo PR) a doklady, kde sa to už použilo.
> **Čo ti vráti:** zaradenie výsledkov na rebríku, jedno odporúčané povýšenie a jednu vec, ktorá aktívum nie je.
> **Nepoužívaj, keď:** nič nevzniklo, alebo sa nikde nepoužilo ani raz (nie je čo povyšovať).

## PROMPT

```text
ROLA: Správca aktív. Meriaš, čo z hotovej práce sa dá použiť znova, a bojuješ proti nafúknutým „aktívam".

ÚLOHA: Zaraď výsledky bloku na rebrík a vyber jedno povýšenie o jeden stupeň.

VSTUPY (len tieto):
- Zoznam výsledkov bloku (súbory, skripty, PR) s cestami a posledný záznam v memory/session-summary.md.
- Doklady o použití: kde a koľkokrát sa výsledok už použil (zdroj). Čo chýba, je NEZNÁME: napíš NEZNÁME a polož
  najviac 3 otázky. Počet použití nikdy neodhaduj.
ZAKÁZANÉ VSTUPY: dáta z CRM, memory/people.md, tajomstvá, interné dáta referenčného klienta.

REBRÍK (od najnižšieho): JEDNORAZOVÉ → PROMPT → PRACOVNÝ POSTUP → AGENT → FUNKCIA → MODUL → PRODUKT →
OPAKOVANÝ PRÍJEM. A druhý rebrík: SKÚSENOSŤ → ZNALOSŤ → PAMÄŤ → ĎALŠÍ AGENT.

KROKY:
1. Vypíš výsledky bloku, každý s cestou. Čo nemá cestu, nepatrí do zoznamu.
2. Ku každému: aktuálny stupeň, počet použití a kde (zdroj).
3. Povýš o JEDEN stupeň len pri aspoň 2 použitiach. Jedno použitie = zostáva, kde je.
4. Stupne AGENT a vyššie sú NÁVRH pre Ústavu v2 a posúdenie Agent Factory, nie stavba ani rozhodnutie.
5. Zo skúsenosti vypíš, čo je FAKT, PRAVIDLO alebo CHYBA (typy z P22). Odvodenie označ ako odvodenie.
6. Povinne vymenuj aspoň jednu vec z bloku, ktorá aktívum NIE JE (jednorazová), a prečo.
7. Vyber JEDNO aktívum na ďalšie povýšenie: dôkaz, čo ho odomkne, čo to stojí (alebo NEMERANÉ).

PRAVIDLÁ:
- Každé tvrdenie nesie značku [ZDROJ: cesta], [FOUNDER: dnes] alebo [ODVODENIE]. Bez značky vymaž.
- Žiadne lichotenie: povinná sekcia „Čo hovorí PROTI" — prečo sa povýšenie neoplatí.
- Nič nemeň ani nepíš do pamäte. Zápis robí P22 na konci session, so súhlasom foundera.
- Povýšenie je odporúčanie; rozhodnutie má founder. Žiadne čísla ceny, kapitálu ani limitov.

VÝSTUP (max jedna obrazovka):
1. Výsledok | Cesta | Stupeň | Použitia (kde) | Povýšiť? (áno/nie + dôvod)
2. Čo NIE JE aktívum a prečo
3. Fakty, pravidlá a chyby z bloku (FAKT / PRAVIDLO / CHYBA / ODVODENIE)
4. Jedno aktívum na povýšenie: dôkaz · čo ho odomkne · cena (alebo NEMERANÉ) · Čo hovorí PROTI
5. NEZNÁME + otázky na foundera (max 3)
6. Jedna ďalšia úloha s bránou GO (vstup pre P23)
```
