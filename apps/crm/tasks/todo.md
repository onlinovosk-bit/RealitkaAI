# Revolis.AI — Tasks TODO
> Tento súbor spravuje Orchestrator Agent. Každý task je atomický, checkable, má vlastníka.
> BC-1: Všetky tasky s 3+ krokmi sú tu pred implementáciou.

---

## Aktuálne sprinty

### SPRINT: L99 AUTOMAT ONBOARDING — Agency Scraping (Bod 1)

- [x] **[A4]** Presunúť existujúci scraping kód do `PortalNehnutelnostiSource.discoverNewAgencies`
  - Skontrolovať `tmp-nehnutelnosti.html` a `src/infra/scraping/PortalNehnutelnostiSource.ts`
  - Doplniť reálny HTTP fetch + cheerio parsing z nehnutelnosti.sk do `discoverNewAgencies`
  - Overiť návratový tvar `DiscoveredAgency[]` (vrátane `externalId`, `name`, `email`, `phone`, `city`, `listingsCount`)
  - BC-4 Verification: spustiť job lokálne s mock HTML, skontrolovať výstup

- [ ] **[A4]** Dokončiť `SupabaseAgenciesRepository.upsertDiscoveredAgencies`
  - Overiť upsert logiku pre existujúce aj nové agentúry
  - Pridať `listings_snapshot` insert pre oba prípady
  - BC-4 Verification: unit test s mock Supabase klientom

- [ ] **[A4]** E2E test jobu `src/jobs/run-agency-scraping.ts`
  - Spustiť: `npx tsx src/jobs/run-agency-scraping.ts`
  - Overiť záznamy v `agencies` a `listings_snapshot` tabuľkách

---

### SPRINT: BC-8 — CI /loop Monitoring Napojenie

- [ ] **[A4]** Definovať `tasks/ci-loop.md` — zoznam CI krokov pre `/loop` monitoring
- [ ] **[A4]** Integrovať `/loop` do GitHub Actions workflow (ak existuje)
- [ ] **[A6]** Overiť tracking events pre experiment pipeline (RVLS-EXP-001 flow)

---

### SPRINT: L99 AUTOMAT ONBOARDING — Unit Testy (Bod 3)

- [ ] **[A4]** Unit test pre `buildPlaybook` (domain engine)
- [ ] **[A4]** Unit test pre `AgencyDiscoveryEngine.run()` (mock sources)
- [ ] **[A4]** Unit test pre `OutboundScheduler.schedule()` (mock repos)

---

### SPRINT: L99 AUTOMAT ONBOARDING — Outbound Pipeline (Bod 2)

- [ ] **[A6]** Presunúť výber agentúr do `createSupabaseOutboundRepositories`
- [ ] **[A3]** Doplniť `SimpleOutboundContentBuilder` s reálnymi šablónami (A1/B1 segment)
- [ ] **[A4]** Spustiť `run-outbound-schedule.ts` + `run-outbound-send.ts` na malej sade

---

## Backlog

- [ ] Pridať `tasks/lessons.md` ako živý dokument po každej korekcii (BC-3)
- [ ] RACI review — Boris Cherny delta RACI (PART 26, riadky ~2799 v MASTER_PROMPT_V3.md)
- [ ] Nasadiť `realvia-ingestion` pipeline na staging (Market Intel Agent)
- [ ] Audit modal flow + Stripe checkout — verifikácia webhook `payment.succeeded` (RVLS-AUDIT-V1)
