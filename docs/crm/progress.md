# L99 AUTOMAT ONBOARDING – Progress

## 1. Kontext projektu

Cieľ: vybudovať plne autonómny, self-optimalizujúci akvizičný engine, ktorý 24/7 identifikuje, kvalifikuje, nurturuje a konvertuje majiteľov realitných kancelárií na platiacich klientov Revolis.AI – bez manuálnej práce.

Role mindset:
Senior CRO Architect (Salesforce) + Senior Risk & Strategy Manager (HubSpot) + Senior Staff Engineer & AI Product Architect (Notion) + Senior Full-Stack Engineer (Gong).

---

## 2. Doteraz spravené – high-level

1. **Pripravená základná dátová vrstva v Postgrese/Supabase** pre agencies, listings, signály a outbound kampane.
2. **Začatá konsolidácia multi-tenant architektúry** (tenant_id, project_id).
3. **Refaktor Playbook/BRI enginu** do samostatnej domain + services vrstvy.
4. **Navrhnutá a vytvorená architektúra pre Agency scraping** (domain / infra / services / jobs).
5. **Navrhnutá architektúra pre Outbound kampane** (scheduler, repos, content builder, send jobs).
6. **Zadefinovaný pattern pre background joby** – tenké job skripty, logika v domain/services.

---

## 3. Dátový model – čo už máme

### 3.1 Existujúce tabuľky aktualizované

- `agencies`
  - pridané stĺpce:
    - `tenant_id uuid`
    - `opportunity_score numeric(5,2)`
    - `listings_count_30d integer default 0`
  - indexy:
    - `agencies_city_idx` (city)
    - `agencies_tenant_opportunity_score_idx` (tenant_id, opportunity_score desc)

### 3.2 Nové tabuľky (SQL pripravené / nasadené)

- `projects`
  - `id uuid primary key`
  - `name text not null`
  - `created_at timestamptz`

- `listings_snapshot`
  - snapshot inzerátov zo scraping layeru (agency_id, portal, url, title, description_raw, price, city, region, scraped_at, tenant_id, project_id)

- `agency_signals`
  - flexibilné key/value signály o agentúre (source, signal_type, value_numeric, value_text, detected_at, tenant_id, project_id)

- `outbound_campaigns`
  - definícia outbound kampaní (name, channel, status, tenant_id, project_id)

- `outbound_messages`
  - jednotlivé outbound správy + ich životný cyklus (send_at, sent_at, delivered_at, opened_at, clicked_at, replied_at, status, tenant_id, project_id)

---

## 4. Playbook / BRI engine – refaktor

### 4.1 Nové súbory a vrstvy

- `src/domain/playbook/types.ts`
  - `LeadSnapshot`, `LeadActivity`, `PlaybookActionType`, `PlaybookAction`.

- `src/domain/playbook/engine.ts`
  - `buildPlaybook(leads, activities, options)`
    - čistý domain engine (bez Supabase, bez UI), využíva `computeBuyerReadiness`.

- `src/services/playbook/mapper.ts`
  - `mapActionToDto(action, lead) → PlaybookItemDto`
  - helpery: `buildTitle`, `buildSubtitle`, `buildBadges`, `buildCta`.

- `src/services/playbook/generateDailyPlaybook.ts`
  - orchestrátor:
    - načíta leads + activities zo Supabase,
    - mapuje na `LeadSnapshot` + `LeadActivity`,
    - volá `buildPlaybook`,
    - mapuje na `PlaybookItemDto[]` cez mapper.
  - zachovaná pôvodná public signatúra:
    - `generateDailyPlaybook(supabase, limit?)`.

### 4.2 Job pre denný playbook

- `src/domain/profiles/ProfilesRepository.ts`
  - `ProfilesRepository`, `AgentProfile`, `getAllAgents()`.

- `src/infra/db/SupabaseProfilesRepository.ts`
  - implementácia `ProfilesRepository` nad Supabase (`profiles` tabuľka).

- `src/services/playbook/DailyPlaybookService.ts`
  - `runForAllAgents()`, `runForAgent()`, `runGlobal()` – orchestrácia denného playbooku.

- Refaktor jobu:
  - `src/jobs/run-daily-playbook.ts`
    - už neobsahuje biznis logiku ani Supabase queries;
    - len bootstrap (dotenv, createClient, zostavenie repo + services, volanie `DailyPlaybookService.runForAllAgents()`).

---

## 5. Agency scraping – nová architektúra

### 5.1 Domain

- `src/domain/agency/AgencyDiscovery.ts`
  - `DiscoveredAgency` – domain shape pre novú agentúru z portálu.
  - `AgencyDiscoverySource` – interface pre rôzne zdroje (portály, API).
  - `AgenciesRepository` – interface pre zápis/upsert agentúr.
  - `AgencyDiscoveryEngine`
    - prijíma `sources[]` + `AgenciesRepository`,
    - `run()` agreguje výsledky zo všetkých zdrojov a volá `upsertDiscoveredAgencies`.

### 5.2 Infra

- `src/infra/db/SupabaseAgenciesRepository.ts`
  - skeleton implementácie `AgenciesRepository` (upserty do `agencies` a `listings_snapshot` – pripravené na doplnenie existujúcej logiky).

- `src/infra/scraping/PortalNehnutelnostiSource.ts`
  - skeleton implementácie `AgencyDiscoverySource` pre `nehnutelnosti.sk`:
    - bude obsahovať konkrétny scraping/parsing kód.

### 5.3 Service + job

- `src/services/agency/AgencyScrapingService.ts`
  - `runFullCycle()` – volá `AgencyDiscoveryEngine.run()` a loguje výsledky.

- `src/jobs/run-agency-scraping.ts`
  - nový tenký job:
    - načíta env,
    - vytvorí Supabase klienta,
    - poskladá `SupabaseAgenciesRepository` + `PortalNehnutelnostiSource` + `AgencyDiscoveryEngine` + `AgencyScrapingService`,
    - spustí `runFullCycle()`.

---

## 6. Outbound kampane – navrhnutá architektúra (skeletony)

*(časť je zatiaľ návrh/skeleton, pripravený na implementáciu)*

- Domain: `src/domain/outbound/OutboundCampaign.ts`
  - `OutboundCampaign`, `OutboundRecipient`, `OutboundMessagePlan`, `OutboundRepositories`, `OutboundScheduler`, `OutboundContentBuilder`.

- Infra:
  - `src/infra/db/SupabaseOutboundRepositories.ts`
    - `createSupabaseOutboundRepositories(supabase)` – kampane, výber top agencies, plánovanie a čítanie due správ z `outbound_*` tabuliek.
  - `src/infra/outbound/SimpleOutboundContentBuilder.ts`
    - základný (non-AI) `OutboundContentBuilder` – generuje subject/body.

- Service:
  - `src/services/outbound/OutboundService.ts`
    - `scheduleForTopAgencies(tenantId, limit)` – plánovanie,
    - `sendDueEmails(now, batchSize)` – odosielanie due správ.

- Email infra:
  - `src/infra/email/ConsoleEmailSender.ts`
    - jednoduchý `EmailSender` skeleton → neskôr nahradíš Resend/Mailgun implementáciou.

- Jobs:
  - `src/jobs/run-outbound-schedule.ts` – plánovanie outboundu.
  - `src/jobs/run-outbound-send.ts` – odosielanie due správ.

---

## 7. Zavedený architektonický pattern

Pre všetky nové a refaktorované časti L99 AUTOMAT ONBOARDING používame jednotný pattern:

1. **Domain** – čistá biznis logika (žiadny Supabase, žiadny Next.js, žiadne SDK).
2. **Infra/adapters** – konkrétni klienti (Supabase, scrapers, email provider, LLM).
3. **Services** – orchestrácia use-casov (Playbook, AgencyScraping, Outbound).
4. **Jobs** – tenké entrypointy (`npx tsx ...`), ktoré len skladajú infra + domain + services a spúšťajú ich.

Toto vytvára základ pre:

- bezpečný refaktor,
- jednoduché testovanie domény,
- neskoršie pridanie self-optimalizing vrstvy (A/B testing, dynamic scoring, AI content builders).

---

## 8. Najbližšie kroky

1. **Presunúť existujúci scraping kód** do:
   - `PortalNehnutelnostiSource.discoverNewAgencies`,
   - `SupabaseAgenciesRepository.upsertDiscoveredAgencies`.

2. **Presunúť existujúcu outbound logiku** (výber agentúr, tvorba emailov) do:
   - `createSupabaseOutboundRepositories`,
   - `SimpleOutboundContentBuilder` (neskôr AI builder).

3. **Pridať základné unit testy** pre:
   - `buildPlaybook`,
   - `AgencyDiscoveryEngine`,
   - `OutboundScheduler`.

4. **Spustiť prvé end-to-end joby**:
   - `run-agency-scraping.ts` s mock / real scraping kódom,
   - `run-daily-playbook.ts`,
   - `run-outbound-schedule.ts` + `run-outbound-send.ts` (na malej sade agentúr).
