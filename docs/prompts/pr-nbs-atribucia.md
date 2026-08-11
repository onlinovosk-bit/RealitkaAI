# CURSOR ZADANIE — atribúcia zdrojov vo valuačnom widgete

**Cieľová cesta:** `docs/prompts/pr-nbs-atribucia.md`
**Riziko:** LOW — len UI text + metadáta, žiadna zmena výpočtu
**Veľkosť:** XS, 1 PR
**Dôvod:** NBS 10.8.2026 písomne povolila komerčné použitie verejných radov
POD PODMIENKOU atribúcie (docs/legal/nbs-povolenie-2026-08-10.md).
Widget dnes NBS dáta používa (data/regional-prices.json → meta.source),
takže atribúcia je povinnosť, nie kozmetika.

```
KONTEXT
Repo RealitkaAI. Prečítaj docs/legal/nbs-povolenie-2026-08-10.md — obsahuje
presné povinné znenie atribúcie od NBS.

ÚLOHA A — UI widgetu
Do výsledkovej časti valuačného widgetu (rovnaký komponent, kde je veta
„Presnú cenu určí maklér po obhliadke") pridaj pod výsledok drobný, ale
čitateľný riadok zdrojov:

  „Zdroj dát: spracované údaje Národnej banky Slovenska na základe údajov
   United Classifieds a NARKS · Realitný barometer Realitnej únie SR"

- Zobrazuje sa VŽDY, keď sa zobrazí číselný odhad (pásmo).
- Pri priceSource='none' (žiadne číslo) sa riadok nezobrazuje.
- Nie je to sivý 8px text v pätičke — musí byť čitateľný bez lupy,
  ale vizuálne podriadený pásmu a CTA.

ÚLOHA B — metadáta
V data/regional-prices.json doplň do meta:
  attribution: "Spracované údaje Národnej banky Slovenska na základe údajov
                poskytovaných externými poskytovateľmi United Classifieds a NARKS."
  attributionRequiredBy: "NBS email 2026-08-10, docs/legal/nbs-povolenie-2026-08-10.md"
Nemeň žiadne číselné hodnoty.

ÚLOHA C — API
Ak odpoveď /api/valuation/estimate ešte nevracia pole sources, pridaj ho:
  sources: ["NBS (United Classifieds, NARKS)", "Realitný barometer RÚ SR"]
odvodené z priceSource vetvy (city→barometer+NBS, region/national→NBS).
Aditívne pole, nič existujúce sa nemení.

NEROB
- Žiadna zmena výpočtu, pásiem ani band_rules.
- Žiadna zmena persist-estimate ani DB.
- Žiadna nová závislosť.

TESTY
1. Render test: pri zobrazenom pásme je v DOM text „Národnej banky Slovenska".
2. Render test: pri priceSource='none' atribučný riadok NIE JE v DOM.
3. Existujúce testy valuácie prechádzajú nezmenené.

ROLLBACK
git revert, iba UI + JSON metadáta.
```

## Poznámka pre foundera

Toto je zároveň dôveryhodnostný upgrade zadarmo: „počítame z dát NBS"
je predajný argument, ktorý si Smolkovi makléri môžu povedať pri klientovi.
Regulátorova značka vo widgete robí presne to, čo žiadna reklama nedokáže.
