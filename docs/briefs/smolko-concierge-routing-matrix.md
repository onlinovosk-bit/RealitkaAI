# Smolko Concierge — SMO-B06 Callback Routing Matrix

**Status:** `DRAFT` — nie je PASS, kým p. Smolko nepodpíše  
**Blokátor:** [SMO-B06](./reality-smolko-blocking-conditions-register.md)  
**Uzol:** N06  
**Dátum draftu:** 2026-09-17  
**Tenant:** Reality Smolko (Revolis CRM)  
**Scope:** handoff záujemcu z Website Concierge → maklérovi / fallback inbox  
**Mimo scope:** booking/calendar (B07–B09), odosielanie správ zákazníkom, prod zápisy

```
APPROVED_BY: _pending_
GO-B06-ROUTING: NOT_GRANTED
```

> Bez podpisu p. Smolka ostáva výsledok **HUMAN**. N07 (public Concierge) sa **nesmie** stavať, kým nie je `GO-B06-ROUTING` udelené.  
> Riadky označené `PROPOSED` sú návrh Product/Engineering — **nie** schválené pravidlá.

---

## 1. Cieľ

Spoľahlivé odovzdanie záujemcu z Concierge tak, aby:

1. lead išiel k správnemu maklérovi (alebo explicitnému fallbacku),
2. zákazník nedostal falošný sľub o čase odpovede,
3. ukladali sa len minimálne PII potrebné na callback,
4. opakovaný submit nevytvoril duplicitný lead (idempotency — overí sa E2E).

**Register PASS:** routing matrix + 10 E2E callbackov bez duplicitného leadu.  
**Register Fallback:** všeobecný inbox/telefón schválený p. Smolkom.

---

## 2. Role a zdroje identity

| Role | Zdroj (kód / dáta) | Poznámka |
|---|---|---|
| **Listing broker** | `properties.broker_name` / `broker_email` / `broker_phone` (Realvia sync) | Primárny kontakt pri property-bound záujme |
| **Zákazníkom zvolený broker** | výber v Concierge UI (ak bude povolený) | Musí byť zo schváleného zoznamu aktívnych maklérov |
| **Fallback broker / inbox** | **OPEN — rozhodnutie p. Smolka** | Telefón / e-mail / CRM inbox; default nie je inventovaný |
| **Agency desk** | Revolis lead workspace (`/leads`) | Interný dohľad; nie zákaznícky kontakt |

`owner_name` / `owner_phone` na property **nie sú** routing cieľ pre Concierge callback (majiteľ ≠ maklér).

---

## 3. Routing matrix — rozhodovacie pravidlá

Vyhodnocuj **zhora nadol**; prvé splnené pravidlo vyhráva.

| # | Podmienka | Cieľ handoffu | Stav pravidla | Visitor copy (povolené) | Zakázané sľuby |
|---|---|---|---|---|---|
| R1 | Záujem viazaný na **konkrétnu aktívnu** ponuku **a** listing má neprázdny `broker_email` alebo `broker_phone` **a** maklér je `available` (viď §4) | **Listing broker** | `PROPOSED` | „Odovzdáme váš kontakt maklérovi tejto ponuky.“ | „Maklér vám zavolá do X minút.“ |
| R2 | Záujem viazaný na ponuku, listing broker **chýba** alebo je `unavailable` (OOO / mimo hodín podľa §4) **a** je nastavený fallback | **Fallback broker / inbox** | `PROPOSED` | „Maklér ponuky teraz nie je k dispozícii — odovzdáme na recepciu / zastupujúceho makléra.“ | Konkrétne meno bez potvrdenia; fiktívny SLA |
| R3 | Záujem **nie je** viazaný na ponuku (všeobecný dopyt) **a** návštevník **nezvolil** makléra | **Fallback broker / inbox** | `PROPOSED` | „Odovzdáme váš dopyt tímu Reality Smolko.“ | Priradenie konkrétneho mena bez výberu |
| R4 | Návštevník **explicitne zvolil** makléra zo schváleného zoznamu **a** zvolený maklér je `available` | **Zákazníkom zvolený broker** | `PROPOSED` — **vyžaduje GO**, či UI výber vôbec existuje | „Odovzdáme váš kontakt vybranému maklérovi.“ | Ignorovanie výberu bez vysvetlenia |
| R5 | Zvolený maklér je `unavailable` | **Fallback** (+ poznámka „preferred: {broker_id}“) | `PROPOSED` | „Vybraný maklér teraz nie je k dispozícii — odovzdáme na zastupujúci kontakt.“ | Tiché prepísanie výberu |
| R6 | Konflikt: listing broker ≠ zvolený broker | **OPEN** — pozri otázky Q1–Q2 | `OPEN` | Do schválenia: **nezverejniť** výber makléra v UI, alebo explicitný copy po rozhodnutí | Automatické „vyhráva listing“ bez podpisu |
| R7 | Žiadny listing broker, žiadny fallback, žiadny výber | **Hard fail** — callback sa **neuloží** ako „doručený“; visitor dostane human fallback kontakt schválený v B05 | `PROPOSED` | Text schválený v SMO-B05 (telefón / formulár) | Tiché zahodenie leadu |
| R8 | Duplicate / replay toho istého callbacku (rovnaký idempotency kľúč) | **Žiadny nový lead** — vrátiť existujúci `lead_id` / status | `PROPOSED` (technické; PASS dôkaz = E2E) | Neutrálne „už sme to prijali“ | Druhý lead, druhé priradenie |

### 3.1 Priorita pri property-bound lead (návrh na podpis)

```
IF property_id known AND listing_broker resolvable AND available
  → R1 listing broker
ELSE IF customer_selected_broker AND feature enabled AND available
  → R4 selected
ELSE IF fallback configured
  → R2/R3/R5 fallback
ELSE
  → R7 hard fail + B05 human contact
```

**Conflict R6** nie je v strome, kým p. Smolko nerozhodne Q1/Q2.

---

## 4. Dostupnosť, pracovné hodiny, neprítomnosť, SLA

### 4.1 Stavy makléra ( Concierge runtime )

| Stav | Definícia (návrh) | Routing dopad |
|---|---|---|
| `available` | V pracovných hodinách **a** nie je OOO | R1 / R4 OK |
| `outside_hours` | Mimo schváleného okna | Treba fallback; copy bez „zavoláme ihneď“ |
| `ooo` | Explicitná neprítomnosť (dovolenka / PN / manuálny flag) | Ako unavailable → fallback |
| `unknown` | Chýbajú údaje o hodinách/OOO | **Fail-closed:** správať ako unavailable → fallback |

Zdroj hodín / OOO: **OPEN (Q3–Q5)** — bez schváleného zdroja sa nesmie tvrdiť real-time dostupnosť.

### 4.2 Pracovné hodiny — placeholder do podpisu

| Položka | Hodnota | Stav |
|---|---|---|
| Timezone | `Europe/Bratislava` | `PROPOSED` |
| Pondelok–Piatok | **TBD** (napr. 09:00–17:00) | `OPEN` |
| Sobota / Nedeľa / sviatky | **TBD** | `OPEN` |
| After-hours správanie | Len fallback + „ozveme sa v pracovných hodinách“ | `PROPOSED` |

### 4.3 SLA copy — bez falošného sľubu

Povolené formulácie (`PROPOSED`, finálne znenie môže ísť cez B05):

| Situácia | Povolené | Zakázané |
|---|---|---|
| V hodinách + available broker | „Ozveme sa vám čo najskôr v pracovných hodinách.“ | „Do 15 minút“, „garantovane dnes do …“ |
| Mimo hodín / OOO / fallback | „Prijali sme dopyt. Ozveme sa v najbližších pracovných hodinách.“ | „Maklér je online“, countdown, fake queue |
| Hard fail (R7) | Human kontakt z B05 | „Systém to vybavil“ |

**Interný cieľový SLA (nie zákaznícky sľub):** `OPEN (Q6)` — napr. first-touch do N hodín v rámci desk procesu; **nezobrazovať** návštevníkovi, kým to p. Smolko neschváli ako verejný text.

---

## 5. Minimálny PII kontrakt (callback)

Súlad s draftom B05 (privacy/FAQ) — toto je **technický minimum** pre handoff, nie právny text.

### 5.1 Polia

| Pole | Povinné? | Účel | Ukladá sa? | Poznámka |
|---|---|---|---|---|
| `phone` **alebo** `email` | Áno (≥1) | Callback kontakt | Áno | Aspoň jeden kanál |
| `phone` + `email` | Nie | Preferovaný kanál | Áno ak zadané | |
| `display_name` | Odporúčané | Oslovenie maklérom | Áno ak zadané | Nie rodné číslo / adresa bydliska |
| `property_id` | Ak property-bound | Routing R1 | Áno (ID, nie celý listing dump) | Musí byť Smolko tenant |
| `preferred_broker_id` | Len ak R4 povolené | Routing R4/R5 | Áno ak zadané | Zo schváleného zoznamu |
| `intent` | Odporúčané | `viewing` / `info` / `sell` / `other` | Áno (enum) | Bez voľného PII v free-texte ak sa dá |
| `message` | Nie | Kontext pre makléra | Áno, **max dĺžka TBD (Q7)** | Bez vyžiadania citlivín |
| `consent_contact` | Áno | Legal basis kontaktovať | Áno (bool + timestamp) | Oddelené od marketing |
| `consent_marketing` | Nie | Marketing | Áno len ak explicitne | Default `false` |
| `source` | Áno (systém) | `concierge` + page URL / listing ref | Áno | Audit |
| `idempotency_key` | Áno (systém/klient) | Anti-duplicita | Áno | E2E PASS kritérium |
| `created_at` / `agency_id` | Áno (systém) | Tenant + retention clock | Áno | |

**Nesmie sa pýtať / ukladať v M1:** rodné číslo, číslo OP, presná adresa bydliska, platobné údaje, súbory dokladov.

### 5.2 Kam a ako dlho

| Aspekt | Návrh | Stav |
|---|---|---|
| Úložisko | Revolis CRM lead (tenant Reality Smolko) — tabuľka/API podľa existujúceho leads kontraktu | `PROPOSED` |
| Prístup | Len agency scoped (RLS / server scope); žiadny public read leadu | `PROPOSED` |
| Retention kontaktných PII | **TBD (Q8)** — návrh: do vybavenia + N mesiacov / podľa interného GDPR schedule | `OPEN` |
| Retention po odmietnutí / stale | Anonymizácia alebo mazanie podľa B05 | `OPEN` via B05 |
| Logy | Bez raw telefónu/e-mailu v plain application logoch (maskovanie) | `PROPOSED` |
| Notifikácia maklérovi | Až po B09 / schválenom kanáli — **tento draft neodosiela** | S0 zákaz |

---

## 6. E2E scenáre (checklist — 10)

Implementácia testov (`smolko-concierge-callback.verification.test.ts`) až po `GO-B06-ROUTING` a v write-sete N07 / follow-up. Tu je **acceptance checklist**.

| ID | Scenár | Vstup | Expected outcome |
|---|---|---|---|
| E2E-01 | Property-bound + listing broker available | Aktívna ponuka, broker email/phone, v hodinách | Lead priradený **listing broker**; visitor copy R1; **1** lead |
| E2E-02 | Property-bound + listing broker OOO | Rovnaká ponuka, broker `ooo`, fallback nastavený | Lead na **fallback**; poznámka preferred listing broker; copy R2 |
| E2E-03 | Property-bound + listing broker mimo hodín | `outside_hours`, fallback OK | Lead na fallback; SLA copy „pracovné hodiny“; žiadny „ihneď“ |
| E2E-04 | Property-bound + chýba broker na listingu | `broker_*` prázdne, fallback OK | Lead na fallback; nie owner_phone |
| E2E-05 | Všeobecný dopyt bez property | Bez `property_id`, bez výberu makléra | Lead na fallback (R3); intent uložený |
| E2E-06 | Výber makléra (ak feature ON) + available | `preferred_broker_id` valid + available | Lead na zvoleného (R4) |
| E2E-07 | Výber makléra unavailable | preferred OOO + fallback | Lead na fallback + preferred poznámka (R5) |
| E2E-08 | Idempotentný replay | Dva POST s rovnakým `idempotency_key` | **Žiadny** druhý lead; rovnaký `lead_id` / 200-idempotent |
| E2E-09 | Chýba kontakt aj consent | Bez phone/email alebo `consent_contact=false` | **4xx**; lead nevznikne |
| E2E-10 | Hard fail bez fallbacku | Žiadny broker, fallback nekonfigurovaný | R7: nie „delivered“; visitor dostane B05 human kontakt; lead buď nevznikne alebo status `unroutable` podľa schválenia Q9 |

**Doplnkové negatíva (nie v desiatke, ale vhodné neskôr):** cross-tenant `property_id` → reject; neplatný `preferred_broker_id` → reject alebo fallback podľa GO.

---

## 7. OPEN QUESTIONS FOR SMOLKO

Odpovede sem doplní p. Smolko / Product; bez nich matrix ostáva `DRAFT`.

| ID | Otázka | Prečo blokuje |
|---|---|---|
| **Q1** | Má návštevník vôbec vyberať makléra, alebo vždy ide listing broker / recepcia? | Zapína/vypína R4–R6 |
| **Q2** | Pri konflikte listing vs zvolený maklér: kto vyhrá? | R6 |
| **Q3** | Aký je **oficiálny fallback** (meno / telefón / e-mail / zdieľaný inbox)? | R2/R3/R5/R7 |
| **Q4** | Pracovné hodiny (po–pia, víkend, sviatky) v `Europe/Bratislava`? | `outside_hours` |
| **Q5** | Ako sa hlási neprítomnosť makléra? (kalendár, manuálny flag, vždy fallback mimo hodín) | `ooo` / `unknown` |
| **Q6** | Interný first-touch cieľ (hodiny) — len interný process, alebo aj verejný text? | SLA copy |
| **Q7** | Max dĺžka voľnej správy; zakázané témy v message? | PII / abuse |
| **Q8** | Retention kontaktných údajov z Concierge (mesiace / udalosť)? | PII kontrakt + B05 |
| **Q9** | Pri R7: lead vôbec nevytvárať, alebo vytvoriť so statusom `unroutable` pre desk? | E2E-10 |
| **Q10** | Zoznam aktívnych maklérov pre výber (ak Q1=áno) — odkiaľ sync (CRM profiles vs manuálny list)? | R4 validácia |

---

## 8. GO brána

```text
GO-B06-ROUTING
  REQUIRES:
    - p. Smolko (alebo delegát) odpovie Q1–Q10 alebo explicitne označí N/A
    - APPROVED_BY vyplnené menom + dátumom
    - fallback kontakt schválený (nie _TBD_)
    - zákaznícke SLA copy bez falošného sľubu odsúhlasené (môže zdieľať texty s B05)
  AFTER GO:
    - status tohto dokumentu → APPROVED
    - register SMO-B06 môže ísť na PASS až po dôkaze 10 E2E (CODE + beh), nie samotným podpisom matrix
    - N07 smie začať implementáciu callback handoffu podľa tejto matrix
  UNTIL GO:
    - RESULT = HUMAN
    - N07 = BLOCKED na routing
```

---

## 9. Väzby

| Dokument | Vzťah |
|---|---|
| `docs/briefs/reality-smolko-blocking-conditions-register.md` § SMO-B06 | Riadiaci blokátor |
| `docs/prompts/smolko-website-concierge/nodes/N06-smo-b06-callback-routing.md` | Worker kontrakt |
| `docs/prompts/smolko-website-concierge/S0-system.md` | Zákaz public traffic bez B06 PASS |
| N05 privacy/FAQ draft | Consent, disclosure, human fallback copy |
| N07 public Concierge | Spotrebúva túto matrix po GO |

---

## 10. Change log

| Dátum | Zmena |
|---|---|
| 2026-09-17 | N06: prvý DRAFT matrix + PII min + 10 E2E + open questions; `APPROVED_BY: _pending_` |
