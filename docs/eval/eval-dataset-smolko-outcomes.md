# EVAL DATASET — úspešné dopyty Reality Smolko (2024–2025)

Zdroj: Smolko preposlal 14.07.2026 na žiadosť Andyho.
Účel: kalibrácia triage AI (porovnanie ai_priority vs. reálny výsledok),
rozšírenie parser fixtures, budúci training data.
NEIMPORTOVAŤ do leads tabuľky ako aktívne leady.

---

## Lead 1 — Martin Mokriš (PRENAJATÉ)
- **Zdroj:** Nehnuteľnosti.sk
- **Dátum dopytu:** ~2024 (presný v maile)
- **Inzerát:** JuDc7R8jvcu — Prenájom 3i byt, Sídlisko III, 73 m², 800 €/mes
- **Interné č.:** IA180N
- **Meno:** Martin Mokriš
- **Telefón:** 0915 737 147
- **E-mail:** martinn.mokris@gmail.com
- **Text:** „Dobrý deň, kontaktujte ma ohľadom informácií o ponúkaných nehnuteľnostiach."
- **Výsledok:** ✅ PRENAJATÉ
- **Poznámka:** štandardný dopyt „kontaktujte ma" — záujem o obhliadku

## Lead 2 — Tomáš Kĺč (PREDANÉ)
- **Zdroj:** Nehnuteľnosti.sk
- **Dátum dopytu:** ~2024/2025
- **Inzerát:** JuFwPhc-7Md — 3-izbový byt, Veľký Šariš, kompletná rekonštrukcia
- **Meno:** Tomáš Kĺč
- **Telefón:** 0944 102 780
- **E-mail:** klctomas@gmail.com
- **Text:** „Zaují ma hlavne cena nehnuteľnosti za bližšie info vopred ďakujem"
- **Výsledok:** ✅ PREDANÉ
- **Poznámka:** explicitný záujem o cenu — silný buyer intent

## Lead 3 — Sofia Krivá (PRENAJATÉ)
- **Zdroj:** Nehnuteľnosti.sk
- **Dátum dopytu:** 09.09.2024
- **Inzerát:** JuPzsnMT6oh (interné č. RS048N) — Prenájom 2i byt, Sabinovská, 550 €/mes
- **Meno:** Sofia Krivá
- **Telefón:** 0911 782 369
- **E-mail:** sofiakriva04@gmail.com
- **Text:** „Mám záujem o obhliadku. Kontaktujte ma ohľadom ďalších informácií."
- **Výsledok:** ✅ PRENAJATÉ
- **Poznámka:** explicitná žiadosť o obhliadku — vysoký intent

## Lead 4 — Miroslav Palenčár (PRENAJATÉ)
- **Zdroj:** Bazos.sk
- **Dátum dopytu:** 18.03.2025
- **Inzerát:** 174767869 — Prenájom 2i byt, Laca Novomeského, Prešov-Sekčov, 600 €/mes
- **Interné č.:** RS051N
- **Meno:** Miroslav Palenčár
- **Telefón:** nie je uvedený
- **E-mail:** palencarmiroslav3@gmail.com
- **Text:** „Dobrý deň je váš inzerát ešte aktuálny."
- **Výsledok:** ✅ PRENAJATÉ
- **Poznámka:** minimálny text, slabší signál — napriek tomu úspešný prenájom. Bazos formát (nie portálový štandard).

---

## Súhrn pre triage kalibráciu

| Lead | Portál | Typ | Intent signál | Výsledok |
|---|---|---|---|---|
| Mokriš | Nehnuteľnosti.sk | prenájom 3i | stredný (generický text) | prenajaté |
| Kĺč | Nehnuteľnosti.sk | kúpa 3i | silný (pýta sa na cenu) | predané |
| Krivá | Nehnuteľnosti.sk | prenájom 2i | silný (žiada obhliadku) | prenajaté |
| Palenčár | Bazos.sk | prenájom 2i | slabý („je aktuálny?") | prenajaté |

**Kľúčový insight:** Palenčár mal najslabší textový signál („je aktuálny?")
a napriek tomu prenajaté. Ak by triage dával nízku prioritu
generickým Bazos dopytom, strácal by reálne obchody. Toto je presne
typ dát, na ktorom sa ai_priority kalibruje.

## Ďalšie použitie
1. **Parser fixtures:** Lead 4 (Bazos) — fixture
   `docs/eval/fixtures/bazos-palencar-20250318.raw.txt`, test eval 7 v
   `email-adapter.test.ts`.
2. **Triage eval:** spustiť triage nad týmito 4 textami a porovnať
   ai_priority vs. reálny výsledok.
   - Záznamy: `data/eval/smolko-outcomes-gold.jsonl`
   - Dry-run: `cd apps/crm && npx tsx scripts/eval-triage-smolko-outcomes.ts`
   - Live (Haiku): pridať `--live`
3. **Demo munícia:** „Vidíte tento dopyt 'je váš inzerát aktuálny?'
   Vyzerá slabo — a predsa sa prenajaté. Revolis by ho zachytil."
