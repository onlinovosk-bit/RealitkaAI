# Growth Metrics Definitions v0

**Stav:** NÁVRH definícií (nie implementácia)  
**Dátum:** 2026-09-03 · **Vlastník:** founder (schválenie) / L99 (udržiavanie textu)  
**Rozsah:** sémantická vrstva pojmov pre Growth Intelligence — bez nových prahov, bez kódu.  
**Väzba:** `adr-2026-09-03-growth-intelligence-principles.md` (P1 doménový model, P3 FAKT/HYPOTÉZA, P7 riadok v DB)  
**Brief:** Overnight Master Brief 16 · AGENT-A · A3

---

## 0. Ako čítať tento dokument

Každý pojem má: **Názov · Biznis význam · Výpočet · Zdroj dát · Závislosti · Obmedzenia · Vlastník.**

**Pravidlá v0 (záväzné):**

1. Žiadny prah, ktorý nemá oporu v produkčných dátach alebo v existujúcom kóde ako *explicitný* kontrakt merania. Ak hranica chýba → `NEZNÁME — treba N pozorovaní`.
2. Doménové pojmy nesmú byť synonymá GA4 eventov (ADR P1). GA4/CRM sú zdroje, nie názvoslovie.
3. FAKT = čo sa dnes dá spočítať z existujúceho zápisu. HYPOTÉZA = návrh stavu / kvality bez dátovej opory.

**Povinné vstupy prečítané pred písaním (2026-09-03):**

| Súbor | Čo z neho berieme |
|---|---|
| `apps/crm/src/lib/valuation/analytics.ts` | 6 merateľných eventov funnelu widgetu |
| `apps/crm/src/lib/ai/lead-triage-batch.ts` | priorita práce Vysoká/Stredná/Nízka; sparse-import heuristika `score > 0` vs `score === 0` |
| `apps/crm/src/lib/rescore-lead.ts` | zápis `leads.score` podľa `LEAD_SCORE_SOURCE` (`crm` \| `combined`); default passthrough cez `brain-rescore` |
| Produkčný stav (Brief 16) | `leads.status` má jedinú hodnotu `Nový` (448/504 u Smolka); `leads.score` má 4 hodnoty v rozsahu 0–70 **bez pravidla za nimi** |

**6 eventov, ktoré vieme merať dnes** (`lib/valuation/analytics.ts` → GA4 adapter, kým je `NEXT_PUBLIC_GA_MEASUREMENT_ID` nastavené):

| Event name (adapter) | Doménový signál (nie synonymum pojmu) |
|---|---|
| `valuation_started` | začiatok relácie na widgete odhadu |
| `step_completed` | dokončený krok formulára (+ `step_name`) |
| `valuation_shown` | zobrazený odhad (+ `has_estimate`) |
| `contact_submitted` | odoslané kontaktné údaje |
| `lead_submitted` | konverzia funnelu widgetu (+ `source=valuation_widget`, `property_type`) |
| `abandon` | opustenie funnelu (+ `last_step`) |

Kontext každého eventu: `agency_slug`, `ab_variant`, `session_id`.

---

## 1. Visitor

| Pole | Obsah |
|---|---|
| **Názov** | Visitor |
| **Biznis význam** | Osoba (alebo anonymná relácia), ktorá vstúpila na meraný povrch Revolis Lead Factory — nie na zákaznícky web (ADR P0). |
| **Výpočet** | Počet unikátnych `session_id` (alebo ekvivalent session kľúča z analytického adaptéra) s aspoň jedným eventom na meranom povrchu v okne T. |
| **Zdroj dát** | Valuation analytics eventy (vyššie); po zapnutí GA4 property cez adapter. CRM `leads` **nie je** zdrojom Visitor. |
| **Závislosti** | Zapnuté meranie (`NEXT_PUBLIC_GA_MEASUREMENT_ID`); cookie consent gating (Brief 16 vlna D) pred produkčným zbieraním. |
| **Obmedzenia** | Dnes: FAKT — eventy sú v kóde, produkčný gtag môže byť stále vypnutý (ADR §1). Cross-device / logged-in identita: `NEZNÁME — treba N pozorovaní`. |
| **Vlastník** | Produkt (definícia) · Engineering (instrumentácia) |

---

## 2. Engaged Visitor

| Pole | Obsah |
|---|---|
| **Názov** | Engaged Visitor |
| **Biznis význam** | Visitor, ktorý prejavil interakciu nad rámec prvého načítania — začal alebo pokračoval vo funneli odhadu. |
| **Výpočet** | Visitor s aspoň jedným z: `valuation_started`, `step_completed`, `valuation_shown`. (Minimum: `valuation_started`.) |
| **Zdroj dát** | Rovnaké valuation eventy + `session_id`. |
| **Závislosti** | Definícia Visitor; funkčný widget `/odhad/[agencySlug]`. |
| **Obmedzenia** | **Žiadny časový ani početný prah** (napr. „≥2 kroky“, „≥30 s“) nie je odvodený z produkčných dát → `NEZNÁME — treba N pozorovaní` pre sprísnenie. Bounce mimo valuation widgetu: mimo rozsahu P0 merania. |
| **Vlastník** | Produkt |

---

## 3. High Intent Visitor

| Pole | Obsah |
|---|---|
| **Názov** | High Intent Visitor |
| **Biznis význam** | Engaged Visitor blízko konverzie — videl výsledok odhadu a/alebo začal kontaktnú fázu, ešte nemusí byť Lead. |
| **Výpočet (v0, viazaný na existujúce eventy)** | Engaged Visitor s `valuation_shown` **alebo** `contact_submitted` v tej istej `session_id`. |
| **Zdroj dát** | `valuation_shown`, `contact_submitted` (+ kontext). |
| **Závislosti** | Engaged Visitor; spoľahlivé párovanie eventov cez `session_id`. |
| **Obmedzenia** | Toto **nie je** Qualified Lead. Prah „koľko krokov / aký `has_estimate`“: `NEZNÁME — treba N pozorovaní`. Intent mimo widgetu (portál, telefonát): mimo tohto v0. |
| **Vlastník** | Produkt |

---

## 4. Lead

| Pole | Obsah |
|---|---|
| **Názov** | Lead |
| **Biznis význam** | Záznam osoby/dopytu v CRM, ktorý agentúra môže spracovať — vzniká zápisom do `leads`, nie GA4 eventom. |
| **Výpočet** | `COUNT(*)` riadkov v `public.leads` spĺňajúcich filter tenantu (`agency_id`) v okne T. Vznik z widgetu je *korelovaný* s eventom `lead_submitted`, ale **zdroj pravdy je CRM riadok** (acquisition-os v2.2 bod 8 / ADR P1). |
| **Zdroj dát** | `leads` (id, agency_id, status, score, source, note, created_at, contact fields, …). Inbound cesty: valuation submit, inbound API, acquire email, import, atď. |
| **Závislosti** | Auth/tenant kontext; konzistentný insert (vrátane sandbox vs non-sandbox). |
| **Obmedzenia** | Produkčne (Brief 16): 504 leadov, z toho Smolko 448 so statusom výhradne `Nový`. Event `lead_submitted` bez riadku v DB = schopnosť nie je hotová (ADR P7). |
| **Vlastník** | CRM / Growth |

---

## 5. Qualified Lead

| Pole | Obsah |
|---|---|
| **Názov** | Qualified Lead |
| **Biznis význam** | Lead, ktorý spĺňa **explicitné** kritérium „stojí za predajný čas makléra“ — nie len existuje v databáze. |
| **Výpočet** | **V0: NIE JE DEFINOVANÝ OPERAČNE.** Dôvod: `leads.status` sa v produkcii nehýbe (`Nový` = 100 % pozorovaných u referenčného tenantu); `leads.score` má 4 hodnoty v 0–70 **bez pravidla**; triage (`lead-triage-batch`) produkuje prioritu dňa (Vysoká/Stredná/Nízka), nie kvalifikáciu; `rescore-lead` zapisuje skóre, ale `brain-rescore` dnes skóre predovšetkým **prechováva** (default 50 ak chýba), nie kalibrovaný model kvalifikácie. |
| **Zdroj dát** | Budúci: stavový model leadu (sekcia 10) + overené polia (kontakt, súhlas, typ dopytu). **Nie** surový `leads.score` bez schválenej kalibrácie. |
| **Závislosti** | Schválený stavový model; baseline pozorovaní po zapnutí merania a po Vrstve 1 (rýchla odpoveď). |
| **Obmedzenia** | Prah skóre pre „qualified“: `NEZNÁME — treba N pozorovaní` (odporúčané: aspoň desiatky kvalifikácií s ľudským verdiktom makléra, nie len AI priorita). Mapovanie AI priority → Qualified: **zakázané** bez founder GO (P3 — hypotéza ≠ fakt). |
| **Vlastník** | Founder (definícia) · maklérsky proces (validácia) |

---

## 6. Warm Lead

| Pole | Obsah |
|---|---|
| **Názov** | Warm Lead |
| **Biznis význam** | Lead s preukázaným záujmom / nedávnou interakciou, ešte nie nutne Sales Opportunity. |
| **Výpočet** | **V0: NIE JE DEFINOVANÝ OPERAČNE.** V kóde sa vyskytujú *komentárové* / UI statusy typu „Teplý“ (`daily-actions.ts`) a AI label „TEPLÝ“ v `ai-engine.ts` viazaný na skóre, ale **produkčný kanonický status set ich nepoužíva** (všetko `Nový`). |
| **Zdroj dát** | Budúci: `leads.status` / aktivita (`last_contact`, správy) po zavedení stavového modelu. |
| **Závislosti** | Qualified Lead definícia; zápis kontaktov (Vrstva 1 auto-response mení `auto_response_sent_at`, nie status). |
| **Obmedzenia** | Prahy skóre v `ai-scoring.ts` / `ai-engine.ts` (napr. ≥40, ≥70, ≥80) **nesmú** byť prevzaté ako Warm bez kalibrácie na produkčných outcome → `NEZNÁME — treba N pozorovaní`. |
| **Vlastník** | Produkt + zákaznícky success |

---

## 7. Sales Opportunity

| Pole | Obsah |
|---|---|
| **Názov** | Sales Opportunity |
| **Biznis význam** | Obchodná príležitosť s reálnym ďalším krokom predaja (obhliadka, ponuka, vyjednávanie) — užší pojem než Lead. |
| **Výpočet** | **V0: NIE JE DEFINOVANÝ OPERAČNE** v CRM pipeline. Proxy **nie** odvodzovať z `leads.score`. |
| **Zdroj dát** | Budúci: stav leadu + explicitné entity (obhliadka / deal), keď budú v produkcii s nenulovými riadkami (P7). |
| **Závislosti** | Qualified Lead; ľudský alebo deterministický prechod (nie LLM ako jediný rozhodca — ADR P2). |
| **Obmedzenia** | Bez tabuľky / statusu s produkčnými riadkami je akékoľvek číslo „opportunities“ AP-001 riziko. |
| **Vlastník** | Founder / Sales process |

---

## 8. Lead Conversion Rate

| Pole | Obsah |
|---|---|
| **Názov** | Lead Conversion Rate |
| **Biznis význam** | Podiel návštevníkov meraného funnelu, ktorí sa stanú Leadom. |
| **Výpočet (v0 návrh)** | \( \frac{\#\{\text{session\_id s } lead\_submitted\}}{\#\{\text{session\_id s } valuation\_started\}} \) v okne T, voliteľne segmentované podľa `agency_slug` (otvorené O1 v ADR). Alternatívny CRM variant: \( \frac{\text{nové leads zo source valuation}}{\text{Visitor}} \) — len ak je join `session_id` ↔ lead spoľahlivý (`note` / sid pattern). |
| **Zdroj dát** | Valuation eventy; CRM `leads` pre CRM-side kontrolu. |
| **Závislosti** | Visitor + Lead; GA measurement ID; O1 rozhodnutie pre per-tenant report. |
| **Obmedzenia** | Bez GA dát je metrika 0/undefined (P7). Malý objem → nestabilné % (ADR §4). **Žiadny „dobrý“ benchmark** nie je stanovený → `NEZNÁME — treba N pozorovaní`. |
| **Vlastník** | Growth |

---

## 9. Traffic Quality

| Pole | Obsah |
|---|---|
| **Názov** | Traffic Quality |
| **Biznis význam** | Kvalita prichádzajúceho trafficu na meraných povrchoch — nakoľko Visitorovia postupujú k High Intent / Lead. |
| **Výpočet (v0 návrh, bez prahov)** | Kompozit **reportovaných pomerov**, nie jedno skóre: (a) Engaged / Visitor, (b) High Intent / Engaged, (c) Lead / Visitor (Lead Conversion Rate), (d) `abandon` rate podľa `last_step`. Agregát „quality score 0–100“: **nezavádzame**. |
| **Zdroj dát** | Valuation eventy; po čase aj Qualified Lead rate (keď bude definovaný). |
| **Závislosti** | Definície 1–4 a 8; per-`agency_slug` ak O1 = A. |
| **Obmedzenia** | Kvalita ≠ objem. Prahy „dobrá/zlá kvalita“: `NEZNÁME — treba N pozorovaní` (min. baseline obdobie po zapnutí merania — ADR odporúča ~30 dní). |
| **Vlastník** | Growth |

---

## 10. Návrh stavového modelu leadu

**Účel:** opraviť fakt, že Revolis nemá operačnú definíciu kvalifikovaného leadu — preto ostáva status `Nový`. Toto je **návrh**, nie migrácia ani UI zmena.

### 10.1 Navrhované statusy

| Status | Biznis význam | Kedy vzniká (spúšťač) | = Qualified? |
|---|---|---|---|
| `Nový` | Lead existuje, ešte nebol ľudsky spracovaný | Insert do `leads` (akákoľvek inbound cesta) | Nie |
| `Kontaktovaný` | Prebehla prvá odpoveď / pokus o kontakt | Auto-response odoslaná (`auto_response_sent_at` set) **alebo** maklérom zaznamenaný kontakt (`last_contact`) — *ktorá vetva je kanonická: NEZNÁME do GO* | Nie |
| `Kvalifikovaný` | Explicitná kvalifikácia (ľudský verdikt alebo schválené deterministické pravidlo) | Maklér nastaví status / checklist kvalifikácie; **nie** samotné AI triage Vysoká | **Áno** — toto je Qualified Lead |
| `Teplý` | Aktívny záujem, follow-up beží | Aktivita po kvalifikácii (správa, návrat do funnelu, dohodnutý ďalší krok) — prah frekvencie: `NEZNÁME — treba N pozorovaní` | Áno (podmnožina Qualified) |
| `Obhliadka` | Domluvená / prebehnutá obhliadka | Záznam termínu / výsledku obhliadky | Áno → kandidát na Sales Opportunity |
| `Ponuka` | Aktívna cenová / obchodná ponuka | Záznam ponuky | Áno → Sales Opportunity |
| `Vyhraný` / `Stratený` | Uzavretie | Explicitný outcome | N/A (terminálne) |
| `Neplatný` | Spam, duplicita, bez kontaktu, mimo ICP | Maklér / deterministické pravidlo (napr. sparse import bez kontaktu — zhodné so signálom `isSparseImportLead`, ale **status** mení človek alebo schválený job) | Nie |

### 10.2 Prechody (minimálny graf)

```
Nový → Kontaktovaný → Kvalifikovaný → Teplý → Obhliadka → Ponuka → Vyhraný
                                         ↘ Stratený / Neplatný (z ktoréhokoľvek ne-terminálneho)
Nový → Neplatný
```

**Zakázané skoky v0 (návrh):** `Nový` → `Kvalifikovaný` bez kontaktu; `score` alebo AI priority **samé** nemenía status.

### 10.3 Čo dnes kód už vie (FAKT), čo nie (HYPOTÉZA)

| FAKT | HYPOTÉZA / NEZNÁME |
|---|---|
| Insert nastavuje typicky `status = "Nový"` | Kedy automaticky posunúť na `Kontaktovaný` |
| Triage: Vysoká/Stredná/Nízka + reason (SK) | Mapovanie priority → status |
| Sparse import (`score === 0`, bez kontaktu, prázdny/import note) → Nízka bez LLM | Automatický `Neplatný` |
| `rescore-lead` update `score` / `ai_insight` | Prah score = Qualified |
| Valuation funnel eventy existujú | GA4 riadky v produkcii |

### 10.4 Definícia „kvalifikovaný“ pre metriky

Do schválenia sekcie 10 platí:

> **Qualified Lead = lead so statusom `Kvalifikovaný` (alebo neskorší non-terminal status z tabuľky 10.1), po tom, čo status model existuje v produkcii s nenulovými prechodmi.**

Do vtedy je Qualified Lead v reportoch **NEDEFINOVANÝ** — reportovať ako N/A, nie ako 0 a nie ako „score ≥ X“.

---

## 11. Čo tento dokument nespúšťa

- Žiadnu zmenu `leads` schémy, enumov, UI pipeline, ani scoring kódu.
- Žiadny Growth Intelligence agent, anomaly detection, ani Model Routing.
- Žiadne spätné prepisovanie 504 existujúcich leadov.

**Ďalší krok po GO:** zapnúť meranie → zbierať baseline → až potom kalibrovať prahy a implementovať stavový model v samostatnom BO/PR.
