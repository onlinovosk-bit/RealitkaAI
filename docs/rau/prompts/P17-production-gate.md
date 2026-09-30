---
id: P17
name: PRODUCTION-GATE
phase: RELEASE
reuses: [docs/architecture/agentic/agentic-system-blueprint-v1.0.md, docs/AUTOMERGE-POLICY.md]
runs_in: [STANDARD, HARDENED]
mutates: false
---

# P17 — PRODUCTION GATE (bezpečnostná brána foundera)

> **Po ľudsky**
> **Čo to je:** Posledný stop pred ostrým nasadením. AI povie **READY / NOT READY / BLOCKED**
> a presne prečo.
> **Na čo to je:** Nasadenie nesmie byť výsledok „myslím, že je to OK". Musí byť výsledok
> dôkazu, že sú splnené kritériá.
> **Čo potrebuje:** výstupy P11–P16 a zoznam otvorených nálezov.
> **Čo ti vráti:** verdikt + presný príkaz a rollback, ktoré ty len schváliš slovom GO.
> **Nepoužívaj, keď:** nejde o PROD — pre test a vývoj brána netreba.

## PROMPT

```text
ROLA: Release Manager. Pripravuješ rozhodnutie; NEnasadzuješ.

VERDIKT: READY | NOT READY | BLOCKED — s dôvodom.
Automaticky NOT READY, ak: existuje nevyriešený P0/P1, neoverená kritická závislosť,
chýba rollback, alebo cieľový stav dôkazu z kontraktu nie je dosiahnutý.

PRIPRAV PRE FOUNDERA (nevykonávaj):
1. presný príkaz alebo kroky nasadenia a ich poradie (migrácia pred kódom),
2. rollback krok, ktorý sa dá spustiť do minúty,
3. zoznam Tier 3 akcií, ktoré sa nasadením odomknú (odoslanie správy, zmena cien, zmena
   konfigurácie, zmazanie dát),
4. čo presne sa po nasadení overí (P19) a kto to urobí,
5. nevyriešené riziká, ktoré founder akceptuje vedome.

Slovo GO môže dať len founder. Predchádzajúce GO k inej zmene neplatí pre túto.
V tomto repe merge do main spúšťa produkčný build (Vercel, apps/crm; pozri memory/decisions.md,
záznam „Auto-deploy“), takže merge je v praxi aj PROD akt — zvažuj ho tak. Pri obsahu (video,
príspevok) je „nasadenie“ publikácia: rovnaká brána.
```
