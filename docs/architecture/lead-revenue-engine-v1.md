---
title: "Lead Revenue Engine v1 — inžiniersky kontrakt"
project: Revolis.AI
type: architecture
status: living-document
created: 2026-09-24
tags: [revolis, leads, acquisition, attribution, c0-c1-c2, prompt-stack]
related:
  - "[[l99-lead-factory-initiative]]"
  - "[[master-data-sourcing-map]]"
  - "[[revolis-constitution-v2]]"
  - "[[clay-positioning-reframe]]"
---

# LEAD REVENUE ENGINE v1

> **Vzťah k Lead Factory briefu.** Tento dokument **nenahrádza**
> `docs/briefs/l99-lead-factory-initiative.md` a neopakuje jeho obsah.
> Brief vlastní **obchodnú bránu a slovník**: verdikt VALIDATE, definíciu
> C0/C1/C2 (§2.2), SLA výhradu, allowlist `source` (§2.5). Tento dokument
> vlastní **inžiniersky kontrakt**: ako sa lead spracúva, čo je deterministické,
> čo verzované a čo sa nesmie tvrdiť.
>
> Kde sa líšia, **platí brief**. Slovník sa tu cituje, nedefinuje.

---

## 1. Taxonómia — štyri pojmy, ktoré sa nesmú zlievať

Toto je jediné pravidlo, ktorého porušenie sa prejaví až ako nepravdivé tvrdenie
navonok, nie ako chyba v kóde. Preto je prvé.

| Pojem | Čo to je | Čo to NIE je |
|---|---|---|
| **Lead Generation** | Vznik nového dopytu. Vyžaduje **zdroj dopytu** pred záchytnou plochou. | Widget sám osebe. Chatbot sám osebe. Realvia. Portálový e-mail. |
| **Lead Acquisition** | Zachytenie alebo prijatie leadu do Revolisu. | Dôkaz, že dopyt vytvoril Revolis. |
| **Lead Intelligence** | Premena dôkazov na podklad pre rozhodnutie. | Externe komunikovateľný nárok (viď §9). |
| **Sales-Ready** | Prevádzkový stav „maklér môže konať teraz". | C1. Sales-Ready nastáva **pred** kontaktom. |

### 1.1 Atribučný test

Pre každý lead, o ktorom sa tvrdí, že bol vygenerovaný:

1. Čo spôsobilo, že tento človek vstúpil do lievika?
2. Bol ten mechanizmus prevádzkovaný Revolisom alebo kanceláriou cez
   Revolisom riadenú kampaň/funnel?
3. Je zdroj technicky zaznamenaný?
4. Je ten človek/príležitosť pre kanceláriu nová?

**Až keď dôkazy pokryjú 1–4:** `generation_state = GENERATED_BY_REVOLIS`.

Inak jeden z: `EXISTING_INBOUND`, `IMPORTED`, `REACTIVATED`, `REFERRAL`,
`UNKNOWN`.

> `UNKNOWN` sa **nikdy** ticho nemení na `GENERATED_BY_REVOLIS`.

Praktický rozlišovací znak: ak lead vie ukázať na vlastný zdroj dopytu
(kampaň, UTM, referral), je *generovaný*. Ak pritiekol cudzou rúrou, je
*akvirovaný*. Premortem Lead Factory to ukazuje na vlastnom príklade —
„Widget nabehol, Ads tĺkli C0": Ads sú zdroj dopytu, widget je záchytná plocha.

---

## 2. C0 / C1 / C2 — stav správy, nie zákon

Slovník je v briefe §2.2. Tu len jeho **governance status a technický dopad**.

- C0/C1/C2 sú **navrhovaná** meracia taxonómia (`D-2026-08-14-01`), nie
  nemenné produktové právo.
- Sémantiku **prebrať**, nevytvárať konkurenčný slovník.
- **Neprezentovať ako schválené KPI** pred founder GO.
- Pravidlá verzovať: `funnel_ruleset_version`, aktuálne `lead-funnel-v1-draft`.

**Tvrdé hranice, ktoré platia bez ohľadu na GO:**

| Pravidlo | Dôvod |
|---|---|
| AI skóre nevytvára C1 | C1 vyžaduje zaznamenaný **ľudský** pokus o kontakt |
| „Horúci" lead nevytvára C1 | to isté |
| AI nikdy nevytvára C2 | C2 je zapísaný výsledok skutočného rozhovoru |
| Bez `occurred_at` sa lead do C1 nepočíta | viď §3 |

---

## 3. Substrát merania (HOTOVO — PR #680)

Bez skutočného času prvého ľudského pokusu o kontakt je Sales-Ready → C1
nemerateľné a celé meranie Lead Factory je fikcia. Brief §2.4 to pomenoval
ako dátovú dieru; PR #680 ju zatvoril.

**Kanonická udalosť:** `lead_events.type = 'contact_attempted'`

Reuse, nie nová tabuľka — presne ako brief §2.4 predpísal (AP-019).
`public.activities` bolo zamietnuté: nemá `agency_id`, takže sa nedá
tenant-izolovať.

**Polia:** `occurred_at`, `actor_profile_id`, `channel`, `outcome`, `source`,
`note` (migrácia `20260924060000`).

**Resolver:** `getFirstContactAttemptAt(client, agencyId, leadId)` v
`apps/crm/src/lib/lead-contact-events/`. Vracia **tri stavy**:

```
{ state: "none" }                     // nikto sa nepokúsil
{ state: "unknown", attempts: N }     // pokusy sú, čas nie → NIE C1
{ state: "known", occurredAt }        // C1 kandidát
```

`created_at` sa **nikdy** nedosadí za `occurred_at`. Čas vloženia riadku nie je
čas, kedy zazvonil telefón.

**Otvorené:** `GO_CONTACT_EVENT_PROD_MIGRATION` — migrácia je pripravená,
neaplikovaná. Do jej aplikácie substrát existuje len v kóde.

---

## 4. Pipeline

```
ZDROJ DOPYTU → LEAD ACQUISITION → C0 → EXTRAKCIA SIGNÁLOV →
DETERMINISTICKÉ SKÓRE → DETERMINISTICKÁ KVALIFIKÁCIA → SALES-READY →
ĽUDSKÝ POKUS O KONTAKT → C1 → ROZHOVOR → C2 → OBHLIADKA →
MANDÁT → TRŽBA
```

---

## 5. Spracovací engine A1–A8

**Základný princíp: LLM len tam, kde treba sémantický úsudok. Obchodné stavy a
kritické pravidlá deterministicky.**

| Krok | LLM? | Výstup |
|---|---|---|
| A1 INGEST | nie | kanonický lead + provenance + `generation_state` |
| A2 DEDUP + TENANT ROUTE | nie* | `lead_id`, `agency_id`, `duplicate_state` |
| A3 EXTRAKCIA SIGNÁLOV | **áno** | signály s `evidence_span` |
| A4 READINESS SCORE | nie | `readiness_score`, `reason_codes[]` |
| A5 KVALIFIKÁCIA | nie | `qualification_state`, `reason_codes[]` |
| A6 ZOSTAVENIE FRONTY | nie | dve fronty (§7) |
| A7 ĽUDSKÁ AKCIA | nie | `LEAD_CONTACT_ATTEMPTED` |
| A8 NÁVRH KOMUNIKÁCIE | **áno** | návrh na schválenie |

\* A2 smie použiť sémantický tie-breaker na návrh duplicitného kandidáta, ale
**nikdy nesmie ticho zlúčiť identity** bez deterministickej istoty alebo
ľudského potvrdenia.

> **LLM výstup nie je nikdy kanonický obchodný stav.**

### 5.1 A3 — extrakcia signálov

Počiatočný rozsah zámerne úzky: `seller_intent`, `property_type`, `locality`,
`timeframe`. Žiadny 30-faktorový model.

Každý sémantický signál **musí** uložiť:
`signal_name`, `value`, `confidence`, `evidence_span`, `source_field`,
`extracted_at`, `extraction_version`.

> **Tvrdé pravidlo:** bez `evidence_span` sa signál nesmie považovať za
> `PRESENT`.

### 5.2 Verzovanie extrakcie

LLM extrakcia driftuje medzi verziami modelu a providera. Preto sa extrahované
signály ukladajú **oddelene od skóre**, s `extraction_version`
(napr. `seller-signal-extractor-v1`).

Dôvod je konkrétny: systém musí vedieť **pre-skórovať staré leady bez toho, aby
ich znova extrahoval**. Bez toho by sa determinizmus §5.3 len posunul o krok
vyššie a drift by presakoval cez vstup.

### 5.3 A4/A5 — deterministické jadro

Vstup: uložené signály + deterministické CRM fakty. **Žiadne volanie modelu
vnútri rozhodovacej funkcie.**

Pravidlá sú kód/konfigurácia, **nie prompt**. Každý výstup nesie
`ruleset_version` (napr. `seller-readiness-v1`).

**Invariant:** rovnaké signály + rovnaký `ruleset_version` = rovnaké skóre a
rovnaké rozhodnutie. Zmena modelu alebo providera nesmie zmeniť uložené skóre,
pokiaľ sa zámerne nepre-extrahuje alebo nezmení verzia pravidiel.

Kvalifikačné stavy: `QUALIFIED`, `NEEDS_INFO`, `NURTURE`, `DISQUALIFIED`,
`UNKNOWN`.

Tvrdé požiadavky pre predávajúceho:

```
QUALIFIED  ⟺  dôveryhodný seller intent
            ∧ existuje kontaktná cesta
            ∧ dostatočný kontext nehnuteľnosti/lokality
            ∧ žiadny explicitný opt-out
            ∧ žiadny tvrdý diskvalifikátor
```

`DISQUALIFIED` **len na základe dôkazu** (explicitne nemá záujem, už predal,
mimo obslužnej oblasti, preukázateľne neplatný kontakt). **Nízke skóre samo
osebe nie je diskvalifikácia** — patrí do `NURTURE` alebo `NEEDS_INFO`.

`UNKNOWN` ostáva `UNKNOWN`. Nikdy sa nemení na `FALSE` ani na `QUALIFIED`.

---

## 6. Sales-Ready kontrakt

Predkontaktný prevádzkový stav. `sales_ready = TRUE` vyžaduje **všetko**:

lead existuje · tenant známy · provenance prijateľná · existuje kontaktná cesta ·
seller intent doložený · nie je potlačený · nie je opt-out · nie je známy
duplikát · freshness prijateľná · `qualification_state != DISQUALIFIED` ·
je komu prideliť akciu · existuje `reason_to_contact_now`

> Sales-Ready **neimplikuje** C1.

---

## 7. Dve fronty — nemiešať

| Fronta | Obsah |
|---|---|
| **A — Sales Ready** | maklér môže konať teraz |
| **B — Review Required** | neistý duplikát, navrhnutá diskvalifikácia na kontrolu, nedostatočné/rozporné dôkazy, nízka confidence extrakcie, právna nejasnosť |

Položky z fronty B **nesmú zaplniť rannú Sales-Ready frontu**. Inak briefing
začne leadmi, ktoré na predajný zásah ešte nie sú pripravené.

Deterministické radenie fronty A: seller intent s vysokou confidence →
kvalifikovaný → freshness → vek bez kontaktu → obchodná priorita.

---

## 8. SLA — interné áno, navonok nie

**`EXTERNAL_SLA = NONE`.** Žiadne schválené číslo neexistuje; brief §2.2 vedie
4 pracovné hodiny ako **predpoklad** čakajúci na potvrdenie.

| Povolené | Zakázané |
|---|---|
| `age_since_capture` ako interné radenie | „do 15 minút", „do 4 hodín" navonok |
| oldest-uncontacted-first | SLA compliance % / breach % |
| recent high-intent first | akýkoľvek SLA timer v UI |

Fronta smie vek počítať. Nesmie ho nazvať SLA.

---

## 9. Positioning

Interné názvy (Lead Generation, Lead Acquisition, Lead Intelligence, Qualified
Lead Output, Sales-Ready Lead Set) sú v poriadku **interne**.

Navonok sa komunikuje výsledok, nie architektúra — v súlade s
`clay-positioning-reframe.md`.

| Nehovor | Hovor |
|---|---|
| „AI Intelligence Layer" | „Vieš, na ktorých leadoch sú reálne peniaze" |
| „garantované leady" | (len ak existuje zmluvná garancia) |
| „nové leady vygenerované Revolisom" | (len ak to atribúcia dokáže) |

Pred dôkazom P1 (§11) je pravdivá formulácia:

> „Revolis pomáha kancelárii zachytiť, vyhodnotiť a prioritizovať nové obchodné
> príležitosti a presne merať, odkiaľ prišli."

---

## 10. Nákladová telemetria — požiadavka, nie predpoklad

Doterajšie nákladové čísla sú **odhady**. Netvrdiť „pipeline stojí centy" bez
merania.

Pred akýmkoľvek nákladovým tvrdením over produkčnú podporu pre: `agency_id`,
provider, model, typ operácie, vstupné/výstupné tokeny, úspech/zlyhanie,
`cost_eur`, `occurred_at`.

> **Počítadlá spotreby nie sú to isté ako EUR náklad.** Ak `usage_metrics_daily`
> zaznamenáva aktivitu, ale nie EUR, nedá sa tvrdiť skutočný náklad zákazníka.

Až po reálnom EUR meraní: `cost_per_C0`, `cost_per_sales_ready`, `cost_per_C1`,
`cost_per_C2`.

**Kredity sa nezavádzajú len preto, že existuje spotreba tokenov.** Cenotvorba
reaguje na fakty, nie naopak — a je mimo rozsahu tohto dokumentu.

### 10.1 Abstrakcia modelov

PromptStack deklaruje **schopnostné vrstvy**, nie konkrétne modely:
`extract-cheap`, `classify-cheap`, `draft-quality`.

Mapovanie vrstva → provider/model patrí do provider konfigurácie. Tam žijú aj
konkrétne modely podľa `CLAUDE.md` a vendor-špecifická syntax cacheovania
(`cache_control`).

Architektonická požiadavka, ktorá platí naprieč providermi: **systémové prompty
musia byť stabilné, opakovane použiteľné a cacheovateľné.** To mení, ako sa
prompty píšu — nie je to len konfiguračný detail.

---

## 11. Rebrík dôkazov

Tvrdenia postupujú len cez dôkaz.

| Úroveň | Dôkaz |
|---|---|
| P0 | technický záchyt funguje |
| P1 | existuje atribuovaný net-new C0 |
| P2 | Sales-Ready výstup je užitočný |
| P3 | maklér lead reálne kontaktuje |
| P4 | existuje C1 |
| P5 | prebehol skutočný rozhovor / C2 |
| P6 | obhliadka |
| P7 | mandát / príležitosť |
| P8 | tržba |

> Netvrdiť „Lead Factory funguje" na úrovni P0.

**Každá metrika lievika musí byť oddeliteľná podľa `generation_state`.**
Nikdy nereportovať „Revolis vygeneroval 50 leadov", keď 45 prišlo z portálových
e-mailov.

---

## 12. Právne hranice

Podrobnosti v `master-data-sourcing-map.md`. Tu záväzné minimum:

| Trieda | Príklad | Stav |
|---|---|---|
| **A — first-party / so súhlasom** | ocenenie, Market Vision, vlastné formuláre, referral, opt-in Lead Ads | preferované pre Fázu 1 |
| **B — zmluvné / partnerské** | oficiálne API, autorizovaný feed | vyžaduje provenance + právny základ |
| **C — externé osobné údaje** | vlastníci z katastra, scrapované kontakty, kúpené databázy | **default OFF** |

**Pravidlo ÚGKK:** popisné údaje o vlastníkoch **nie sú** open data pre
komerčné vyhľadávanie predajcov. Zároveň platí `PHASE_1_REQUIRES_UGKK = FALSE` —
prvé MVP musí fungovať **bez** ÚGKK. Zmluva je samostatná founder úloha, nie
blokátor tejto pipeline.

**RPO** nie je v prvom seller MVP: prvý cieľ je fyzická osoba s úmyslom predať,
RPO je relevantné pre právnické osoby a B2B enrichment. →
`BACKLOG_B2B_ENRICHMENT`, pred aktiváciou právny review.

---

## 13. Bezpečnostné hranice

**LLM SMIE:** extrahovať seller intent a timeframe, sumarizovať, vysvetliť
dôkaz, navrhnúť odpoveď.

**LLM NESMIE:** vymyslieť intent, vymyslieť dôkaz, vytvoriť C1, vytvoriť C2,
ticho diskvalifikovať, zmeniť tenant routing, autonómne zlúčiť identity na
základe neistého dôkazu, odoslať čokoľvek von bez ľudského schválenia.

**Tenant:** každý nový perzistentný objekt musí byť agency-scoped. Testy musia
dokázať: tenant A číta svoje, tenant A nečíta B, tenant A nemení B. Bez dôkazu
o tenant izolácii sa nič z tohto enginu nenasadzuje.

---

## 14. Kill kritériá

| Zlyhanie | Signál | Čo je zlé |
|---|---|---|
| GENERATION | premávka je, C0 seller intent nie | ponuka/kanál |
| CAPTURE | intent je, dokončenie nízke | formulár/konverzia |
| PROCESSING | C0 je, Sales-Ready mešká/je zlý | engine |
| ACTION | Sales-Ready je, makléri nekontaktujú | workflow/adopcia |
| QUALIFICATION | >30 % kvalifikovaných je maklérom zjavne zle | pravidlá/extrakcia |
| TRUST | maklér nechápe PREČO je lead hore | evidence UX |
| ATTRIBUTION | zdroj sa nedá dokázať | netvrdiť generovanie |

**Notifikačná slučka:** vygenerovaný lead, o ktorom maklér nevie, je zlyhaná
slučka. Kill signál: 2 atribuovateľné nové C0 bez použiteľného upozornenia
alebo viditeľnosti vo fronte → pozastaviť škálovanie akvizície a opraviť
prevádzkovú slučku.

---

## 15. Definícia úspechu Fázy 1

Technický úspech nestačí. Fáza 1 vyžaduje dôkaz **uzavretej slučky**:

```
ATRIBUOVATEĽNÝ NOVÝ DOPYT → ZÁCHYT → SALES-READY →
ĽUDSKÁ AKCIA → SKUTOČNÝ ROZHOVOR
```

Prvý míľnik **nie je** predikcia tržby. Prvý míľnik je:

> „Vieme dokázať, odkiaľ príležitosť prišla a čo sa s ňou potom stalo."

---

## 16. Stav implementácie

| Vrstva | Stav |
|---|---|
| Substrát kontaktnej udalosti (§3) | **HOTOVO** — PR #680, migrácia čaká na GO |
| Atribúcia / `generation_state` (§1.1) | nezačaté |
| Extrakcia signálov (§5.1) | nezačaté |
| Deterministické skóre + kvalifikácia (§5.3) | nezačaté |
| Dve fronty (§7) | nezačaté |
| Napojenie ľudskej akcie (A7) | nezačaté |
| Nákladová telemetria (§10) | nezmerané |
| Generačný experiment (§1.1) | nezačaté, vyžaduje `GO_ADS` |

**Ľudské brány:** `GO_CONTACT_EVENT_PROD_MIGRATION`, `GO_C0_C1_C2`, `GO_ADS`,
`GO_LEGAL_SOURCE`.
