# WP-5 FOLLOWUP-GUARD: balík kontraktov (návrh)

> „Strážca follow-upu" = ranný zoznam dopytov, ktoré nedostali ľudskú reakciu dlhšie než X hodín,
> aby maklér vedel, komu zavolať.
> **Len dokumenty. Žiadny kód, žiadny merge, žiadny PROD, žiadne odosielanie.**
> Stav k 2026-10-09, základ `origin/main` @ `e9ece0f`. Reťazec RAU STANDARD: P02 → P03 → P04 → P06 → P07 → P08 (P05 mimo zadania; umiestnenie je v P07 §1).

## Verdikt v jednej vete

**BACKLOG pre stavbu** (Ústava v2, otázka 8: chýbajú dáta, VETO). Najprv merať a opýtať sa kancelárie; až ak baseline ukáže problém, rozšíriť existujúci Guardian o jedno pravidlo. Nový agent ani LLM netreba.

## Obsah

| Súbor | Čo obsahuje |
|---|---|
| `01-verdikt-P02.md` | Reality (24 overených tvrdení), zabitie plánu, 12 otázok Ústavy (skóre iba z dôkazu), 3 možnosti, odomykacie podmienky |
| `02-execution-contract-P03.md` | Founder brief, Fáza 0 (merať), Fáza 1 (EXTEND Guardian, ZAMKNUTÁ) |
| `03-product-contract-P04.md` | 10 polí, mechanizmus, SUCCESS METRIC (vzorec, zdroj, prahy pred meraním), rozhovor s kanceláriou |
| `04-data-event-contract-P06.md` | Zdroje podľa sourcing mapy, definícia „reakcie", tabuľka eventov, GDPR, otvorené neznáme U1–U9 |
| `05-workflow-P07.md` | REUSE → EXTEND → COMPOSE → BUILD, deterministika, 4 workflowy s 20 poľami, poradie |
| `06-agent-spec-P08.md` | Agent Spec, tiery, FORBIDDEN ACTIONS, EVAL SUITE aj na zakázané správanie |

## Čo audit potvrdil a čo opravil (z kódu)

- Potvrdené: sweep (22:00) je `updated_at`/5 dní a draft-only; 22 z 23 e-mailov `not_a_lead` (a jediný `lead_created` bol testovací); ranný brief 06:00 a `guardian-digest` existujú.
- **Opravené:** pole prvej reakcie v repe *je*, len nie pod názvom `first_response_at`: substrát `lead_events.contact_attempted` + `occurred_at` (migrácia `20260924060000`, PREP ONLY) a zapisovač v UI. Jeho PROD stav je NEZNÁMY.
- **Opravené:** `agent-specs.ts` má 7 záznamov (nie 4) a test proti driftu by revolisového `internal_intelligence` agenta zhodil (P08 §0).
- **Nový nález (P0 pre návrh):** `leads.last_contact_at` zapisuje aj automatické potvrdenie pri vzniku leadu, takže ho nemožno použiť ako „reakciu". Existujúce KPI „kontakt do 24 h" (`kpi.ts`) čerpá z legacy `last_contact` ako z „prvého" kontaktu a nie je použiteľné ako baseline.
- **Nový nález (mimo rozsahu, nezasiahnuté):** šablóna návrhu v `apps/crm/src/lib/agents/followup/engine.ts` má názov referenčného klienta natvrdo (pravidlo 2 z `CLAUDE.md`). Doriešiť samostatne.
- Zápis o „1 platiacej kancelárii" som našiel z 2026-10-05 (`memory/decisions.md` r. 75), zápis z 2026-10-09 nie.

## Poradie (odporúčané)

1. **Founder rozhodnutie** (nižšie).
2. Overiť/aplikovať substrát (`GO_CONTACT_EVENT_PROD_MIGRATION`, existujúca brána, Tier 3).
3. Rozhovor s kanceláriou (P04 §10) paralelne s meraním.
4. Meranie 4 (max 8) týždňov, vyplniť tabuľku P04 §6.
5. Vyhodnotenie podľa pre-registrovaného pravidla (P04 §5, §7).
6. Až potom, a len s `GO WP5-FG-1`: zjednotenie zapisovačov reakcie → pravidlo `NO_FIRST_RESPONSE` v Guardiane → vyhodnotenie účinku.

## Čo blokuje foundera (potrebujem od teba)

| # | Blokér | Čo presne | Bez toho |
|---|---|---|---|
| B1 | **Prah ticha X (SLA)** | Hodnota (návrh 4 h, je to PREDPOKLAD z briefu §2.2, nie fakt) a či ide o pracovné alebo kalendárne hodiny; pre pracovné aj definícia hodín | Fáza 1 sa nezačne; pravidlo bez X nežiari (`NEKONFIGUROVANÉ`) |
| B2 | **Definícia „reakcie"** | Potvrdiť P06 §2: prvý ľudský `contact_attempted`; auto-potvrdenie, AI návrh a `last_contact_at` sa nepočítajú; hovor mimo CRM sa nezachytí | Metrika M1 nemá význam; zoznam by klamal |
| B3 | **Schválenie Ústavy v2 ako záväznej brány** | Verdikt BACKLOG stojí na VETO otázky 8. Ústava je `living-document`; formálne schválenie som nehľadal ani nepotvrdil | Ak ju neuznávaš za záväznú, verdikt je len odporúčanie |
| B4 | Odpovede na Q1, Q2, Q10–Q12 | Čo ťa viedlo k požiadavke WP-5, či sa kancelárie niekto pýtal | Skóre nejde uzavrieť |
| B5 | Prahy P04 §5 (N_min, M0, −30 %, kill) | Schváliť PRED meraním, nie po pohľade na číslo | Merania nie sú pre-registrované |
| B6 | Právnik: zamestnanecký rozmer (U7) a retencia (U6) | Posúdenie | Fáza 1 nesmie ísť do PROD |

## FOUNDER DECISION (jedna, s odporúčaním)

**Ako postupovať s Strážcom follow-upu?**

| Možnosť | Čo sa stane | Cena | Odporúčanie |
|---|---|---|---|
| **A. Merať, nestavať** | Verdikt BACKLOG. GO na Fázu 0: overiť/aplikovať substrát, rozhovor s kanceláriou, 4 týždne merania. Fázu 1 odomkneš až podľa výsledku. | 1 už pripravená migrácia + 1 rozhovor; čas NEMERANÉ | **ODPORÚČAM** |
| B. Stavať hneď (EXTEND Guardian) | Prekonáš VETO otázky 8. Pravidlo + 2 migrácie + zjednotenie zapisovačov bez baseline | Vyššia, výsledok bez dát a s rizikom falošných pozitív | Neodporúčam |
| C. Zahodiť | Žiadna práca | 0, strata možnej hodnoty | Neodporúčam pred rozhovorom s kanceláriou |

**Odporúčanie A, dôvod:** Najlacnejší krok, ktorý buď potvrdí problém, alebo ušetrí stavbu. Zároveň vytvára dáta o správaní maklérov (moat podľa Ústavy v2), ktoré dnes neexistujú. Slovo na odomknutie: `GO WP5-FG-0` (migrácia substrátu a merge zvlášť).

## Hranice tohto balíku

Nespustené / nezistené: PROD stav (substrát, Guardian, env), skutočný počet dopytov kancelárie, správanie maklérov, výkon, náklad behu. Žiadne číslo o prínose sa nevymýšľa; všetko takéto je NEMERANÉ alebo NEZNÁME.
