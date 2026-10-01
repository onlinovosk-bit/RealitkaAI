# Founder Customer Acquisition Research Loop — Revolis.AI

**Dátum:** 2026-09-18 · **Stav:** NÁVRH + 30-dňový operačný systém · **Engineering:** 0 € (okrem označených)
**Vstup:** founder rámec `Pain → Diagnostic → Proof → Pilot → Outcome → Subscription`
**Nadradené:** `docs/sales/gtm-playbook-2026-09-18.md` · `docs/architecture/revolis-constitution-v2.md` · `clay-positioning-reframe.md`

> Founderov rámec je prijatý — nahrádza trojdelenie (problém / owner / akvizícia) jedným loopom.
> Tento dokument ho konfrontuje s dôkazmi v repe a robí z neho 30-dňový plán.

---

## 0. Tri nálezy, ktoré menia plán

### Nález 1 — Engine 5 a Stratégia B už existujú. A zlyhali na distribúcii, nie na mechanike.

„Revenue Leakage Audit" / „product-led diagnostic" **nie je nápad na postavenie. Je to
SHIPPED produkt od 6. 7. 2026.**

| Čo | Dôkaz |
|---|---|
| `/proof` funnel — dotazník → leak výpočet → Revenue Health skóre → CTA | `docs/briefs/BO-001-proof-of-value.md` → *SHIPPED, merged #275, prod smoke OK* |
| Leak engine existuje v kóde | `apps/crm/src/lib/proof/` (`engine.ts`, `constants.ts`, `schema.ts`, testy) |
| Model počíta presne to, čo navrhuješ | `responsePenalty`, `lostShare`, `avgRevenuePerDeal` → `monthlyLeakEur` |
| **Výsledok za 3 mesiace** | `saas_leads` = 14 celkom, z toho 11× `source=proof` — **všetko smoke/test**, vrátane `proof-smoke@revolis.test` |
| Reálnych prospectov | **0** |

Zdroj: `docs/audit/d5-akvizicia-2026-07-09.md` (D5-1, D5-6).

**Dôsledok pre plán:** ak by sme teraz stavali Revenue Leakage Audit, staviame druhýkrát vec,
ktorá stojí nepoužitá. **Úzke hrdlo nie je diagnostický nástroj. Je to návštevnosť, ktorú naň
nikto neposlal.** 30-dňový plán preto váži 80 % úsilia na *dopravu do diagnostiky*
a 20 % na jej doladenie.

### Nález 2 — NAR dáta sú z amerického trhu a v jednom bode hovoria proti nám

Citované čísla (CRM 23 % vs. sociálne siete 39 %, 66 % šetrenie času, 64 % klientska skúsenosť,
63 % obava o presnosť AI) pochádzajú od **National Association of Realtors — USA**.
Z tejto session som ich neoveril a ani po overení by nešlo o dôkaz o slovenskom majiteľovi RK:
iná štruktúra trhu, iné MLS prostredie, iná veľkosť kancelárií.

Dve poznámky:
1. **CRM 23 % < sociálne siete 39 %** je argument *proti* vedeniu komunikácie cez CRM —
   to je v súlade s našou zmenou kategórie, nie jej podporou.
2. **63 % obava o presnosť AI** je ale silná a smerovo použiteľná: podporuje AP-001 disciplínu
   a náš „earn it, don't claim it" postoj. Tam ju berieme ako *hypotézu*, nie ako údaj.

**Máme lepší, lokálny a priamy dôkaz** — tri nezávislé slovenské rozhovory
(`memory/decisions.md:501`), ktoré hovoria konkrétnejšiu vec než „šetrenie času":

> kancelárie odmietajú ponuky AI/CRM, lebo **nikto im nedodá klientov, ktorí chcú predať**

Pri konflikte US prieskumu a troch priamych slovenských rozhovorov **vyhráva lokálny dôkaz.**

### Nález 3 — Founder Dashboard (Stratégia D) je dnes data-blocked

Obrazovka, ktorú navrhuješ, potrebuje presne tie dáta, ktoré nemáme:

| Riadok návrhu | Potrebuje | Stav |
|---|---|---|
| „7 leadov bez follow-upu" | `activities`, `last_contact_at` | `activities` = **3 za 31 dní** |
| „4 horúce leady stagnujú" | zmeny `status` v čase | `matches_new` = **0 každý deň** |
| „€XXX pipeline at risk" | provízia × pravdepodobnosť | zdroj nie je pripojený |
| „Maklér X má 6 overdue" | per-maklér aktivita | neexistuje |
| `leads.last_contact_at` stĺpec | migrácia | **visí v PR #437, nezmergovaný** |

Postaviť ju dnes znamená ukázať samé nuly — alebo si čísla vymyslieť. To je AP-001
a presne tá chyba, ktorá už raz stála značku (+40 % kalkulačka, `decisions.md:584`).

**Nie je to zlý nápad — je predčasný.** Odomkne sa v okamihu, keď ranný zoznam začne
generovať aktivitu. Preto je v 30-dňovom pláne ako *výstup*, nie ako vstup.

---

## 1. Dôkaz vs. predpoklad (povinné oddelenie)

| Tvrdenie | Status | Zdroj |
|---|---|---|
| Kancelárie chcú predávajúcich, nie CRM | **DÔKAZ** | 3 nezávislé SK rozhovory, `decisions.md:501` |
| RK platí 300 €/tip na predávajúceho | **DÔKAZ** | `call-list-2026-07-w30.md` (KAMZÍK) |
| Diagnostický funnel bez návštevnosti nekonvertuje | **DÔKAZ** | D5-1/D5-6, 0 prospectov za 3 mesiace |
| Loop je na nule naprieč všetkými krokmi | **DÔKAZ** | north-star 31 dní |
| Majiteľ RK toleruje drahý chaos vo follow-upe | **PREDPOKLAD** | nemeraný u žiadnej RK vrátane našej referenčnej |
| Majiteľ chce „kontrolu nad tímom" viac než nové zákazky | **PREDPOKLAD** | plauzibilné, nepotvrdené SK dátami |
| „Šetrenie času" je hlavný dôvod adopcie | **PREDPOKLAD (US)** | NAR, neoverené, iný trh |
| Obava o presnosť AI brzdí adopciu | **PREDPOKLAD (US)** | NAR, smerovo konzistentné s naším AP-001 |

---

## 2. Ústredný konflikt — a ako ho rozhodnúť za 2 týždne

Tvoj rámec a repo dôkaz ukazujú na **dve rôzne bolesti**:

| | **H1 — Nedostatok** | **H2 — Únik** |
|---|---|---|
| Bolesť | „Nemám dosť predávajúcich" | „Strácam obchody na leadoch, ktoré už mám" |
| Opora | priamy SK dôkaz (3 rozhovory) | tvoj rámec + US prieskum |
| Ponuka | kalkulačka = zdroj majiteľov | Revenue Leakage Audit |
| Otvárač | „Privedieme vám majiteľov, ktorí chcú predať" | „Ukážeme, kde vám unikajú peniaze vo follow-upe" |
| Predpoklad, na ktorom stojí | RK má málo dopytov | RK má dosť dopytov a plytvá nimi |

**Nie sú zlučiteľné v jednej prvej vete.** A práve preto sa dajú rozhodnúť lacno:

> **Experiment E0 — split otváracej vety.** Jeden zoznam, jedna vlna, náhodne rozdelený
> na polovicu. Polovica dostane H1 otvárač, polovica H2. Meria sa **odpoveďová miera**
> a **miera dohodnutých hovorov**, nie podpisy.

Rozhodovacie pravidlo stanovené **vopred** (inak sa výsledok dá vyložiť akokoľvek):
- rozdiel < 5 p. b. → obe fungujú rovnako, ostávame na H1 (lacnejšie doručiteľné)
- rozdiel ≥ 5 p. b. → víťaz sa stáva hlavnou vetou na ďalších 60 dní
- obe < 5 % odpovedí → **problém nie je správa, ale zoznam alebo kanál** → späť na segmentáciu

Toto je jediný experiment v celom dokumente, ktorý treba spraviť **prvý**.

---

## 3. Päť stratégií v požadovanom formáte

### A — Predávaj kontrolu, nie CRM

| Pole | Obsah |
|---|---|
| Cieľ | Majiteľ RK, 3–15 maklérov |
| Spúšťač | Nemá prehľad, čo robia makléri s leadmi |
| Ponuka | 20 min: „kde vám pravdepodobne unikajú peniaze vo follow-upe" |
| Kanál | telefón po e-maile |
| Správa | otvor problém pred produktom; žiadne demo v prvej vete |
| Kroky | zaradiť do E0 ako vetva H2 |
| Očakávaný signál | vyššia ochota dať 20 min než na „demo CRM" |
| Úspech | ≥ 20 % dohodnutých hovorov z odpovedí |
| Zlyhanie | „to my vieme" → bolesť nie je vedomá → H1 vyhráva |
| Ďalší krok | pri úspechu → S4 audit na ich exporte |
| **Brána** | Q1 áno · Q9 áno · **BUILD (0 €)** |

### B — Revenue Leakage Audit

| Pole | Obsah |
|---|---|
| Cieľ | RK s ≥ 5 maklérmi a existujúcim tokom dopytov |
| Spúšťač | tuší, že sa leady strácajú, nevie vyčísliť |
| Ponuka | 1 A4: lead → nekontaktovaný → bez follow-up → stagnujúci → odhad úniku |
| Kanál | po hovore, na **ich exporte** |
| Správa | „vypočítané z vášho exportu" — nikdy z benchmarkov, ak máme ich dáta |
| Kroky | **nestavať nový nástroj** — použiť `lib/proof/engine.ts` a spustiť ho ručne |
| Očakávaný signál | majiteľ začne obhajovať čísla = bolesť je reálna |
| Úspech | 3 audity → aspoň 1 pilot |
| Zlyhanie | čísla nesedia s jeho pocitom → model je zlý, nie trh |
| Ďalší krok | až po 3 ručných auditoch zvážiť automatizáciu |
| **Brána** | Q1 áno · **GDPR gate otvorený** (cudzí export = osobné údaje → processor zmluva, retencia, balancing test 6(1)(f) + čl. 14) · **VALIDATE** |

### C — Shadow CRM (14 dní) ⭐ najlepší nový prvok

| Pole | Obsah |
|---|---|
| Cieľ | segment A (Realvia) — integrácia je hotová |
| Spúšťač | odmieta migráciu, ale nie pozorovanie |
| Ponuka | „nechajte nás 14 dní sledovať, čo sa deje okolo vašich leadov" |
| Kanál | po audite alebo priamo v hovore |
| Správa | nulový záväzok, nulová migrácia, nulová zmena návykov |
| Kroky | read-only napojenie → denný záznam → na 14. deň report |
| Očakávaný signál | súhlas prichádza rádovo ľahšie než súhlas s pilotom |
| Úspech | ≥ 2 RK povedia áno v prvej vlne |
| Zlyhanie | „a čo s tými dátami urobíte" → GDPR obava → potrebuješ hotovú odpoveď **vopred** |
| Ďalší krok | report na 14. deň = prirodzený prechod na platený pilot |
| **Brána** | Q1 áno · Q4/Q6 áno (unikátne dáta o správaní) · Q8 správny čas · **BUILD po GDPR bráne** |

**Prečo je toto najsilnejšie:** rieši súčasne dôkaz (Nález 1), aktiváciu aj moat — a je to
jediná ponuka v celom dokumente, ktorá od majiteľa nechce **žiadnu zmenu správania**.

### D — Founder Dashboard

| Pole | Obsah |
|---|---|
| Cieľ | majiteľ, po Shadow CRM |
| Spúšťač | videl report a chce ho denne |
| Ponuka | jedna obrazovka: „čo dnes potrebujem vedieť" |
| Kroky | **najprv ranný zoznam (S6), potom dashboard** — nie naopak |
| Očakávaný signál | otvára ho bez pripomenutia |
| Úspech | `activities` > 0 každý pracovný deň |
| Zlyhanie | ukazuje nuly → nestaval sa dashboard, staval sa prázdny rám |
| **Brána** | Q8 **„príliš skoro" DNES** → odomkne sa, keď `activities` > 0 a `#437` je v PROD |

### E — Benchmark medzi kanceláriami

| Pole | Obsah |
|---|---|
| Kroky | — |
| **Brána** | Q8 **VETO — príliš skoro.** Pri 1 zákazníkovi nie je z čoho robiť benchmark. → **Strategic Backlog** |
| Odomykacia podmienka | ≥ 8 kancelárií s aspoň 30 dňami dát |

---

## 4. Päť engines — reality check

| Engine | Verdikt | Prečo |
|---|---|---|
| **1 — Hyper-personalizovaný outbound** | **BUILD** | Hák per firma už používaš (`call-list`). Personalizácia = Guardian skóre ich inzerátov (verejné fakty, legálne). |
| **2 — Free Audit ako CTA** | **BUILD (copy)** | Nie je to nový nástroj, je to **iná prvá veta na `/proof`**. Zmena textu, nie kódu. |
| **3 — Founder-to-Founder, „hľadám 5 RK"** | **BUILD — priorita** | Zhoduje sa s nezávisle odvodeným S7 (kohorta design partnerov). Dve nezávislé odvodenia = silný signál. Rieši aj to, že referenčného klienta **nesmieš menovať**. |
| **4 — Case-study selling** | **BLOKOVANÉ** | Vyžaduje písomný súhlas s menovaním. Dnes ho nemáš od nikoho. Preto je to *výstup* Engine 3, nie samostatný engine. |
| **5 — Product-led diagnostic** | **UŽ EXISTUJE** | `/proof`, SHIPPED, 0 reálnych prospectov. Nestavať znova — poslať naň ľudí. |

---

## 5. 30-dňový Founder-led Acquisition OS

Predpoklad: **jeden človek, ~4 h denne na akvizíciu.** Všetko ostatné je vedľajšie.

### Týždeň 1 (19.–25. 9.) — zoznam a rozhodnutie o vete

| Deň | Akcia | Hotovo = |
|---|---|---|
| 1 | Zoznam 40 RK: segment A (Realvia) z regiónu PO/KE | 40 riadkov s poľami podľa `segmentacia-a-b-c-outreach.md` §6 |
| 1 | GDPR: rozhodnúť právny základ pre B2B kontakt (6(1)(f) + čl. 14) | zapísané, nie „vyriešime neskôr" |
| 2 | Guardian skóre 5 inzerátov pre prvých 20 firiem | 20 personalizovaných hákov |
| 3 | **E0 split:** 20× H1 veta, 20× H2 veta | odoslané, zaznamenané |
| 4–5 | Telefón D+2 po e-maile, 10/deň | každý výsledok v trackeri |

**Metrika týždňa:** odpoveďová miera H1 vs. H2.
**Zlyhanie:** < 5 % v oboch → problém je zoznam/kanál, nie správa. Nepokračuj vo vlne 2.

### Týždeň 2 (26. 9.–2. 10.) — audit a Shadow CRM

| Akcia | Hotovo = |
|---|---|
| 3 ručné Revenue Leakage Audity na exportoch (Engine 2/B) | 3× A4, každé číslo označené „z vášho exportu" |
| Ponúknuť Shadow CRM (C) každému, kto audit videl | ≥ 2 súhlasy |
| Engine 3: osloviť 5 kandidátov na design partnerstvo | ≥ 3 odpovede |
| Víťazná veta z E0 → prepísať `/proof` hero (Engine 2) | nasadené |

**Metrika:** počet dohodnutých 20-min hovorov.
**Zlyhanie:** 0 auditov odsúhlasených → ponuka je príliš invazívna → skús C pred B.

### Týždeň 3 (3.–9. 10.) — aktivácia, nie akvizícia

| Akcia | Hotovo = |
|---|---|
| **Ranný zoznam (S6)** u referenčného klienta: 5 mien, 5 dôvodov, 7:30, bez loginu | odoslaný 5× |
| Merať jedine: % mien, ktorým sa v ten deň zavolalo | číslo existuje |
| Shadow CRM beží u 2 RK, denný záznam | 14-dňové okno tiká |
| `#437` (`last_contact_at`) — rozhodnúť PROD | áno/nie |

**Metrika:** `activities` > 0 každý pracovný deň.
**Toto je jediný týždeň, ktorý nie je o akvizícii — a bez neho je celý zvyšok neudržateľný.**

### Týždeň 4 (10.–16. 10.) — dôkaz a prvý pilot

| Akcia | Hotovo = |
|---|---|
| Shadow CRM report pre 2 RK | 2× report s reálnymi číslami |
| Ponuka pilotu s cenou proti kotve 300 €/tip | ≥ 1 podpísaný pilot |
| Founder Dashboard (D) — **len ak** `activities` > 0 | inak odložiť bez výčitiek |
| Vyhodnotiť E0 a zapísať víťaznú hypotézu do `decisions.md` | rozhodnutie zaznamenané |

**Metrika 30 dní:** **1 nový platiaci pilot** + `activities` nenulové.
**Nie** 10 klientov. Jeden — nezávislý od referenčného klienta — je dôkaz, že motion existuje.

---

## 6. Čo sa v týchto 30 dňoch NEROBÍ

- Nestavia sa nový diagnostický nástroj (existuje).
- Nestavia sa benchmark (E, timing veto).
- Nestavia sa Founder Dashboard pred aktiváciou (D, data-blocked).
- Nepíše sa case study (chýba súhlas s menovaním).
- Nekupujú sa databázy, nescrapujú sa vlastníci ani osobné údaje.
- Nepoužívajú sa US čísla ako tvrdenie o slovenskom trhu.
- Nevydáva sa žiadne € číslo bez zdroja.

---

## 7. Otvorené brány

| # | Brána | Blokuje |
|---|---|---|
| G1 | **GDPR pre B2B outreach** — právny základ, balancing test, čl. 14. Skill `gdpr-advisor` nie je v tejto session dostupný | Týždeň 1 |
| G2 | **GDPR pre cudzí export** — processor zmluva, retencia, mazanie | Stratégia B |
| G3 | **S2 rozsah** — kde sa NBS úroveň zobrazuje (otázka ostáva otvorená) | poctivý odhad vo widgete |
| G4 | **`#437`** — `leads.last_contact_at` do PROD | S6 a Stratégia D |
| G5 | **Súhlas s menovaním** aspoň jednej RK | Engine 4 |

---

## 8. Jedna veta na záver

> Diagnostiku máme postavenú tri mesiace a neposlali sme na ňu jediného človeka.
> Nasledujúcich 30 dní nie je o tom, čo ešte postaviť — je o tom, koho na to priviesť.
