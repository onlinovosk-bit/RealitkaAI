# ADR — Growth Intelligence: princípy analytickej vrstvy Revolis

**Cieľová cesta v repe:** `docs/architecture/adr-2026-09-03-growth-intelligence-principles.md`
**Zrkadlo rozhodnutí:** zápis do `decisions.md` (5 riadkov)
**Stav:** NÁVRH — čaká na GO foundera
**Dátum:** 2026-09-03 · **Autor:** Claude (architektúra) · **Vlastník rozhodnutia:** founder
**Rozsah:** princípy, nie implementácia. Tento ADR nepovoľuje napísať ani riadok kódu.

---

## 0. Kontrolór blok — prečítaj toto pred zvyškom

**R1 — Polovica týchto princípov už je uzamknutá inde.**
`docs/architecture/acquisition-os-v2.2-final-locked.md` má v tabuľke Executive
Decisions bod **7** („Deterministický engine first, LLM až potom") a bod **8**
(„Zdroj pravdy = Revolis CRM. GA4 = analytics layer."). Tento ADR ich **neprepisuje
a needuplikuje** — zovšeobecňuje ich z Google Ads na celú analytickú vrstvu
a dopĺňa to, čo tam nie je: rozsah merania, AI interpretačná vrstva, cost governance,
kontinuita kontextu.
Ak schválením tohto ADR vznikne rozpor s v2.2, platí v2.2 a tento dokument sa opraví.

**R2 — Podnet prišiel z výstupu iného AI, nie od teba.**
Princípy P2–P7 pochádzajú z návrhu, ktorý si mi 3.9. poslal (ChatGPT, „REVOLIS
Growth Intelligence System"). Podľa pravidla autority to **nie je founder GO** —
je to návrh na posúdenie. Ja ho posudzujem ako dobrý v princípoch a predčasný
v implementácii. Schvaľuješ princípy, nie ten master prompt.

**R3 — Tento ADR nespúšťa žiadnu stavbu.**
Master prompt „REVOLIS Growth Intelligence Foundation" zostáva **nespustený**.
Dôvod je v sekcii 4.

---

## 1. Kontext (overené 2026-09-03, nie odhad)

| Zistenie | Dôkaz |
|---|---|
| GA4 komponent existuje | `apps/crm/src/components/analytics/GoogleAnalytics.tsx` |
| Je zapojený **len** do `(marketing)/layout.tsx` | dashboard / public / onboarding layouty: 0 výskytov |
| Valuation funnel je plne inštrumentovaný | `lib/valuation/analytics.ts` → `valuation_started`, `step_completed`, `valuation_shown`, `contact_submitted`, `lead_submitted`, `abandon`; volané z `components/valuation/ValuationWidgetForm.tsx` |
| **Na revolis.ai nie je žiadny gtag** | fetch produkcie 3.9.2026: `googletagmanager.com/gtag/js` sa nenachádza — ⚠️ OPRAVENÉ, viď Erratum nižšie |
| Dôsledok | `GoogleAnalytics.tsx` má na 1. riadku `if (!GA_ID) return null;` → `NEXT_PUBLIC_GA_MEASUREMENT_ID` nie je nastavené v Production. Celý funnel strieľa do prázdna. — ⚠️ OPRAVENÉ, viď Erratum nižšie |

### Erratum — 2026-09-04

Dva riadky vyššie sú **nesprávne** a opravujú sa tu, nie mazaním.

**Čo bolo tvrdené:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` nie je nastavené v produkcii
a GA4 nezbiera nič.

**Prečo to bolo nesprávne:** dôkaz bol fetch domény `revolis.ai`. Projekt
`realitka-ai` však servíruje **`app.revolis.ai`** a `realitka-ai.vercel.app`.
`revolis.ai` je iná stránka. Meralo sa nesprávne miesto.

**Overený stav (2026-09-04):**

| Zistenie | Dôkaz |
|---|---|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` je nastavené | Vercel → `realitka-ai` → Environment Variables, pridané 2026-07-21 |
| GA4 na `app.revolis.ai/odhad/reality-smolko` reálne meria | founder sa videl v GA4 Prehľadoch v reálnom čase, 2026-09-04 |
| Consent gate funguje | GA sa načíta až po kliknutí „Súhlasím so všetkými" (PR #517) |
| GA **nie je** v `(public)` ani `(dashboard)` layoute | `grep -rln GoogleAnalytics apps/crm/src/app/` → jediný výskyt `(marketing)/layout.tsx` |

**Čo z pôvodnej sekcie platí ďalej:** cookie banner naozaj nebol nikde vykreslený
(0 importov v repe — overené v kóde, nie fetchom), takže GA bežalo bez súhlasu.
Vlna D (PR #517) bola správna oprava.

**Poučenie (AP-005):** doména v prehliadači nie je doména projektu. Pred vyhlásením
„nemeriame" treba overiť, ktorý projekt danú doménu servíruje.

**Overené 2026-09-04:** `NEXT_PUBLIC_GA_MEASUREMENT_ID` je nastavené v Production
a meranie na `app.revolis.ai` beží. Zostáva otvorené: GA chýba v `(public)`
a `(dashboard)` layoutoch — rieši samostatné zadanie.

---

## 2. Rozhodnutia

### P0 — Rozsah merania: meriame len vlastné povrchy *(rozhodnutie foundera, 3.9.2026)*

> Naša analytika meria **našu** Lead Factory. Zákazníkove weby nemeriame.

**Meriame:**
- `revolis.ai` a všetky `(marketing)` stránky
- widget odhadu ceny na `/odhad/[agencySlug]` — **náš** kód, **naša** doména, **náš** konverzný pomer
- produktové povrchy Revolisu, keď sa na to zavedie samostatné rozhodnutie

**Nemeriame:**
- `realitysmolko.sk` ani žiadny iný zákaznícky web
- kontajner `GTM-M9RSV74N` sa nedotýkame — patrí zákazníkovi
- správanie návštevníkov zákazníckych webov sa do našich systémov neťahá

**Dôvod (a je dvojaký).** Obchodný: naša metrika je výkon nášho produktu, nie
výkon zákazníkovej marketingovej agentúry. Právny: ťahať správanie návštevníkov
cudzieho webu do našich systémov nie je konektor, ale spracovateľská zmluva
a posúdenie GDPR. To sa neotvára ako vedľajší efekt analytickej úlohy.

**Otvorené rozhodnutie → sekcia 5, O1.**

### P1 — Externý nástroj nikdy nie je doménový model

GA4, Search Console, Google Ads a akýkoľvek budúci zdroj sú **adaptéry**.
Doménové pojmy Revolisu (`Visitor`, `Session`, `Intent Signal`, `Lead`,
`Qualified Lead`, `Conversion`) sú naše a nesmú preberať názvoslovie
poskytovateľa.

```
GA4 API  →  GA4 adaptér  →  doménový model Revolis  →  aplikácia
```

Nikdy `aplikácia → GA4 všade`. Následok porušenia: výmena poskytovateľa =
prepisovanie aplikácie.

### P2 — Deterministika pred LLM

Poradie voľby nástroja je záväzné:

```
deterministická logika  →  štatistika  →  pravidlá  →  LLM
```

LLM sa nesmie použiť na výpočet, ktorý sa dá spočítať. Rozdiel období, trend,
percentuálna zmena, konverzný pomer, prahová detekcia — všetko deterministicky.
LLM dostane až **kandidáta na insight** a robí to, čo výpočet nevie: hľadá
vysvetlenie.

*(Zovšeobecnenie bodu 7 z acquisition-os-v2.2.)*

### P3 — FAKT / HYPOTÉZA / ODPORÚČANIE sa nesmú miešať

Každý výstup AI interpretačnej vrstvy musí tieto tri veci označiť oddelene.
Hypotéza sa nikdy nesmie zobraziť ako meraný fakt.

Toto je priamo obrana proti `AP-005 — Nepodložený predpoklad vydávaný za fakt`
a `AP-001 — Fake metriky vydávané za live dáta`. V analytickej vrstve je riziko
najvyššie, lebo výstup vyzerá ako číslo.

### P4 — Dátová minimalizácia smerom k modelu

Do LLM ide agregát, nie surové dáta. Nikdy: surové event payloady, identifikátory
používateľov, osobné údaje, veľké historické datasety.

```
agregácia  →  normalizácia  →  sumarizácia  →  LLM
```

### P5 — Cost governance: každý AI komponent má rozpočtový list

Bez týchto šiestich údajov sa AI komponent nemerguje:

| Pole | Význam |
|---|---|
| Trigger | čo ho spúšťa (nikdy „nepretržite") |
| Veľkosť vstupu | horná hranica v tokenoch |
| Trieda modelu | a prečo nestačí lacnejšia |
| Frekvencia | koľkokrát za deň/týždeň |
| Cache | čo sa cachuje a na ako dlho |
| Strop + fallback | max náklad a čo sa stane po jeho dosiahnutí |

Cachovaný deterministický výsledok má vždy prednosť pred opakovanou AI analýzou.

### P6 — Kontinuita kontextu je artefakt, nie konverzácia

Dôležité poznanie musí skončiť v repe, nie v chate. Žiadny systém sa nesmie
spoliehať na to, že si nasledujúca session pamätá predchádzajúcu.

Väzba na existujúce: Decision Memory podľa `engineering-constitution.md`,
`decisions.md`, `docs/architecture/`. **Nezakladá sa nový paralelný log** — to by
bolo porušenie princípu 3 Ústavy (neduplikuj existujúcu logiku).

### P7 — Zapnuté je viac ako postavené

**Toto je najdôležitejší princíp v dokumente a nepochádza z návrhu — pochádza
z produkčných dát Revolisu.**

Stav k 3.9.2026:

```
leads                    504   →  auto_response_sent_at ≠ NULL:  0
portal_listings            0 riadkov
property_price_trail       0 riadkov
scheduled_events           tabuľka v produkcii neexistuje
GA4 eventy                 6 typov napísaných  →  measurement ID nenastavené
```

Päť subsystémov. Kód existuje, testy prechádzajú, PR sú zmergované. Ani jeden
nevyprodukoval riadok v databáze.

**Pravidlo:** definícia hotového pre každú funkciu, ktorá má produkovať dáta, je
**riadok v produkčnej databáze**, nie zelený build. PR, ktorý pridáva schopnosť,
musí v popise uviesť SQL dotaz, ktorým sa overí, že sa spustila — a kým je jeho
výsledok nula, funkcia nie je hotová.

Väzba: `AP-007 — Aktivita zamenená za pokrok`. Tento princíp je jeho konkrétna
podoba pre dátové funkcie.

---

## 3. Non-goals (výslovne nestaviame)

```
autonómne nasadzovanie do produkcie
agent swarm nad analytikou
autonómny marketingový systém
ML lead scoring
realtime AI analýza každého eventu
dátový sklad
vlastný MCP server nad GA4
```

Ak niektorá z týchto vecí bude potrebná, príde ako samostatný ADR s vlastným
dôkazom opodstatnenosti (princíp 4 Ústavy).

---

## 4. Prečo sa dnes nestavia nič

Tri blokátory, všetky overené:

1. **Nie sú dáta.** `NEXT_PUBLIC_GA_MEASUREMENT_ID` nie je nastavené. Analyzovať
   sa nedá nič.
2. **Nie je objem.** Aj po zapnutí treba baseline. Na desiatkach návštev za mesiac
   je detekcia anomálií generátor náhodných čísel — jedna návšteva je jednotky
   percent vzorky.
3. **Nie je poradie.** Pred analytikou idú `P0 HONEST UNKNOWN MAPPING` (oprava
   mapovania Realvia) a `Vrstva 1 — rýchla odpoveď`. Obe produkujú riadky
   v databáze. Analytika ich len meria.

**Postupnosť:** zapnúť meranie → 30 dní zbierať → pripojiť GA4 MCP **read-only**
a pýtať sa ručne → až keď sa tie isté otázky opakujú, postaviť sémantickú vrstvu
podľa P1–P6.

Princíp 5 Ústavy (jednoduchosť pred flexibilitou, YAGNI) hovorí presne toto:
abstrakcia až po dôkaze opakovaného vzoru.

---

## 5. Otvorené rozhodnutia pre foundera

**O1 — `agency_slug` v GA4 eventoch.**
`lib/valuation/analytics.ts` posiela do GA4 `agency_slug` pri každom evente. To
znamená, že naše GA4 bude vedieť rozlíšiť konverzný pomer widgetu **podľa
zákazníka**. Nie je to osobný údaj a nie je to meranie zákazníkovho webu — je to
výkon nášho widgetu na našej doméne. Ale je to per-tenant údaj a chcem, aby si to
schválil vedome.

- **A)** Ponechať. Vieme, ktorému zákazníkovi widget konvertuje a ktorému nie —
  bez toho je metrika priemer cez všetkých a nepoužiteľná na zásah. *(moje odporúčanie)*
- **B)** Odstrániť. Merať len agregát cez všetkých tenantov.

**O2 — Ktoré GA4 property.**
Existujúce alebo nové, vyhradené pre Revolis Lead Factory? Ak existujúce už
obsahuje historický šum z testov, čistý štart dá čitateľnejší baseline.

**O3 — Kľúčová udalosť.**
Navrhujem `lead_submitted` na `/odhad/[agencySlug]` ako jedinú key event vo
fáze 1. Je to koniec **nášho** funnelu.

---

## 6. Väzba na existujúce dokumenty

| Dokument | Vzťah |
|---|---|
| `acquisition-os-v2.2-final-locked.md` | nadradený pre Google Ads; body 7 a 8 sú zdroj P2 a P1 |
| `engineering-constitution.md` | nadradený; P6 a sekcia 4 sa opierajú o princípy 3, 4, 5 |
| `antipatterns-log.md` | P3 → AP-001, AP-005; P7 → AP-007 |
| `decisions.md` | sem ide 5-riadkové zrkadlo po GO |

---

## 7. Definícia hotového pre tento ADR

- [ ] Founder schválil P0–P7
- [ ] Founder rozhodol O1, O2, O3
- [ ] Overené vo Verceli, či `NEXT_PUBLIC_GA_MEASUREMENT_ID` existuje v Production
- [ ] Zrkadlo v `decisions.md`
- [ ] Súbor v repe cez PR (nie priamo do main)

Kým nie je O1 rozhodnuté, nespúšťa sa meranie.
