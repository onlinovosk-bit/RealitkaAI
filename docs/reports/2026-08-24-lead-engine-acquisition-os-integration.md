# Lead Engine × Acquisition OS — Integration Report

**Dátum:** 2026-08-24  
**Typ:** read-only architektonická revízia  
**Rozsah:** žiadny kód, žiadna migrácia, žiadny commit, žiadna zmena zamknutých dokumentov  
**Účel:** zistiť, či Lead Engine a Acquisition OS opisujú jednu architektúru, kompatibilné subsystémy, alebo dve konkurenčné akvizičné jadrá — a navrhnúť najmenší kontrakt, pri ktorom sa Lead Engine napojí na existujúci Acquisition OS bez druhého paralelného jadra.

**Verdikt schválenia (Judge / claim-governance):** tento dokument je **analýza**, nie GO na Stage 1+, nie GO na Lead Engine implementáciu, nie GO na paralelné spustenie zdrojov. Implementácia odporúčaní = samostatné founder GO.

---

## 0. Evidence labels a diera autority

Každé podstatné zistenie nesie jednu nálepku:

| Nálepka | Význam |
|---|---|
| `VERIFIED_REPO` | súbor/symbol existuje v tomto clone a bol prečítaný |
| `CODE_PRESENT` | kód/migrácia existuje; produkčná funkčnosť nie je tým dokázaná |
| `VERIFIED_PROD` | existuje produkčný dôkaz v repe (smoke/PASS report s meraním) |
| `ASSUMPTION` | odvodené, nie priamo v súbore |
| `missing: …` | požadovaný artefakt v repe (ani na `origin/main`, ani GitHub code search) nie je |

Repo existencia ≠ produkčná funkčnosť. Stage 0 PASS report a live webhook sú oddelené od „tabuľka je v migrácii“.

### 0.1 Poradie autority (zadanie) vs. čo je v repe

| Poradie | Cesta | Stav |
|---|---|---|
| 1a | `memory/decisions.md` → `D-2026-08-09-01` | `VERIFIED_REPO` riadky 516–538 |
| 1b | `memory/decisions.md` → `D-2026-08-24-01` | `missing: D-2026-08-24-01` — v `memory/`, `docs/`, gite ani GitHub search 0 zásahov |
| 2 | `docs/architecture/acquisition-os-v2.2-final-locked.md` | `VERIFIED_REPO` |
| 3 | `docs/prompts/acquisition-os-stage0-execution.md` | `VERIFIED_REPO` |
| 4 | `docs/architecture/claim-governance-kernel.md` | `missing: súbor neexistuje` |
| 5 | `docs/drafts/lead-engine-v1.md` | `missing: súbor neexistuje`; `docs/drafts/` obsahuje len `supabase-auth-email-templates-sk.md` |

**Dôsledok:** internú štruktúru Lead Engine (tabuľky, L6, „šesť opráv“) **nie je možné citovať z repa**. Objekty `lead_source_event`, `possible_duplicate`, „coordination/touch ledger“, „L6 Action & Approval“ sú **prompt-supplied**, nie `VERIFIED_REPO`. Najbližší in-repo analog je `D-2026-08-14-01` + `docs/briefs/l99-lead-factory-initiative.md` (Lead Factory VALIDATE, nie Lead Engine).

Prompt-supplied obsah `D-2026-08-24-01` (nie v repe, berie sa ako zadanie, nie ako zápis v Decision Memory): strategické rozhodnutie; **nie** povolenie Stage 1+, paralelného spustenia zdrojov, ani implementácie Lead Engine. `ASSUMPTION` kým zakladateľ nevloží text do `memory/decisions.md`.

### 0.2 Šesť opráv Lead Engine

`missing: docs/architecture/claim-governance-kernel.md` — šesť opráv **nie sú v repe citovateľné**. Nižšie je **povinná rekonštrukcia z tohto promptu** (10 kolízií + tvrdé pravidlá fuzzy/cross-tenant) zosúladená s `D-2026-08-09-01` a `D-2026-08-14-01`. Judge: **FLAG** — kým kernel nie je v repe, toto nie je schválený kernel text.

| # | Oprava (rekonštrukcia) | Prečo |
|---|---|---|
| O1 | Nezavádzať druhý event ledger `lead_source_event`. Paid-media provider eventy idú do `acquisition_events`. | `D-2026-08-09-01`: jeden doménový ledger providerov. |
| O2 | Nezavádzať druhý coordination/touch ledger. CRM touch = `activities` / `lead_events` / existujúce outreach tabuľky. | AP-019 / Lead Factory: reuse pred novou tabuľkou. |
| O3 | Fuzzy zhoda **nesmie** auto-merge identity. Maximum: tenant-scoped `possible_duplicate` na potvrdenie. | Prompt; žiadny cross-tenant identity graph. |
| O4 | Lawful basis a consent sú **tenant-scoped**. Žiadny zdieľaný consent graph, žiadne raw PII learning. | `lead_consents`; blueprint `acquisition_learning_patterns` = anonymized only. |
| O5 | Provenance a cost-per-qualified-lead sa viažu na existujúci Ads spend + CRM outcome. Nie druhý economics kernel. | Acquisition OS KPI; CRM = zdroj pravdy outcome (`blueprint` §0.8). |
| O6 | L6 Action & Approval **nesmie** obaliť ani nahradiť `action-executor.ts`. Ads mutácie = budúce `acquisition_change_proposals`. Stage 0 ostáva read-only. | `D-2026-08-09-01` hard bounds; `action-executor.ts` je CRM autopilot, nie acquisition policy. |

---

## 1. Executive verdict

**Kompatibilné subsystémy s latentným konfliktom jadra — nie jedna architektúra s rôznymi vstupmi.**

| Hypotéza | Verdikt | Dôvod |
|---|---|---|
| Jedna architektúra, rôzne vstupy | **Nie** | `D-2026-08-14-01` explicitne: Acquisition OS ostáva **oddelený bet** (Google Ads sync, **nie B2C leady**). `VERIFIED_REPO` `memory/decisions.md:599` |
| Kompatibilné subsystémy | **Áno, ak sa Lead Engine opraví** | Paid-media orchestrácia (Acquisition OS) a first-party/B2C ingest (Lead Factory / Lead Engine) môžu zdieľať CRM `leads` + tenant RLS + (pre Ads) `acquisition_events`. |
| Dve konkurenčné akvizičné jadrá | **Áno, ak by sa Lead Engine implementoval so samostatným event/touch/score/action jadrom** | Prompt-named objekty (`lead_source_event`, coordination ledger, L6) kolidujú s existujúcim jadrom. V kóde Lead Engine **nie je** — konflikt je návrhový, nie runtime. |

**Odporúčanie na konci:** `AMEND LEAD ENGINE`.

Nie `INTEGRATE`: chýba kanonický draft; pomenované objekty by vytvorili druhé jadro.  
Nie `REJECT PARALLEL ARCHITECTURE`: first-party seller capture je už v repe (widget, form, acquire email) a `D-2026-08-14-01` ho mapuje na **existujúci CRM**, nie na nový stack. Zamietnuť treba **paralelné jadro**, nie myšlienku pluggable zdrojov.

Počet a poradie lead zdrojov ostáva rozhodnutím zakladateľa. Tento report sa **nevracia** k single-wedge stratégii.

---

## 2. Mapa komponentov

### 2.1 Acquisition OS (locked blueprint + Stage 0 kód)

North star (`VERIFIED_REPO` `acquisition-os-v2.2-final-locked.md:32–36`): ktorá akvizičná aktivita vytvára realitný obchod; KPI = cost per qualified seller opportunity → neskôr cost per signed mandate.

```
Command Center / Analytics / Unit Economics     [blueprint; Stage 0 má len read dashboard]
        │
Acquisition Orchestrator (tenant + flags + policy)   [blueprint; Stage 0 = Google adapter only]
        │
   Google | Meta | Microsoft adapters
        │
acquisition_events  (immutable, tenant-scoped, idempotent)
        │
Revolis CRM  lead → contacted → qualified → appointment → mandate_signed → sold
        │
Offline conversion loop + anonymized learning graph   [Stage 1+; nie GO]
```

**Kód / migrácie (`CODE_PRESENT`):**

| Komponent | Cesta | Poznámka |
|---|---|---|
| Tabuľky core | `apps/crm/supabase/migrations/20260811220000_acquisition_core.sql` | `acquisition_accounts`, `acquisition_campaigns`, `acquisition_events` |
| Sync tabuľky | `…/20260815234500_acquisition_sync_tables.sql` | ad_groups / keywords / search_terms / metrics; hlavička **PREP ONLY** — nie automatický apply |
| Connect | `apps/crm/src/app/api/acquisition/google/connect/route.ts` | ignoruje `agency_id`/`customer_id` z client payloadu (`:26–30`) |
| Accounts | `…/google/accounts/route.ts` | tenant z auth profilu |
| Lead webhook | `…/google/lead-webhook/route.ts` | Stage 0: log event, **NEVER** insert CRM lead (`:142–147`) |
| Audit | `…/audit-log/route.ts` | číta `acquisition_events` |
| Dashboard | `src/lib/acquisition/load-dashboard.ts` + `(dashboard)/acquisition/page.tsx` | read model |
| Google client | `src/lib/acquisition/google-ads-client.ts` + `sync/*` | read-only search |
| UI marketing (iné) | `src/components/marketing/AcquisitionHub.tsx` | **nie** Stage 0 dashboard; demo/marketing surface |

**Blueprint tabuľky bez migrácie (`missing:` v `apps/crm/supabase/migrations/`):**  
`acquisition_conversions`, `acquisition_change_proposals`, `acquisition_experiments`, `seller_intent_scores`, `acquisition_learning_patterns`, job queue tabuľka §5.2.

**Stage 0 produkcia (`VERIFIED_PROD` `docs/architecture/acquisition-os-stage0-PASS-report.md`):**  
connect 200 PENDING, webhook `is_test` → `LOGGED_TEST` + `lead_id=null`, `/acquisition` content. Otvorené v tom istom reporte: HTTP/cron sync job **neexistuje**; `GOOGLE_ADS_WEBHOOK_KEY` po smoku zmazaný z production; ad groups/keywords **bez DB tabuliek** v čase PASS (sync tabuľky neskôr PREP ONLY).

`D-2026-08-15-01` (`memory/decisions.md:639`) najprv **STOP** perfgate; PASS report addendum tvrdí PASS po #416. Funkčný DoD Stage 0 drží; Stage 1 sa nespúšťa. `VERIFIED_REPO` na oboch textoch — napätie je v Decision Memory vs. PASS addendum, nie v tomto reporte rozhodnuté.

### 2.2 Lead Engine (návrh — draft v repe chýba)

In-repo analog: Lead Factory VALIDATE (`docs/briefs/l99-lead-factory-initiative.md`).

**Existujúce B2C/first-party vstupy (`CODE_PRESENT`):**

| Vstup | Cesta |
|---|---|
| Valuation widget | `POST /api/valuation/submit` → `leads` + `lead_consents` |
| Public form | `src/app/f/[slug]/` |
| Buyer onboarding | `(public)/buyer-onboarding` |
| Acquire email | `POST /api/acquire/email` + `acquire_dedup_keys` |
| Inbound triage | `src/lib/acquire/inbound-lead-triage.ts` |
| Import / Realvia | `src/lib/universal-import/` |

**Prompt-named Lead Engine objekty (nie v repe):**  
`lead_source_event`, coordination/touch ledger, L6 Action & Approval, pluggable source runtime, cost-per-qualified-lead engine.

### 2.3 Zdieľaný CRM substrát (`CODE_PRESENT`)

| Pojem | Kde |
|---|---|
| Osoba / príležitosť | `public.leads` |
| Consent | `public.lead_consents` (`20260722120000_sandbox_gdpr_consent.sql:108`) |
| CRM eventy | `public.lead_events` (`20260418_enterprise_ai_intelligence.sql:4`) |
| Aktivity | `public.activities` (baseline) |
| Skóre (CRM) | `public.lead_scores` + `getLeadDisplayScore` (`src/lib/leads/lead-display-score.ts:12`) |
| Event dedup (email gateway) | `public.acquire_dedup_keys` (`20260629120000_acquire_dedup_keys.sql`) |
| Tenant RLS | `profile_agencies_for_auth()` + `leads_tenant` |
| Autopilot akcie | `executeAction` (`src/lib/ai/action-executor.ts:7`) |

---

## 3. Collision matrix

Legenda akcií: **ponechať** / **rozšíriť** / **premenovať** / **odložiť** / **odstrániť z návrhu**.

| # | Koncept | Existujúce | Prekrývajúce sa | Chýbajúce | Akcia |
|---|---|---|---|---|---|
| 1 | Provider event ledger | `acquisition_events` | `lead_source_event` (návrh) | — | **ponechať** `acquisition_events`; **odstrániť z návrhu** `lead_source_event` ako tabuľku |
| 2 | Touch / coordination | `activities`, `lead_events`, `outreach_log` (kód) / `outreach_logs` (migrácia — **dve mená**) | Lead Engine coordination ledger | jednotný CRM outbox (`memory_events` zabitý) | **ponechať** existujúce; **odstrániť z návrhu** nový ledger; **odložiť** zjednotenie outreach názvov |
| 3 | Identity / dedup | `acquire_dedup_keys` (event key, nie osoba); index `idx_leads_email` **nie UNIQUE** | Lead Engine identity resolver | person-level tenant dedup; `possible_duplicate` | **rozšíriť** neskôr tenant-scoped exact match + `possible_duplicate`; **odstrániť z návrhu** auto-merge a cross-tenant graph |
| 4 | Consent / lawful basis | `lead_consents` (widget; `tenant_slug` + lead FK) | Lead Engine tenant consent | per-source lawful basis enum; nie všetky vstupy píšu consent | **ponechať** tabuľku; **rozšíriť** až po GO (iné zdroje); **odstrániť z návrhu** globálny consent graph |
| 5 | Provenance / CPL | blueprint KPI; `cost_micros` na PREP `acquisition_search_terms` | Lead Engine cost-per-qualified-lead | výpočet CPL v kóde; `acquisition_conversions` | **odložiť** CPL engine; **ponechať** Ads spend v acquisition tabuľkách keď budú applied |
| 6 | Action & approval | `action-executor.ts` (CRM autopilot, bez approval); `outreach/send` **ungated**; `outreach/approve` audit+send; `human-approval.ts` in-memory Map; blueprint §12 proposals | L6 Action & Approval | `acquisition_change_proposals` tabuľka+API | **ponechať** CRM autopilot oddelený; **odložiť** Ads proposals na Stage 1+ GO; **odstrániť z návrhu** L6 ako druhé jadro nad `executeAction` |
| 7 | Stage 0 writes | webhook insertuje len `acquisition_events`, `lead_id=null` | budúce lead-source writes | CRM lead z Google form | **ponechať** Stage 0 hranicu; lead-source writes = **odložiť** za vlastné GO |
| 8 | Provider vs pluggable source | `acquisition_accounts.provider CHECK IN ('GOOGLE','META','MICROSOFT')`; `acquisition_events.provider` je voľný `text` | Lead Engine source plugins | first-party ako `provider` | **ponechať** Ads provider enum na accounts; first-party **nie** nový Ads account; **premenovať** v návrhu „provider“ → `source_kind` + `source_id` mimo accounts |
| 9 | Scoring / lifecycle | `leads.status`; `lead_scores`; `getLeadDisplayScore`; BRI; inbound triage | `seller_intent_scores` (blueprint); Lead Engine score | `seller_intent_scores` migrácia | **ponechať** CRM lifecycle na `leads`; **odložiť** seller intent table; **odstrániť z návrhu** tretie skóre |
| 10 | Duplicate contact | event dedup acquire; `do_not_contact` len Realvia mapper; seller-rescue **kontaktuje** stale, nebráni duplicite | Lead Engine suppression | person-level contact ledger, cross-source suppression | **rozšíriť** neskôr na tenant person key + last-touch; **odstrániť z návrhu** globálnu suppression DB |

`outreach_log` vs `outreach_logs`: `action-executor.ts:36` insertuje `outreach_log`; migrácia `20260426150000_bsm_reforma_campaign.sql` vytvára `outreach_logs`. `CODE_PRESENT` kolízia mien v CRM — mimo tohto reportu, ale Lead Engine **nesmie** pridať tretie meno.

---

## 4. Source of truth — spoločné koncepty

| Koncept | Zdroj pravdy | Nie zdroj pravdy |
|---|---|---|
| Čo sa stalo u Ads providera | `acquisition_events` (`D-2026-08-09-01`) | CRM `lead_events`, zabitý `memory_events`, návrh `lead_source_event` |
| Čo sa stalo v CRM (touch, status, úloha) | `leads` + `lead_events` / `activities` / tasks | Acquisition OS ledger |
| Identita osoby v tenante | `leads` row (`agency_id` + `id`); exact email/phone match až po explicitnom GO | Fuzzy merge; cross-tenant ID; `acquire_dedup_keys` (to je **event** idempotency, nie osoba) |
| Súhlas | `lead_consents` via `lead_id` → tenant cez `leads.agency_id` | Implicitný súhlas z Ads form v Stage 0 (lead sa **nevytvára**) |
| Outcome / conversion ladder | CRM stavy + budúce `acquisition_conversions` (chýba) | GA4 ako business DB (blueprint §0.8 zakazuje) |
| Seller intent (heuristic) | blueprint: `seller_intent_scores` **keď bude**; dnes display = `getLeadDisplayScore` | Production truth (blueprint §0.10) |
| Ads účet / kampaň | `acquisition_accounts` / `acquisition_campaigns` | Client payload `customer_id` |
| Ads mutácia | `acquisition_change_proposals` (chýba) + human approve | `executeAction`, `outreach/send` |
| CRM autopilot akcia | `executeAction` + cron | Acquisition policy engine |
| Seat pricing | `PLAN_PRICES_EUR` 79 / 71 / 63 (`apps/crm/src/lib/program-tier-pricing.ts:9–13`) | Pricing v2 89/83/79 (spec-only, **nie** SSOT) |
| Fronta jobov Stage 0 | existujúci Vercel cron (`apps/crm/vercel.json`) — **žiadny** acquisition cron | Redis/Bull z blueprintu (cieľový stav, Stage 0 zakázaný nový queue) |
| Tenant | `agency_id` + `profile_agencies_for_auth()` (`20260419_enterprise_rls_profile_link.sql:16–30`) | `agency_id` z client body |

---

## 5. Minimálny spoločný substrát (kompatibilný so Stage 0)

Toto je **jediné** jadro, na ktoré sa Lead Engine smie neskôr napojiť. Nič z toho Stage 0 nemeň.

1. **Tenant kľúč:** `agency_id` + RLS `*_tenant` cez `profile_agencies_for_auth()`.  
   `VERIFIED_REPO` acquisition: `20260811220000_acquisition_core.sql:93–109`. Leads: `20260616124500_rls_wave_a_leak_closure.sql:14–17`.
2. **CRM osoba:** `public.leads`. Webhook Stage 0 **nesmie** insertovať lead (`lead-webhook/route.ts:145–146`, `insertPayload.lead_id: null` `:228`).
3. **Provider ledger:** `acquisition_events` append-only (`REVOKE UPDATE, DELETE` `:113–114`), UNIQUE `(agency_id, provider, provider_event_id, event_type)` `:76`.
4. **Idempotencia vstupu:** rovnaký unique kľúč; webhook už robí SELECT + unique conflict (`lead-webhook/route.ts:199–267`).
5. **Secrets:** existujúci Vercel env / `credential_ref`; žiadny nový vault.
6. **Job runtime:** existujúce crony v `vercel.json:3–59`. Žiadny acquisition path. Žiadny nový Redis/Bull.
7. **First-party consent (už live, mimo Acquisition OS):** `lead_consents` pri valuation submit. Acquisition webhook consent v Stage 0 **neukladá** (žiadny lead).
8. **Žiadny LLM v acquisition path** (`D-2026-08-09-01`).

Tento substrát **nezahŕňa** Lead Engine runtime, nové tabuľky, Meta/Microsoft, conversion upload, ani CRM write z Ads formu.

---

## 6. Hranica Stage 0 vs. budúci Lead Engine

```
                    STAGE 0 (teraz)                          NESKÔR (vlastné GO)
┌─────────────────────────────────────────┐    ┌──────────────────────────────────────────┐
│ Google Test MCC read-only               │    │ Ďalší Ads provider / prod účet           │
│ acquisition_events, lead_id = NULL      │    │ acquisition_events.lead_id po CRM inserte│
│ žiadny CRM lead z webhooku              │    │ First-party source → leads + consents    │
│ žiadny LLM, žiadna mutácia kampane      │    │ Conversion upload, proposals, CPL        │
│ žiadny Lead Engine kód                  │    │ Pluggable adapter ZA kontraktom §7       │
└─────────────────────────────────────────┘    └──────────────────────────────────────────┘
         ▲                                              ▲
         │ nikdy nesmie Lead Engine                     │ až po: Stage 0 bounds
         │ prekročiť túto čiaru bez GO                  │ + D-2026-08-09-01 Stage 1 GO
         │                                              │ + Lead Factory / zdroj GO
         │                                              │ + (ak draft) kernel v repe
```

**Pravidlo:** Lead Engine adapter, ktorý by v Stage 0 zapisoval `leads`, porušuje `D-2026-08-09-01` **aj keby** išlo o iný zdroj ako Google — Stage 0 execution prompt zakazuje rozširovanie blueprintu. First-party widget už zapisuje CRM **mimo** Acquisition OS; to nie je Stage 0 výnimka, je to existujúci produkt. Nový zdroj = nové GO, nie „Stage 0 plus“.

`D-2026-08-24-01` (prompt): strategické; **nie** toto GO.

---

## 7. Navrhovaný event contract (špecifikácia, bez implementácie)

Jeden logický event. **Dve úložiská podľa `source_kind`**, nie dve jadrá.

### 7.1 Envelope (logický)

```text
AcquisitionInboundEvent
  agency_id            uuid        REQUIRED  — vždy z tenant resolvera, nikdy z client spoof
  source_kind          enum        REQUIRED  — paid_media | first_party | partner_export
  source_id            text        REQUIRED  — GOOGLE | META | MICROSOFT | valuation_widget | public_form | acquire_email | …
  event_type           text        REQUIRED  — paid_media: existujúce názvy (lead.form_submitted, …)
  provider_event_id    text        REQUIRED  — idempotencia v rámci (agency_id, source_id, event_type)
  occurred_at          timestamptz REQUIRED
  payload_hash         text        REQUIRED  — hash minimálneho kanonického payloadu, nie raw PII dump v logoch
  processing_status    text        REQUIRED  — LOGGED_TEST | LOGGED_STAGE0 | PENDING | PROCESSED | ERROR | DUPLICATE
  lead_id              text|null   — Stage 0 paid_media: vždy null
  identity_match       enum        — none | exact_email | exact_phone | possible_duplicate
  identity_candidate_lead_id text|null  — len pri exact_* alebo possible_duplicate
  consent_id           uuid|null   — FK na lead_consents po CRM inserte; Stage 0 paid_media: null
  attribution_id       text|null   — gclid/fbclid; len paid_media
  cost_micros          int|null    — nikdy nevymyslieť; len ak source dodá spend
  metadata             jsonb       — bez raw PII; bez credential
```

### 7.2 Persistencia (kontrakt úložiska)

| `source_kind` | Kam sa zapisuje | Kam sa **nezapisuje** |
|---|---|---|
| `paid_media` | `acquisition_events` (existujúca tabuľka). `provider` = Ads enum. | Nová tabuľka `lead_source_event`. CRM `leads` v Stage 0. |
| `first_party` | `leads` + `lead_consents` + `lead_events` (existujúce). Provenance = `leads.source`. | `acquisition_accounts` (nie je Ads účet). Cross-tenant tabuľka. |
| `partner_export` | Až po právnej bráne `D-2026-08-14-01` (default OFF). | Akýkoľvek write pred DPA + balancing test. |

**Most (až Stage 1+ GO, nie teraz):** keď Google Lead Form **smie** vytvoriť CRM lead, ten istý `acquisition_events` riadok dostane `lead_id`. Žiadny druhý insert do `lead_source_event`.

### 7.3 Identity (súčasť eventu, nie samostatné jadro)

- Exact match **v rámci `agency_id`** na normalizovaný email alebo telefón → smie navrhnúť `identity_candidate_lead_id`. Auto-merge **zakázaný**, kým zakladateľ neschváli merge policy (predvolené: nový lead + link `possible_duplicate` / exact ako flag, nie overwrite).
- Fuzzy (meno+lokalita, edit distance, …) → **iba** `identity_match=possible_duplicate`. Žiadny merge, žiadny shared ID.
- Match mimo `agency_id` → **zakázaný**, aj ako „anonymizovaný embedding over raw PII“.
- `acquire_dedup_keys` ostáva **event** idempotency pre email gateway (`dedupKey` = listing + contact + `receivedAt`, `email-adapter.ts:135–142`). Nie je person graph.

### 7.4 Contact suppression

Pred akýmkoľvek outbound z budúceho zdroja: čítať tenant CRM (`leads` + `lead_events`/`activities` + existujúci outreach) v tom istom `agency_id`. Žiadna globálna „do not contact“ databáza. `do_not_contact` z Realvia mapperu je import flag, nie OS.

### 7.5 Čo kontrakt výslovne nie je

- Nie je to nová queue.
- Nie je to nové approval jadro.
- Nie je to povolenie zapísať prvý riadok kódu.
- Nie je to zmena locked blueprintu — je to **amendment hranice** medzi blueprintom a budúcim source adapterom, zapisovaný do Decision Memory (pozri §11).

---

## 8. Riziká: duplicity, kolízie, PII, consent, cross-tenant

| Riziko | Stav dnes | Ak Lead Engine pridá druhé jadro |
|---|---|---|
| Duplicitný lead z Google formu + widget | Stage 0: Google **nevytvára** lead (`VERIFIED_PROD` webhook `lead_id=null`). Widget vytvára. | Dva zápisy bez person key = dva CRM riadky, dvojitý kontakt. |
| Event vs osoba dedup | `acquire_dedup_keys` je event; `leads.email` má len index, nie UNIQUE (`20260428214500_leads_indexes.sql:3`) | Druhý resolver ešte zväčší štiepenie. |
| Fuzzy auto-merge | V kóde **nie je** identity merge engine. | Cross-person merge v tenante; GDPR. **Zakázané.** |
| Cross-tenant leak | RLS acquisition + leads (`CODE_PRESENT`; RLS test `acquisition-core-rls.test.ts` skipuje bez local Supabase). Webhook používa **service_role** a `resolveAgencyId` z `customer_id` — zle namapovaný Ads účet = write do zlej agentúry. | Spoločný identity graph = katastrofa. **Zakázané aj ako vedľajší efekt.** |
| Raw PII v learning | Blueprint `acquisition_learning_patterns` = anonymized (`locked.md:297–310`). Tabuľka chýba. | PII v pattern store. **Zakázané.** |
| Consent | Widget: `lead_consents`. Webhook Stage 0: žiadny consent row (žiadny lead). Google form súhlas **nie je** v CRM. | Kontaktovať z Ads formu bez uloženého súhlasu po Stage 1 write. |
| Duplicitný kontakt | seller-rescue **vyberá** stale na kontakt (`seller-rescue.ts:56–78`). Autopilot `executeAction` queue email bez human gate. `outreach/send` bez approve. | Druhý action bus = dvojitý email. |
| PII v `acquisition_events.metadata` | Webhook metadata: `is_test`, `stage`, `campaign_id`, `form_id`, `lead_created` (`lead-webhook/route.ts:246–252`) — bez email/phone v tomto inserte. `CODE_PRESENT`. | Budúci adapter môže strčiť PII do jsonb. Kontrakt: **zakázať**. |
| Cost fiction (AP-001) | CPL KPI v blueprintu; výpočet v kóde **chýba**. Test MCC neservuje (`PASS` metrics 0). | Dashboard „€/qualified lead“ z nuly. **Zakázané** kým nie je spend + qualified outcome. |
| Queue drift | Blueprint Redis/Bull vs. cron. Stage 0: cron, acquisition cron **missing**. | Lead Engine queue = tretí runtime. |

**Judge na PII/RLS tvrdenia:** RLS politiky sú `CODE_PRESENT` + unit test, ktorý **skipne** bez local DB. Cross-tenant 403 na connect bez session je v PASS reporte. **Nie** `VERIFIED_PROD` na každej novej tabuľke. Nový PII write bez RLS testu = STOP podľa Kontrolóra bod 8.

---

## 9. Otvorené rozhodnutia zakladateľa

1. **Vložiť `D-2026-08-24-01` do `memory/decisions.md`** — dnes `missing`. Prompt-supplied význam (strategické, nie Stage 1 GO) nie je Decision Memory.
2. **Vložiť do repa** `docs/architecture/claim-governance-kernel.md` a `docs/drafts/lead-engine-v1.md` (alebo oficiálne zrušiť tieto cesty). Bez nich sa šesť opráv nedajú schváliť ako kernel.
3. **Počet a poradie lead zdrojov** — výhradne zakladateľ. Tento report **neordinuje** single-wedge ani konkrétny zoznam.
4. **Prijatie / úprava C0–C2** z Lead Factory briefu §2 (`l99-lead-factory-initiative.md`) — stále návrh, nie zákon (`D-2026-08-14-01`).
5. **Či `acquisition_events` smie niesť non-Ads `provider` stringy** (tabuľka events nemá CHECK; accounts má). Odporúčanie reportu: **nie** — first_party nepatrí do Ads accounts. Amendment vs. „len metadata“ je founder call.
6. **Kedy (ak vôbec) Google Lead Form smie insertovať `leads`** — to je Stage 1+ / samostatné GO, nie D-2026-08-24-01.
7. **Person-level exact-match policy:** nový riadok vždy vs. attach na existujúci email v tenante. Predvolené v §7: žiadny silent merge.
8. **External lead providers** — ostávajú default OFF (`D-2026-08-14-01`).
9. **CPL dashboard** — nestavať, kým nie je applied spend + definícia qualified (C2 alebo ladder LEVEL 3).
10. **Zjednotenie `outreach_log` / `outreach_logs`** — technický dlh CRM; nie Lead Engine PR.

---

## 10. Najmenšie reverzibilné kroky

Žiadny krok nie je implementácia v tomto turne. Poradie je na GO, nie autonómne.

1. **Artefakt autority:** zakladateľ vloží `D-2026-08-24-01` + (voliteľne) kernel/draft do repa. Rollback = revert doc PR.  
   Brána: GO na doc-only PR.
2. **Prijatie tohto kontraktu** ako `D-2026-08-24-02` (text v §11). Rollback = revert decision.  
   Brána: founder podpis.
3. **Nemeniť** locked `acquisition-os-v2.2-final-locked.md`. Konflikty riešiť amendmentom Decision Memory, nie redizajnom blueprintu (`D-2026-08-09-01`, execution prompt).
4. **Až po GO na C0–C2:** meranie predhriatia na **existujúcom** widgete (`lead_consents` + contact timestamp). Žiadny nový engine.  
   Brána: `D-2026-08-14-01` deliverable GO.
5. **Až po Stage 1 GO (Acquisition OS):** `lead_id` na `acquisition_events` + CRM insert z Google formu, ten istý ledger.  
   Brána: checklist Stage 0 + explicitné Stage 1 GO.
6. **Až po zdrojovom GO:** jeden adapter podľa §7 (`source_kind` + existujúce tabuľky). 1 PR = 1 zdroj.  
   Brána: founder určí ktorý zdroj; právna brána pre non-first-party.
7. **Nikdy v týchto krokoch:** Redis/Bull, `lead_source_event`, identity ML, cross-tenant graph, L6 nad `action-executor`, CPL dlaždica bez dát, parallel action bus.

---

## 11. Navrhovaný decision record (presné znenie)

Nasledujúci text je **návrh na vloženie** do `memory/decisions.md` **až na founder GO**. Tento report ho **nezapisuje** do Decision Memory (zadanie: vytvoriť iba report).

```text
## D-2026-08-24-02 — Lead Engine sa pripája na Acquisition OS; nie druhé jadro

**Kategória:** Architectural amendment (nie Stage 1 GO, nie implementačné GO)
**Nadväzuje na:** D-2026-08-09-01, D-2026-08-14-01
**Dôkaz / report:** docs/reports/2026-08-24-lead-engine-acquisition-os-integration.md

**Rozhodnutie:** Lead Engine (cieľová architektúra B2C/first-party a ďalších
zákonných zdrojov) nie je paralelné akvizičné jadro. Acquisition OS ostáva
jediným paid-media orchestrátorom a jediným immutable ledgerom udalostí
externých ads providerov (`acquisition_events`). CRM ostáva zdrojom pravdy
osoby, touchu, súhlasu a obchodného outcome.

Lead Engine, ak sa bude stavať, je rodina source adapterov za spoločným
event kontraktom v reporte §7:
- paid_media → acquisition_events (existujúca tabuľka)
- first_party → leads + lead_consents + lead_events (existujúce tabuľky)
- partner_export → default OFF (D-2026-08-14-01)

**Zakázané (odstrániť z návrhu Lead Engine):**
- tabuľka alebo store `lead_source_event` ako druhé jadro
- nový coordination/touch ledger
- auto-merge identity z fuzzy zhody
- cross-tenant identity, cross-tenant consent, raw PII learning
- L6 Action & Approval ako obal alebo náhrada `action-executor.ts`
- nový queue runtime (Redis/Bull) kvôli Lead Engine
- CRM write z Google lead-webhook pred samostatným Stage 1+ GO

**Povinné identity pravidlo:** fuzzy zhoda maximálne `possible_duplicate`
na ľudské potvrdenie, striktne v `agency_id`. Exact match tiež nesmie
ticho zlúčiť riadky, kým nebude osobitné merge GO.

**Stage 0:** D-2026-08-09-01 bounds platia. D-2026-08-24-01 (strategické)
toto GO nahrádza ani nerozširuje.

**Pricing SSOT:** 79 / 71 / 63 EUR (`PLAN_PRICES_EUR`). Nezamieňať s Pricing v2.

**Počet a poradie zdrojov:** rozhoduje zakladateľ; tento záznam
nevracia single-wedge politiku.

**Reverzibilita:** doc/decision only. Žiadna migrácia v tomto zápise.

**Kill:** ak budúci PR pridá druhé event/touch/score/action jadro namiesto
adaptera, PR sa vracia (RETURN/STOP), nemerguje sa.
```

**Vzťah k chýbajúcemu `D-2026-08-24-01`:** tento návrh ho **nenahrádza**. `D-2026-08-24-01` ostáva strategický slot, ktorý treba doplniť zakladateľovým textom. `D-2026-08-24-02` je integračný amendment.

Locked blueprint sa **nemeni**. Ak Stage 1 ukáže prekryv event store, rieši sa ďalším ADR amendmentom — rovnaký mechanizmus ako `D-2026-08-09-01` voči Memory Engine.

---

## 12. Repo verifikácia (skrátený register)

| Téma | Nálepka | Dôkaz |
|---|---|---|
| `acquisition_events` schéma + RLS + append-only | `CODE_PRESENT` | `20260811220000_acquisition_core.sql:61–114` |
| Webhook nikdy nevytvára lead | `CODE_PRESENT` + `VERIFIED_PROD` | `lead-webhook/route.ts:142–147, 226–228`; PASS report webhook `lead_id=null` |
| Connect ignoruje client tenant/customer | `CODE_PRESENT` | `connect/route.ts:26–30` |
| Sync tabuľky | `CODE_PRESENT` (PREP ONLY) | `20260815234500_acquisition_sync_tables.sql:1–6` |
| `seller_intent_scores` / conversions / proposals | `missing: migrácia` | grep 0 v `apps/crm/supabase/migrations` |
| `memory_events` | `missing: applied migration` | ADR only; bet killed `D-2026-08-10-01` |
| `lead_source_event` | `missing: kód aj draft` | grep 0 |
| Queue | `CODE_PRESENT` | `vercel.json` crons; **žiadny** `/api/cron/acquisition*` |
| RLS vzor | `CODE_PRESENT` | `profile_agencies_for_auth()` `:16–30`; `leads_tenant`; acquisition `*_tenant` |
| Identity dedup | `CODE_PRESENT` | `acquire_dedup_keys` + `dedupKey()`; nie person UNIQUE |
| Consent | `CODE_PRESENT` | `lead_consents`; nie na acquisition webhook |
| Cost / CPL | `missing: výpočet` | KPI v blueprint; `cost_micros` len PREP search_terms |
| `action-executor.ts` | `CODE_PRESENT` | `:7–47` insert task/notification/`outreach_log`; volané z `autopilot/run/route.ts:35` **bez** approval |
| Outreach approval | `CODE_PRESENT` | `outreach/send` ungated; `outreach/approve` log+send; `human-approval.ts` in-memory Map pre publish capability |
| Scoring | `CODE_PRESENT` | `getLeadDisplayScore`; `lead_scores`; nie `seller_intent_scores` |
| Pricing | `VERIFIED_REPO` | `PLAN_PRICES_EUR` 79/71/63 |
| Stage 0 PASS | `VERIFIED_PROD` s výhradami | PASS report + `D-2026-08-15-01` STOP/addendum napätie |
| Lead Engine draft / kernel / D-2026-08-24-01 | `missing` | §0.1 |

---

## Odporúčanie

**`AMEND LEAD ENGINE`**

Lead Engine a Acquisition OS nie sú jedna architektúra s rôznymi vstupmi. Sú to **kompatibilné subsystémy**, ak Lead Engine prestane navrhovať druhé jadro a stane sa rodinou adapterov na existujúci Acquisition OS ledger (paid media) a existujúci CRM (osoba, súhlas, touch).

Ak by sa návrh implementoval s `lead_source_event`, vlastným touch ledgerom, vlastným scoringom a L6 nad `action-executor.ts`, verdikt by sa zmenil na **`REJECT PARALLEL ARCHITECTURE`**.

Tento report **neimplementuje** kontrakt, **nemeni** locked blueprint, **nevkladá** decision record do `memory/decisions.md`.

---

## Task-loop (nie autonómne vykonanie)

```
ĎALŠIA ÚLOHA: Zakladateľ vloží do memory/decisions.md chýbajúce D-2026-08-24-01
              a buď prijme, upraví, alebo vráti D-2026-08-24-02 z tohto reportu.
PREČO TERAZ: Bez Decision Memory záznamu kontrakt neexistuje; kernel/draft chýbajú.
BRÁNA: GO REQUIRED — žiadny kód, žiadny Stage 1, žiadny lead-source write.
```
