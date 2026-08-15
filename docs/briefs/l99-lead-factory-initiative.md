# L99 Lead Factory Initiative

**Status:** DRAFT (čaká founder GO na merge briefu; **žiadny produktový kód v tomto PR**)
**Kategória:** Strategic Bet
**Dátum:** 2026-08-14
**Vetva:** `cursor/l99-lead-factory-brief-1782`
**Premortem:** [`docs/premortems/2026-08-14-l99-lead-factory.md`](../premortems/2026-08-14-l99-lead-factory.md)
**Decision record:** `memory/decisions.md` → D-2026-08-14-01

> Toto **nie je feature**. Je to strategický program s vlastnou bránou.
> Tento brief **nezakladá** Lead Factory Council (desiatky tímov) ani
> tisícky strán knowledge base. Mapuje, čo už v repe existuje, zamkne
> právnu hranicu Fázy 1 a ako **prvý deliverable** predkladá návrh
> metriky „predhriaty lead“ na founder GO — nie ako predpoklad pred briefom.

---

## 0. Gate check (Ústava + Prime Directive)

| # | Otázka | Odpoveď |
|---|--------|---------|
| 1 | Zaplatil by za to dnešný klient? | **Áno pre Fázu 1** (first-party seller capture, ktorá už tečie do CRM). Smolko platí Ads na ocenenie; widget je v balíku (seat), nie samostatný SKU. Celá „továreň“ (ML, personalizácia, experimenty) by dnes **nezaplatil** → strop VALIDATE. |
| 2 | Zarobí klient viac do 90 dní? | **Mechanizmus:** majiteľ, ktorý sám požiadal o odhad, je bližšie k hovoru ako identita z Realvie. Skrátenie Lead → Telefonát **len ak** maklér stihne SLA. Bez SLA je to drahší inbox. |
| 3 | Skráti Lead → Telefonát → Obhliadka → Zmluva → Provízia? | Áno v kroku 1–2, **ak** meriame kontakt, nie len submit. |
| 4 | Posilňuje moat? | First-party seller intent + consent provenance je dáta, ktoré portálový scraping nedá. |
| 5 | Posilňuje flywheel? | Čiastočne. Používanie makléra (Zhluk 1) stále chýba — bez `lead_events` / reálneho `last_contact` sa flywheel netočí. |
| 6 | Nové unikátne dáta? | Áno: kto požiadal o odhad, s akým súhlasom, z akého kanála. Nie: kúpené databázy, kataster PII. |
| 7 | Vyššie ROI ako iné v backlogu? | Pre **definíciu metriky + meranie existujúceho widgetu** áno (nadväzuje na D-2026-08-06-01: priorita dodania predávajúcich). Pre stavanie novej akvizičnej engine **nie**. |
| 8 | Správny čas? | Fáza 1 (metrika + existujúci first-party povrch) = **správny čas**. ML / personalizácia / CRM Intelligence / Experimentation = **príliš skoro** (data-blocked, Zhluk 1). Timing veto → Strategic Backlog, bez ohľadu na skóre. |
| 9 | MVP < 2 týždne? | Metrika + instrumentácia existujúceho `/odhad/[slug]` áno. „Továreň“ nie. |
| 10 | Founder trap? | Riziko: Feature Trap (councily), Complexity Bias, Timing Error (učiť sa z dát, ktoré nie sú). Tento brief ich explicitne vynecháva. |
| 11 | Najlepšie využitie času? | Áno pre **zamknutie hranice + metriky**. Nie pre nový acquisition stack. |
| 12 | Jediná vec tento kvartál? | Nie celý program. Jediná vec z tohto briefu: **prijať metrikou a merať Fázu 1 na existujúcom widgete**. |

**Verdikt:** **VALIDATE** (otázka 1 pre plnú továreň = nie; otázka 8 pre ML = príliš skoro).
Fáza 0 tohto PR = dokument. Ďalší kód až po founder GO na definíciu metriky.

**Vzťah k existujúcim betom (nezamieňať):**

| Bet | Čo to JE | Čo to NIE JE |
|-----|----------|--------------|
| D-2026-08-06-01 | Priorita backlogu: dodať predávajúcich | Nie implementačný plán továrne |
| D-2026-08-09-01 Acquisition OS Stage 0 | Read-only Google Ads sync (`acquisition_events`) | Nie zdroj B2C leadov |
| Valuation widget VALIDATE | First-party seller capture | Nie „predhriaty lead“ kým nie je SLA |

---

## 1. Obchodná hranica (FOUNDER GO 2026-08-14)

**Fáza 1 — výhradne verejné / first-party zdroje.**

Povolené:

- vlastné formuláre a widgety (odhad, `/f/[slug]`, buyer-onboarding),
- reklama, ktorá posiela na **vlastný** first-party povrch (nie nákup zoznamu),
- partnerstvá, kde subjekt dáta poskytol sám (oficiálny export klienta, Lead Ads so súhlasom platformy — až po samostatnom GO, nie v tomto briefe),
- verejné **ne-osobné** dáta podľa `docs/architecture/master-data-sourcing-map.md` (RPO firmy, kataster geometria).

Zakázané v Fáze 1 (default):

- komerčne nakúpené databázy,
- externí poskytovatelia leadov,
- scraping osobných údajov (kataster vlastníci, portáloví predajcovia),
- stealth funnel / stealth recruiter (AP-011, legal hold).

**External lead providers + nákup databáz** = zamknutá právna brána, **default OFF**.
Odomknutie len po **podpísanom** balancing teste (GDPR čl. 6(1)(f)) + DPA.
Žiadny feature flag v kóde v tomto PR — brána je rozhodnutie, nie implementácia.

### Segment (Q1, potvrdené)

| Rola | Kto |
|------|-----|
| Zdroj leadu (B2C) | Predávajúci majiteľ nehnuteľnosti |
| Platiaci klient Revolisu (B2B) | Realitná kancelária |
| Spotrebiteľ leadu | Maklér tej kancelárie |

### Jurisdikcia (Q2)

- Fáza 1: **SR**.
- CZ / EÚ zdroje a compliance **teraz neriešiť**.
- Architektúra: jurisdikcia ako **konfigurovateľné pole**, nie hardcoded predpoklad v GDPR logike.
- **Reuse (FAKT):** `public.agencies.country` už existuje (`text not null default 'Slovensko'`, baseline migrácia). Ďalší kód nesmie tvrdiť „všetko je SK“ mimo defaultu. ISO kód vs. slovo „Slovensko“ = neskorší cleanup, nie tento brief.

### Open dependencies (Q3) — nie blocker draftu

| Položka | Stav | Vlastník |
|---------|------|----------|
| Zmluva ÚGKK na vlastníkov (Zhluk 3) | **NEZNÁME** | Founder (obchod/právo) |
| Dátové partnerstvo s portálmi (Zhluk 5) | **NEZNÁME** | Founder |
| Controller vs processor + privacy policy pred visitor identifiers | Otvorené (D-2026-08-06-01 podmienka 3) | Founder + AKMV |

---

## 2. Prvý deliverable — definícia „predhriaty lead“

**Toto je návrh na founder GO, nie hotový zákon.** Bez prijatia tejto (alebo upravenej) definície sa nestavia meranie ani nový kanál.

### 2.1 Prečo treba definíciu pred kódom

Dnes sa „lead“ mieša s **identitou z Realvie** (439 riadkov, budget/timeline prázdne — `memory/decisions.md` 2026-06-19) a s **odoslaným formulárom**. To nie je to isté. Bez slovníka každá dashboardová dlaždica skĺzne do AP-001 (fikcia dát).

### 2.2 Navrhovaný slovník (3 stavy)

| Stav | Názov | Podmienka (všetky musia platiť) | Čo to NIE JE |
|------|-------|----------------------------------|--------------|
| C0 | **Zachytený** | First-party submit + uložený súhlas (`lead_consents` alebo ekvivalent) + `leads.source` z allowlistu Fázy 1 | Import identity, kúpený riadok, stealth |
| C1 | **Predhriaty** | C0 + seller intent + minimálna kvalifikácia + **zaznamenaný pokus o osobný kontakt makléra v SLA** | Samotný submit; klik na reklamu; „Nový“ bez hovoru |
| C2 | **Kvalifikovaný rozhovor** | C1 + maklér zapísal výsledok hovoru (dohodnutá obhliadka / odmietol / neskôr / nedostupný) | Automatický triage score |

**Seller intent (Fáza 1):** žiadosť o odhad, explicitné „chcem predať“, alebo ekvivalent na first-party povrchu. Buyer dopyty **nie sú** súčasťou tejto metriky vo Fáze 1.

**Minimálna kvalifikácia (návrh):** telefón **alebo** e-mail + lokalita + typ nehnuteľnosti.

**SLA (návrh, číslo čaká na Smolka):** prvý pokus o kontakt do **4 pracovných hodín** v pracovnej dobe; inak nasledujúce pracovné ráno. Číslo je **PREDPOKLAD** — kým Smolko nepotvrdí, ostáva v zátvorkách (pozri premortem riziko #1).

### 2.3 Vzorec (keď bude GO)

- **Miera predhriatia** = počet C1 v okne / počet C0 v tom istom okne.
- **Miera rozhovoru** = C2 / C1.
- Úspech Fázy 1 **nie je** objem C0. Úspech je C1 a C2 pri udržateľnom CPL z Ads na vlastný URL.

### 2.4 Dátová diera, ktorá bráni meraniu dnes (FAKT)

- `leads.last_contact` je **text** (placeholder „Práve vytvorený“), nie spoľahlivý timestamp.
- Guardian v1.1 STALE vyžaduje `lead_events`; na PROD ich importované kontakty nemali (473 neplatných STALE, 2026-07-27).
- Bez záznamu času prvého kontaktu **C1 sa nedá čestne spočítať**. Ďalší implementačný krok po GO na definíciu: reuse `lead_events` / `last_contact_at` — **nie** nová tabuľka, kým Integration Report neukáže, že existujúca nestačí (AP-019).

### 2.5 Allowlist `source` pre C0 (Fáza 1, návrh)

| `leads.source` | Povrch | Stav v repe |
|----------------|--------|-------------|
| `valuation_widget` | `/odhad/[agencySlug]` | LIVE (migrácia + consent) |
| public lead form | `/f/[slug]` | LIVE (env token) |
| buyer-onboarding | `(public)/buyer-onboarding` | LIVE |
| `proof` | `/proof` → `saas_leads` | B2B SaaS lead, **mimo** tejto B2C metriky |

Realvia import identity **nie je** C0.

### 2.6 GO na definíciu

Founder buď (a) prijme §2.2–2.3, (b) upraví SLA / polia, alebo (c) vráti. Až potom vzniká implementačný BO (meranie C0/C1 na existujúcom widgete). **Tento PR kód nespúšťa.**

---

## 3. Integration Report (reuse pred novým kódom)

| Položka | Existuje? | Cesta |
|---------|-----------|-------|
| Valuation widget UI | áno | `apps/crm/src/app/(marketing)/odhad/[agencySlug]/page.tsx` |
| Submit API | áno | `POST /api/valuation/submit` |
| Lead mapper + consent | áno | `src/lib/valuation/lead-mapper.ts`, `consent-mapper.ts`; tabuľka `lead_consents` |
| Public lead form | áno | `src/app/f/[slug]/`, `src/lib/leads/inbound-form-config.ts` |
| Buyer onboarding | áno | `src/app/(public)/buyer-onboarding/` |
| Inbound triage | áno | `src/lib/acquire/inbound-lead-triage.ts` |
| Agency country | áno | `public.agencies.country` default `'Slovensko'` |
| RLS / tenant | áno | `tests/rls/` |
| Verification | áno | `tests/verification/valuation-widget.verification.test.ts`, `lead-form-public.verification.test.ts` |
| Lead discovery roadmap | áno | `docs/briefs/overnight/wave3-lead-discovery-roadmap.md` |
| Widget VALIDATE brief | áno | `docs/briefs/validation-valuation-widget.md` |
| CI legal hold | áno | AP-011 v `saas-grade-pipeline.yml` |
| Data sourcing map | áno | `docs/architecture/master-data-sourcing-map.md` |

**Jediná nová vec v tomto PR:** tento brief, premortem, decision record, index. Žiadna migrácia, žiadny adapter, žiadny flag.

**Ďalší kód (až po GO na §2):** instrumentácia C0/C1 na existujúcich tabuľkách — Builder musí znova prejsť reuse strom. Predvolená cesta: `reuse`, nie `new-code`.

---

## 4. Čo z „rady expertov“ už pokrýva repo (a čo nie)

Zakladateľský návrh Lead Factory Council **nerozbiehame**. Nižšie je mapovanie na existujúce artefakty. FAKT = súbor existuje. MEDZERA = dokument to sľubuje, súbor chýba.

### 4.1 Už existuje — reuse, nestojiť duplicitu

| Navrhovaný council | Čo to v repe reálne je | Dôkaz |
|--------------------|------------------------|-------|
| **Counter Intelligence** | Skill **Kontrolór** — adversariálna vrstva pred prijatím/merge (10 bodov + meta Devil’s Advocate / Future Regret / Architecture Drift) | `.claude/skills/kontrolor/SKILL.md` |
| **Strategic challenge pred Ústavou** | Skill **strategic-analysis** (Weakness Finder + Opportunity Gen) | `.claude/skills/strategic-analysis/SKILL.md` |
| **Closed-loop výber úloh** | Skill **task-loop** (GO brána, anti-drift, anti-prehadzovanie) | `.claude/skills/task-loop/SKILL.md` |
| **Legal & Ethics (proces)** | Data-sourcing map + AP-011 legal hold + GDPR stĺpce/consent na widgete | `master-data-sourcing-map.md`; `.github/workflows/saas-grade-pipeline.yml`; `lead_consents` |
| **Anti-Manipulation** | AP-001 (fikcia dát), Kontrolór bod 6, Ústava Q1/Q8, ZAKÁZANÉ AKCIE v lead-discovery prompte | `docs/architecture/antipatterns-log.md`; `docs/prompts/L99-lead-discovery-prompt.md` |
| **Lead Knowledge Base (mozog v1)** | `memory/` + `brain/` + `docs/` — Decision Memory, registry, identity, lessons. Nie „niekoľko tisíc strán“ | `memory/decisions.md`, `brain/ENGINE.md`, `brain/src/catalog.ts` |
| **Demand / Ads meranie (úzke)** | Acquisition OS Stage 0 (Google Test MCC, read-only) — **oddelené** od B2C leadov | D-2026-08-09-01 |
| **First-party capture** | Valuation widget + lead form + onboarding | pozri §3 |

### 4.2 MEDZERA — nesľubovať, že existuje

| Položka | Čo dokumenty tvrdia | FAKT v repe |
|---------|---------------------|-------------|
| **gdpr-advisor skill** | `CLAUDE.md` bod 5, `docs/security/AI_SECURITY.md`, BO šablóna | **Súbor chýba.** `.claude/skills/` obsahuje len `kontrolor`, `strategic-analysis`, `task-loop`. Procesná brána je popísaná, **nie je to spustiteľný skill**. Doplnenie skillu = samostatný chore PR, nie súčasť tohto briefu. |

### 4.3 Strategic Backlog — data-blocked (timing veto Q8)

Kým Zhluk 1 (vlastné behaviorálne CRM dáta z používania) nevznikne v objeme, **nestavať**:

| Council / vrstva | Prečo BACKLOG | Odomykacia podmienka (návrh) |
|------------------|---------------|------------------------------|
| Machine Learning | Nie je čo učiť; 439 identít bez kvalifikácie | N C1+C2 s outcome v čase (číslo až po GO na §2) |
| AI Personalization | Generický text vs. personalizácia potrebuje históriu správania | To isté + `lead_events` |
| CRM Intelligence (kedy volať / nechať byť) | Guardian bez events dáva falošné STALE | Reálne events, nie `created_at` fallback |
| Experimentation (stovky A/B) | Nemáme denný tok C0 ani SLA | Stabilný C0 z Ads/widgetu + tracking, ktorý prežije deploy |
| Buyer Psychology / Trust Engineering / Content / Omnichannel ako **samostatné programy** | Ústava: nikto by dnes nezaplatil za council; Feature Trap | Až keď C1 metrika žije a zakladateľ zadá VALIDATE experiment **jeden** kanál |

**VETO nestavať teraz** (zhoda s wave3 roadmap + AP-011): attribution engine, dedup ML, portálový scraping PII, buyer-intent scraping, enrichment bez súhlasu, kataster vlastníci bez zmluvy ÚGKK, nákup databáz.

---

## 5. Scope tohto briefu

### IN

- Zamknutá hranica Fázy 1 (first-party / verejné).
- Segment B2C seller → B2B RK → maklér.
- Jurisdikcia: SR teraz; `agencies.country` ako priestor na CZ/EÚ neskôr.
- Návrh metriky C0/C1/C2 ako deliverable na GO.
- Explicitné reuse mapovanie councilov na skilly/docs.
- Premortem + decision record.
- Open dependency ÚGKK / portály — označené, nie riešené.

### OUT

- Implementácia merania, migrácie, feature flagov, adapterov.
- Lead Factory Council, tisíce strán KB, nové agentné tímy.
- CZ/EÚ zdroje, compliance pack, preklady.
- Zapnutie external providerov.
- Google Ads mutácie (to je Acquisition OS, iný bet).
- Visitor fingerprint / `visitor_hash` (zakázané do controller/processor rozhodnutia).
- Merge do `main` bez výslovného founder GO.

---

## 6. Brány

| Brána | Kto | Kedy |
|-------|-----|------|
| Prijatie §2 definície (a/b/c) | Founder | pred akýmkoľvek meracím PR |
| SLA číslo od Smolka | Founder (draft otázky v premorteme) | pred tým, ako C1 vyhlásime za live KPI |
| Tento draft PR merge | Founder | po review; agent NEmerguje |
| Implementačný BO (instrumentácia C0/C1) | Founder GO | až po prijatej definícii |
| External provider flag ON | Founder + podpísaný 6(1)(f) + DPA | nie Fáza 1 |
| Prod migrácia | Founder | samostatný GO, nikdy v tom istom PR ako kód, ktorý ju používa |

---

## 7. Rollback

Dokumentárny PR: revert. Žiadna schéma, žiadny flag. Ak sa definícia v §2 neschváli, brief ostáva ako VALIDATE záznam — nestavia sa nič.

---

## 8. Effort tohto PR

S (<0.5 d) — dokumenty + decision. Implementácia merania = samostatný BO po GO.
