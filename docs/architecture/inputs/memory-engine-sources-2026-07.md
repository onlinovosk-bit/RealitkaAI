# Memory Engine — vstupné strategické texty (júl 2026)

**Cieľová cesta:** `docs/architecture/inputs/memory-engine-sources-2026-07.md`
**Status:** surové vstupy pre FABLE mandát. Neupravované, s prekryvmi —
normalizáciu do kanonického modelu robí implementačný agent
(výstup: `docs/architecture/memory-engine-canonical-model.md`).

---

## TEXT 1 — Organizačná pamäť / Revolis Memory Engine (Vault + Passes)

Autor v skutočnosti nevytvoril systém na správu GitHub repozitárov. Vytvoril
systém, ktorý odpovedá na otázky: Prečo sme toto pridali? Používame to ešte?
Máme niečo podobné? Je to ešte živé? Môžeme to odstrániť? To je „organizačná
pamäť" — a presne o tom sa bavíme pri Revolise.

North Star: „Revolis nie je CRM s AI. Revolis je organizačná pamäť realitnej
kancelárie, ktorá sa s každým obchodom stáva neskopírovateľná."

Jeden Vault pre celú firmu, nie len GitHub:
- Projekty (Revolis, Web, Marketing, Integrácie, Experimenty)
- AI nástroje (Claude, GPT, Cursor, Kimi, Fable, Gemini)
- GitHub repozitáre (každý repo = záznam: kde sa používa, kto, posledná
  zmena, duplicity, riziká)
- Dokumentácia (PRD, architektúra, runbooky, rozhodnutia, meeting notes)
- Marketing (Ads, landing pages, kampane, hooky, víťazné/neúspešné reklamy)
- Konkurencia (RealitySoft, Realman, iNemo, zahraničné CRM — AI sama píše
  „RealitySoft dnes pridal funkciu X")
- Integrácie (Realvia, Nehnutelnosti.sk, Bazoš, Meta, Google, Stripe)
- Ľudia/agenti (čo robí, čo vie, na čom pracuje)

**Passes — periodické audity (skutočné zlato):**
1. Duplicity — máme tri systémy na rovnakú vec?
2. Nepoužívané veci — tento prompt si nepoužil 8 mesiacov.
3. Riziká — používaš API, ktoré skončí.
4. Novinky — objavil sa lepší model.
5. Rozhodnutia — pred 3 mesiacmi sme sa rozhodli nepoužiť Redis. Platí to?
6. Technický dlh — tieto moduly nikto neupravil rok.
7. Marketing — tento hook funguje, tento nikdy nefungoval.
8. Biznis — aké experimenty priniesli peniaze?

**Vrstva navyše — učenie, nie audit:** týždenný súhrn (pridali ste X
integrácií, zrušili Y experimentov, vytvorili Z promptov, N zbytočných,
M denne používaných) + odporúčanie (presuňte Prompt X medzi štandardné
workflow). To je organizačné učenie.

**Agenti ako schopnosti:** Guardian, Librarian, Decision Memory, Knowledge
Curator, Duplicate Detector, Risk Scanner, Market Scanner, Prompt Auditor,
Experiment Auditor, Feature Historian — tím AI pracovníkov.

**Produktová príležitosť:** Revolis Memory Engine — každá realitná kancelária
zabúda (prečo robili rozhodnutia, prečo klient odišiel, ktorý inzerát
fungoval, čo skúšali minulý rok, ktoré follow-upy fungujú, ktorý maklér je
dobrý na aký typ klienta). Revolis tieto informácie nielen ukladá, ale
priebežne prepája, vyhodnocuje a upozorňuje na vzory.

**Návrh vrstiev pre Revolis OS:**
- Memory Layer — rozhodnutia, dokumenty, repozitáre, marketing, integrácie, procesy
- Observation Layer — agenti priebežne zbierajú fakty a aktualizujú stav
- Audit Layer — duplicity, riziká, technický dlh, zastarané rozhodnutia,
  nepoužívané aktíva
- Learning Layer — týždenné/mesačné poznatky: čo funguje, čo štandardizovať
- Recommendation Layer — konkrétne kroky s najvyšším dopadom, nie pasívne reporty

---

## TEXT 2 — Revolis Brain / nočný audit / Knowledge Health

Koncept živého organizačného mozgu, ktorý sa pravidelne sám kontroluje.
Pôvodný autor: 30+ GitHub repozitárov, Claude pravidelne odpovedá: prečo
repo existuje, používa sa, nie je duplicitné, je autor aktívny, má zmysel
ho držať, čo na ňom závisí.

Aplikácia na celú firmu — každá časť Revolisu má vlastnú pamäť:
- **Modul Lead Intelligence:** prečo vznikol, aký problém rieši, kto ho
  používa, ktoré tabuľky/API/AI modely používa, roadmap, technický dlh,
  posledné rozhodnutia.
- **Marketing:** ktoré reklamy fungovali, headline CTR 6 % vs 1 %, ktoré
  fotografie, ktoré publikum. Po pol roku nezačínaš od nuly.
- **Predaj:** prečo zákazník kúpil/nekúpil, námietky, požiadavky. O rok AI
  odpovie „tri najčastejšie dôvody odmietnutia Revolisu" bez hľadania.

**Nočný audit celej firmy** (rozšírenie z 12h auditu GitHubu):
- Produkt: čo pribudlo, zmenilo sa, rozpracované, zablokované
- Kód: duplicity, nový technický dlh, nepoužívané, rizikové moduly
- Marketing: bežiace reklamy, CTR, CAC, leady, najlepšie kreatívy
- CRM: noví zákazníci, rizikoví, neprihlásení, neplatiaci
- Dokumentácia: aktuálna? v rozpore s kódom? chýbajú rozhodnutia?
- AI: výkon modelov, cena inferencie, latencia

**Pamäť rozhodnutí (Layer 2):** každé významné rozhodnutie má záznam:
problém, alternatívy, dôvod výberu, očakávaný výsledok, dátum, kto rozhodol,
čo sa stalo po troch mesiacoch. Otázka „Kedy sme naposledy menili cenový
model a prečo?" → okamžitá odpoveď.

**Revolis Brain:** nie poznámky, ale znalostný graf firmy — prepojené
zákazníci, funkcie, rozhodnutia, dokumentácia, repozitáre, kampane, spätná
väzba, roadmapa, obchodné prípady, incidenty, metriky. Otázka sa mení z
„Kde je ten dokument?" na „Prečo sme túto funkciu vytvorili, aké problémy
vyriešila, ktorých zákazníkov ovplyvnila a čo sa stane, ak ju odstránime?"

**Knowledge Health modul** — pravidelne hodnotí:
- Životaschopnosť kódu — duplicity, nepoužívané moduly, zastarané závislosti
- Životaschopnosť znalostí — zastarané dokumenty, rozpory docs vs implementácia
- Životaschopnosť produktu — funkcie bez použitia/hodnoty pre zákazníkov
- Životaschopnosť procesov — workflow zbytočne komplikované alebo obchádzané
Aktívny poradca, nie archív.

---

## TEXT 3 — „Secret gunpowder" / meranie AI / Decision→Outcome Loop

Konsenzus špičkových AI tímov: výhodu netvorí model ani prompt, ale
**systém, ktorý premieňa znalosti firmy na opakovateľné rozhodnutia.**
- Kvalitný kontext > model (modely sa menia každé mesiace; firemné dáta,
  procesy a rozhodovacia história zostávajú → context engineering)
- Workflow > Prompt (orchestrácia, pamäť, kontrolné mechanizmy, testovanie,
  spätná väzba)
- Vlastné dáta = najväčší náskok (model si kúpi každý, históriu nie)
- Meranie kvality: nie „je múdry?", ale koľko chýb, koľko ušetreného času,
  úspešnosť úloh
- RAG a pamäť: správne informácie v správnom čase > väčší model

**Pre Revolis:**
1. AI sa nehodnotí podľa modelu, ale podľa KPI: presnosť odporúčaní, úspora
   času, zachránené obchody, dodatočný obrat, počet chýb, miera prijatia
   maklérmi.
2. Každý AI agent má vlastné skóre (Lead Intelligence: presnosť %, Follow-up:
   response/close rate, Matching: pick rate).
3. Vrstvy: RAG → Knowledge Graph → Decision Memory → Outcome Memory →
   Learning Engine. Decision Memory = aj dôvod, nie len výsledok. Outcome
   Memory = každé rozhodnutie dostane výsledok po čase. Learning Engine =
   vzory z vlastných dát (nové znalosti, nie RAG).
4. AI Scorecard na dashboarde (úspora času, zachránené obchody, presnosť,
   zrýchlenie predaja, dodatočný obrat) — dôvera na základe čísel.
5. **Najväčší moat: Decision → Outcome Loop** — každé odporúčanie uloží
   vstupy, odporúčanie, akciu makléra, výsledok po 30/60/90 dňoch →
   „pri podobných prípadoch úspešné v 87 %".
6. Povinný cyklus každej AI funkcie: DATA → RAG → Reasoning → Decision →
   Action → Outcome → Evaluation → Learning → Organizational Memory.
7. Najcennejšia investícia: **Evaluation Engine** — vrstva merajúca kvalitu
   rozhodnutí a premieňajúca ich na organizačnú pamäť. Milióny
   anonymizovaných rozhodnutí + mechanizmus učenia = nedobehnuteľný moat.

**Engineering aplikácia (z diskusie o vibe codingu, ~70 % pravdy):**
- Smerovanie od Copilota k tímu agentov (PM → Chief Engineer → špecialisti →
  Review → Human Approval). AI nikdy priamo do produkcie.
- Najväčší náskok: „Claude pozná všetky pravidlá Revolisu" — znalostná
  základňa (architektúra, štandardy, DB pravidlá, naming, dizajn, obchodné
  pravidlá, história rozhodnutí) načítaná pred každou úlohou.
- Revolis Engineering Brain: rozhodnutia architektúry, PR review, bugy,
  postmortemy, úspešné implementácie, štandardy, checklisty, prompt šablóny,
  benchmarky.
- O víťazoch rozhodnú: procesy, organizačná pamäť, systém hodnotenia AI,
  knižnica agentov a štandardov, automatizované testovanie, spätná väzba
  z produkcie.
