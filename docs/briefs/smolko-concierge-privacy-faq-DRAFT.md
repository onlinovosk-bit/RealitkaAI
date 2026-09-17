# SMO-B05 — Website Concierge privacy / AI disclosure / FAQ

**Status dokumentu:** `DRAFT` — nie je schválený na produkciu  
**Uzol:** N05  
**Register:** SMO-B05 (`BLOCKED` → vyžaduje GO-B05-COPY)  
**Dátum draftu:** 2026-09-17  
**Zdroje (read-only):**

- `docs/briefs/reality-smolko-blocking-conditions-register.md` § SMO-B05
- `docs/reports/2026-09-06-smolko-chatbot-status.md`
- `docs/legal/DPA_Reality_Smolko.md` (DRAFT, unsigned)
- `apps/crm/docs/legal/PRIVACY-POLICY-zasady-ochrany-osobnych-udajov.md`
- `docs/legal/seller-trust-legal-trust-contract.md` (controller/consent pattern)
- Trust Center: https://app.revolis.ai/trust-center
- EU AI Act čl. 50 · GDPR

---

## STOP — N07 zakázané do GO-B05-COPY

```text
N07 (public Concierge read MVP) je ZAKÁZANÉ, kým nie je udelené
GO-B05-COPY od Founder + Privacy + p. Smolko.

Tento súbor je DRAFT. Nesmie sa:
- publikovať na realitysmolko.sk ani app.revolis.ai marketing pages
- vkladať do production copy v apps/crm bez GO
- používať ako dôkaz PASS v registri

Fallback bez GO: neverejný interný preview bez reálnych kontaktov
(register SMO-B05).
```

**GO_REQUIRED:** `GO-B05-COPY`  
**APPROVED_BY (dokument):** `_pending_`  
**BLOCKS:** N07

---

## 0. Otvorené právne vstupy (HUMAN)

Pred schválením treba uzavrieť (owner: Founder + Privacy + p. Smolko):

| # | Otázka | Prečo blokuje |
|---|---|---|
| Q1 | Kto je **prevádzkovateľ** Concierge trafficu na webe Reality Smolko — Reality Smolko, s.r.o. solo, alebo joint s ONLINOVO? | Controller text + Art. 13 notice |
| Q2 | Doplniť IČO / sídlo / privacy kontakt Reality Smolko (DPA má `⚠️ DOPLNIŤ`) | Identita prevádzkovateľa |
| Q3 | Retention pre chat transcript + callback lead (návrh nižšie je CANDIDATE) | Retention sekcia |
| Q4 | Presný telefón / formulár / e-mail **human fallback** schválený p. Smolkom | Human fallback |
| Q5 | Či Concierge beží na realitysmolko.sk (embed) alebo len cez Revolis host — ovplyvňuje privacy URL | Disclosure umiestnenie |
| Q6 | Potvrdiť, že marketing consent zostáva **oddelený** a default OFF | Consent |

---

## 1. Disclosure — AI identifikácia (EU AI Act čl. 50)

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

### Návrh copy (SK) — viditeľné pred / pri prvej interakcii

> Táto konzultácia je **asistovaná umelou inteligenciou** (Website Concierge).  
> Odpovede sú orientačné a nemusia byť úplné.  
> **Nie ste v rozhovore s človekom.** Ak chcete hovoriť s maklérom Reality Smolko, použite tlačidlo „Spojiť s maklérom“ alebo kontakt nižšie.

### Návrh copy (kratší chip / header)

> AI asistent · nie človek · [Spojiť s maklérom]

### Umiestnenie (CANDIDATE)

1. Prvý viditeľný riadok widgetu (pred prvou správou používateľa).
2. Opakovanie pri žiadosti o kontaktné údaje.
3. Odkaz na plnú privacy notice / FAQ snapshot.

### Čo disclosure NEsľubuje

- potvrdený termín obhliadky (blokované SMO-B07–B09),
- právne záväzné tvrdenie o cene / dostupnosti,
- že „maklér už volá“ bez skutočného handoffu (SMO-B06).

---

## 2. Controller — prevádzkovateľ a sprostredkovateľ

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

### CANDIDATE model (z DPA Reality Smolko + seller-trust analýzy — nie verdikt)

| Rola | Subjekt | Poznámka |
|---|---|---|
| **Prevádzkovateľ (controller)** záujemcov z Concierge | **Reality Smolko, s.r.o.** | Brand webu, follow-up maklérom, privacy URL `https://www.realitysmolko.sk/ochrana-osobnych-udajov` |
| **Sprostredkovateľ (processor)** | **ONLINOVO, s. r. o.** (Revolis.AI), IČO 54166942, privacy@revolis.ai | Hosting Concierge / CRM podľa DPA čl. 28 — DPA je stále **DRAFT / unsigned** |
| **Joint-controller?** | `UNKNOWN — HUMAN DECISION` | Ak Revolis určuje means zberu (schema, AI vendor) spoločne so Smolkom, môže ísť o Art. 26 — **nesmie sa tvrdiť bez counsel** |

### Návrh notice (SK) — Controllerské údaje v Concierge

> **Prevádzkovateľ osobných údajov:** Reality Smolko, s.r.o.  
> **Kontakt pre ochranu údajov:** ⚠️ DOPLNIŤ (e-mail / telefón schválený p. Smolkom)  
> **Spracúvanie technickej vrstvy:** ONLINOVO, s. r. o. (Revolis.AI) ako sprostredkovateľ podľa zmluvy o spracúvaní.  
> **Ďalšie informácie:** [ochrana osobných údajov Reality Smolko](https://www.realitysmolko.sk/ochrana-osobnych-udajov) · [Revolis Trust Center](https://app.revolis.ai/trust-center)

### Zakázané do schválenia

- Tvrdiť „sme len processor“ alebo „sme joint controllers“ bez podpisu Privacy/counsel.
- Použiť Revolis privacy page ako jediný notice pre návštevníka realitysmolko.sk.

---

## 3. Purpose — účely spracúvania

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

| Účel | Popis | Právny základ (CANDIDATE) | MVP povolené? |
|---|---|---|---|
| P1 — Orientačné vyhľadanie ponúk | Typ / predaj-prenájom / lokalita nad tenant-scoped inventárom | Oprávnený záujem RK + návštevník žiada info (čl. 6(1)(f)) **alebo** súhlas so zobrazením AI odpovedí — **HUMAN** | Áno (read-only po B04+B05+B06) |
| P2 — Žiadosť o callback / handoff maklérovi | Odovzdanie min. kontaktu maklérovi Reality Smolko | Žiadosť o službu / kroky pred zmluvou (čl. 6(1)(b)) **CANDIDATE** | Áno |
| P3 — Prevádzková bezpečnosť | Rate-limit, abuse log (IP / session id) | Oprávnený záujem (čl. 6(1)(f)) | Áno, minimálne |
| P4 — Marketing / newsletter | Novinky, ponuky mimo aktuálnej žiadosti | **Len** samostatný súhlas (čl. 6(1)(a)) | Default OFF |
| P5 — Potvrdený booking termínu | Kalendár + notifikácie | Až po SMO-B07–B09 PASS | **Nie v MVP** |
| P6 — Tréning modelov tretích strán | — | — | **Zakázané** (align Privacy Policy Revolis s. 4) |

### Návrh purpose copy (SK)

> Údaje z tohto asistenta používame len na: (1) orientáciu v aktuálnych ponukách Reality Smolko, (2) vybavenie vašej žiadosti o kontakt maklérom, (3) ochranu služby pred zneužitím.  
> Na marketingové novinky vás nezaradíme, pokiaľ to výslovne nepovolíte samostatným súhlasom.

---

## 4. Retention — doba uchovávania

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

| Dátová sada | CANDIDATE retention | Poznámka |
|---|---|---|
| Chat transcript (bez PII / anonymizovaný) | 30 dní | Diagnostika kvality AI; bez marketingu |
| Callback lead (meno, telefón/e-mail, preferencie, property ref) | Do vybavenia žiadosti, max. podľa nastavenia RK; strop ako CRM prospects: **do ukončenia zmluvy RK + 90 dní** (Privacy Policy s. 7 — CANDIDATE align) | Owner: p. Smolko + Privacy |
| Abuse / security logy | 12 mesiacov | Align access logs Privacy Policy |
| Marketing consent evidence | Po dobu súhlasu + dôkaz odvolania (CANDIDATE 3 roky audit) | Len ak P4 zapnuté |
| Booking event | N/A do B07 | Neuvádzať vo verejnom FAQ ako aktívne |

### Návrh retention copy (SK)

> Kontaktné údaje z žiadosti o makléra uchovávame len po dobu vybavenia požiadavky a podľa pravidiel Reality Smolko / zmluvy so sprostredkovateľom.  
> Chat bez odoslaného kontaktu neuchovávame dlhšie, než je potrebné na bezpečnosť a kvalitu služby (návrh: 30 dní). Presné lehoty schváli Privacy pred GO-B05-COPY.

---

## 5. PII min — minimálny súbor údajov

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

### MVP callback (povinné len pri žiadosti o človeka)

| Pole | Povinné? | Limit / pravidlo |
|---|---|---|
| Meno alebo oslovenie | Áno | max. 80 znakov |
| Telefón **alebo** e-mail | Áno (aspoň jeden kanál) | E.164 / valid e-mail |
| Preferovaný čas kontaktu (voliteľné) | Nie | text / sloty — bez sľubu termínu |
| Property / lokalita / typ (z kontextu chatu) | Odporúčané | ID alebo short label, nie rodné číslo |
| Poznámka | Nie | max. 500 znakov |

### Zakázané zbierať v Concierge MVP

- rodné číslo, číslo OP, fotografie dokladov,
- platobné karty,
- osobitné kategórie (zdravie, biometria, …),
- „celý životopis“ / free-text PII dump bez účelu,
- súhlas na marketing ako podmienka callbacku.

### Návrh PII copy (SK)

> Na spojenie s maklérom stačí meno a telefón alebo e-mail. Viac údajov nepotrebujeme.

---

## 6. Consent — súhlasy a oddelenie marketingu

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

### Pravidlo (pevné pre draft aj GO)

1. **Notice acknowledgement** (privacy) ≠ marketing súhlas.  
2. **Žiadosť o callback** ≠ marketing súhlas.  
3. Marketing checkbox je **voliteľný**, default **OFF**, služba callbacku **nesmie** byť podmienená marketingom (GDPR čl. 7(2)/(4)).

### Checkbox A — privacy / notice (povinný pred odoslaním kontaktu)

> Prečítal(a) som si [informácie o ochrane osobných údajov](https://www.realitysmolko.sk/ochrana-osobnych-udajov) Reality Smolko. Údaje sa použijú na vybavenie tejto žiadosti.

### Checkbox B — service request (explicitná žiadosť — CANDIDATE wording)

> Žiadam **jeden** spätný kontakt od Reality Smolko na zvolenom kanáli ohľadom tejto nehnuteľnosti / dopytu. Toto **nie je** súhlas s newsletterom.

### Checkbox C — marketing (voliteľný, oddelený)

> Chcem občas dostávať novinky o ponukách e-mailom od Reality Smolko. Súhlas môžem kedykoľvek odvolať. **Ak nezaškrtnem**, callback z B ostáva platný a newsletter nedostanem.

### Evidence (CANDIDATE — implementácia až po GO, nie v tomto uzle)

- `privacy_ack_at`, `privacy_policy_version` / wording hash  
- `callback_request_at`, `contact_channel`  
- `marketing_opt_in` boolean default `false`  
- tenant / agency scope Reality Smolko

---

## 7. FAQ — snapshot (≥ 8 otázok)

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

### FAQ-01 — Som v chate s človekom?

Nie. Ide o AI asistenta (Website Concierge). Na spojenie s maklérom Reality Smolko použite „Spojiť s maklérom“ alebo kontakty v sekcii Human fallback.

### FAQ-02 — Čo AI vie a čo nie?

Vie orientačne filtrovať / vysvetliť ponuky podľa typu, predaja/prenájmu a lokality v rámci inventára Reality Smolko. **Nevie** právne radiť, potvrdiť termín obhliadky, ani sľúbiť cenu mimo zverejnených údajov.

### FAQ-03 — Odkiaľ berie informácie o nehnuteľnostiach?

Z tenant-scoped inventára Reality Smolko (napr. Realvia sync v CRM). Verejný matcher je podmienkou SMO-B04 (freshness + izolácia tenantov) — bez toho sa Concierge na produkciu nepúšťa.

### FAQ-04 — Aké osobné údaje od mňa chcete?

Pri bežnom prehliadaní žiadne kontaktné údaje. Pri žiadosti o makléra: meno + telefón alebo e-mail (minimum). Marketing len so samostatným súhlasom.

### FAQ-05 — Kto je prevádzkovateľ mojich údajov?

Návrh: Reality Smolko, s.r.o. Technickú platformu prevádzkuje ONLINOVO / Revolis.AI ako sprostredkovateľ. Finálne znenie schváli Privacy pred GO-B05-COPY.

### FAQ-06 — Ako dlho údaje držíte?

Kontakt z callbacku podľa pravidiel Reality Smolko / DPA (návrh stropu: do konca zmluvy + 90 dní). Chat bez kontaktu krátkodobo (návrh 30 dní). Presné lehoty = `_pending_`.

### FAQ-07 — Môžem požiadať o výmaz / prístup k údajom?

Áno — práva podľa GDPR (prístup, oprava, výmaz, obmedzenie, námietka, prenositeľnosť). Kontakt: privacy Reality Smolko (⚠️ DOPLNIŤ) a/alebo privacy@revolis.ai pre technickú vrstvu.

### FAQ-08 — Posielate mi marketing automaticky?

Nie. Newsletter / marketing len ak výslovne zaškrtnete samostatný súhlas. Callback tým nie je podmienený.

### FAQ-09 — Rezervuje AI termín obhliadky?

Nie v tejto fáze. Booking je blokovaný, kým nie sú PASS brány SMO-B07–B09. AI môže len zachytiť záujem a požiadať o callback.

### FAQ-10 — Ako sa dovolám človeku hneď?

Pozri sekciu **Human fallback** — telefón / formulár schválený p. Smolkom (zatiaľ placeholder).

---

## 8. Human fallback — cesta k človeku

**Status:** `DRAFT`  
**APPROVED_BY:** `_pending_`

### Požiadavka PASS (register)

Schválená cesta k človeku (telefón a/alebo formulár), viditeľná v UI Concierge aj keď AI zlyhá / návštevník odmietne AI.

### CANDIDATE UX

1. Persistentný odkaz / tlačidlo: **„Spojiť s maklérom“**.  
2. Sekundárne: **„Zavolať Reality Smolko“** (tel: link).  
3. Terciárne: webový kontaktný formulár na realitysmolko.sk (existujúci, ak schválený).  
4. SLA copy musí byť **pravdivá** — žiadne „ozveme sa do 5 minút“, kým to Smolko nepotvrdí (SMO-B06 routing).

### Placeholdery na doplnenie pred GO

| Kanál | Hodnota | Stav |
|---|---|---|
| Telefón | ⚠️ DOPLNIŤ — číslo schválené p. Smolkom | `_pending_` |
| E-mail / formulár | ⚠️ DOPLNIŤ — URL alebo adresa | `_pending_` |
| Pracovné hodiny copy | CANDIDATE: „v pracovných dňoch“ bez falošného SLA | `_pending_` |
| Fallback pri neprítomnosti | Všeobecný inbox (až po SMO-B06) | závisí B06 |

### Návrh fallback copy (SK)

> Preferujete človeka? Kliknite **Spojiť s maklérom** alebo zavolajte Reality Smolko na ⚠️ DOPLNIŤ. AI vám termín nepotvrdí — maklér vás kontaktuje podľa dostupnosti.

---

## 9. Mapovanie na SMO-B05 PASS

| PASS kritérium (register) | Sekcia tohto draftu | Stav |
|---|---|---|
| Viditeľné AI disclosure | §1 Disclosure | `DRAFT` |
| Controller / purpose / retention | §2–§4 | `DRAFT` |
| Minimum PII | §5 PII min | `DRAFT` |
| Samostatný marketing consent | §6 Consent | `DRAFT` |
| Schválený FAQ snapshot | §7 FAQ (≥8) | `DRAFT` |
| Cesta k človeku | §8 Human fallback | `DRAFT` |

**Register status ostáva `BLOCKED`**, kým nie je `GO-B05-COPY`.  
CODE / draft ≠ PROD PASS (S0 CODE ≠ PROD).

---

## 10. Explicitné zákazy tohto uzla

- Nepublikovať tieto texty na production pages.  
- Nemeniť `PUBLIC_PATHS` / auth proxy.  
- Neotvárať public Concierge traffic.  
- Neschvaľovať text „sám“ — len HUMAN (Founder + Privacy + Smolko).  
- **N07 zakázané do GO-B05-COPY.**

---

## S7 HANDOFF (N05)

```text
NODE: N05
RESULT: HUMAN
DRAFT: docs/briefs/smolko-concierge-privacy-faq-DRAFT.md
GO_REQUIRED: GO-B05-COPY (Founder + Privacy + Smolko)
BLOCKS: N07
```
