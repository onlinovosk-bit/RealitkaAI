## [2026-09-15] — W3 CLOSE: top-tier-gate A/B/C ARTEFAKT, main scorecard nezmenený

- **Decision:** Beh `2026-09-14-top-tier-gate` uzavretý ako ARTEFAKT×3. Merge do main je Founder GO; agent nemerguje.
- **Why:** Tri handoffy (A Judge ACCEPT, B Judge ACCEPT, C PASS) splnili „3 real handoffs". Prod čísla, čo sa pohli, sú atribúcia pred 12:30 — scope držal.
- **Scorecard honesty:** na `main` stále 0 GREEN / 5 AMBER / 5 RED. G3 GREEN-kandidát a G9 AMBER+ existujú len na vetvách do merge.
- **Merge order:** #554 (A) → #555 (B, base A) → #553 (C, base main). Po A overiť Actions `Typecheck (baseline gate)`.
- **Side finding (nie výsledok behu):** živé leady `portal:Reality.sk` / `portal:Bazoš.sk` — SIGNAL mimo Realvie.
- **Artifact:** `docs/reports/2026-09-15-w3-top-tier-gate-final.md`
- **Next:** business loop od 3. kroku = samostatná úloha po merge gate.

# Critical Decisions Log

## [2026-09-06] â€” REVOLIS Inter-Agent Bus v1.0: Phase 1 copy-paste protocol BUILD

- **Decision:** Create a manual GPT/SOL <-> Claude Code protocol as a docs-only
  Phase 1 bus, not an automated agent/orchestrator system.
- **Why:** The immediate value is reducing handoff ambiguity, context drift and
  "done" without verification. Automation before a proven manual protocol would
  make chaos faster, not better.
- **Scope:** STACK 0 Constitution, STACK 2 Task Contract, STACK 3 Context Packet,
  STACK 4 Inter-Agent Message, STACK 7 Quality Gate, plus Execution Result and
  Decision Artifact templates.
- **Rejected now:** shared message store, MCP layer, cost governor, full
  orchestrator, registry service, DB schema, UI.
- **Engineering justification:** Trigger: new-governance-doc / prompt standard.
  Decision path: extend-existing `docs/prompts/` copy-paste prompt surface and
  `memory/decisions.md` Decision Memory; no runtime code, dependency, database or
  app route. Alternatives considered: (a) one super-prompt â€” rejected because it
  hides boundaries; (b) build automated autonomous agents now â€” rejected as
  premature and higher-risk; (c) leave protocol only in chat â€” rejected because
  repo is the communication channel. Contradiction check: none; this complements
  the killed/blocked Agent OS V0 path by staying manual and docs-only.
- **Artifact:** `docs/prompts/revolis-inter-agent-bus-v1.md`,
  `docs/reports/2026-09-06-revolis-inter-agent-bus-v1.md`.
- **Revisit:** after the next 3 real GPT -> Claude Code handoffs; automate only
  fields that repeatedly survive manual use without confusion.
- **Founder review amendment (2026-09-06):** GO 9/10 accepted for Phase 1.
  Added official role boundary: Founder = human authority; SOL/GPT = Strategic
  Architect + Context Governor + Handoff Designer + Reviewer; Claude Code =
  Engineering Execution Environment. Added Inter-Agent Bus Evolution Rule:
  build -> use in real work -> observe friction -> fix protocol -> repeat ->
  only then automate. Real Handoff #1 is the next intended use, but it requires
  a concrete engineering task; Phase 2 remains explicitly blocked.

## [2026-09-06] â€” Smolko chatbot: internal CRM assistant BUILD, public Concierge still gated

- **GO:** Founder "Go Chatbot pre Smolka."
- **Decision:** Build only a safe internal CRM assistant slice in `/revolis-ai`,
  not the public Website Concierge.
- **Why:** Constitution value exists if it answers "komu volaĹĄ a ÄŤo zachrĂˇniĹĄ
  dnes" from own CRM data. Public chatbot still has existing blockers SMO-B04
  through SMO-B09 in `docs/reports/2026-09-06-smolko-chatbot-status.md`.
- **Data source:** Master Data Sourcing Map Zhluk 1 â€” own CRM data (`leads`,
  `tasks`). No new external source.
- **GDPR boundary:** No OpenAI/Claude/embedding call for chat questions; no new
  external processor for Smolko CRM content in this slice. Public Concierge still
  needs SMO-B05 before launch.
- **Engineering justification:** Trigger: new API route, component, lib and
  tests. Decision path: reuse â€” existing `/revolis-ai` surface, `listLeads`,
  `listTasks`, `api-response`, `api-validate`, `incrementUsageMetric`,
  `createClient`, Slate Horizon tokens. Alternatives considered: public
  Concierge now (rejected â€” SMO-B04â€“B09 blocked), LLM chat over CRM PII
  (rejected â€” GDPR/provider gate), new DB tables (rejected â€” not needed).
  Contract telemetry uses `usage_metrics_daily` metric `ai_chatbot_queries`.
  Contradiction check: none; public chatbot remains explicitly blocked.
- **Artifact:** `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`.



## [2026-09-05] â€” StrĂˇĹľca prĂ­toku BUILD (Brief 18 V2)

- **GO:** Founder â€žStrĂˇĹľca GO.â€ś
- **Scope:** doruÄŤenie unread `routine_notifications` + Realvia 48h/7d prahy (nie customer-health L2).
- **Brief:** `task-strazca-pritoku.md` v Downloads chĂ˝bal â†’ kanon = Brief 18 V2.
- **Artefakt:** vetva `feat/b18-notification-delivery`, report `docs/reports/2026-09-05-strazca-pritoku.md`.
- **STOP:** merge / PROD smoke / secrets = founder.

## [2026-09-03] â€” GO P0 HONEST UNKNOWN MAPPING

- NeznĂˇmy Realvia kĂłd â†’ **`NeznĂˇme`**, nie fog do `OstatnĂ©` / `Predaj`.
- SpornĂ© znĂˇme: **13/14** a **123** â†’ `NeznĂˇme` (neodvodzovaĹĄ Byt/PrenĂˇjom z titulov).
- Guardian: `unverified_property_type` / `unverified_transaction_type` blokuje pass.
- Backfill 132 = samostatnĂ© GO. ÄŚĂ­selnĂ­k od Realvie stĂˇle treba.
- DĂ´kaz: `docs/reports/2026-09-03-realvia-honest-unknown-mapping.md`.

## [2026-09-03] â€” Property Launch Pack V0 = VALIDATE/spec (no code yet)

- **Verdikt:** zjednotiĹĄ KF1 `listing-content` + Wave 1 `vertical-pack-demo` cez jeden kanonickĂ˝ vstup a jeden Quality Guardian gate; export bez publish; **bez novej DB**; bez chatbota.
- **Prod limity v IR:** `properties` 132 Smolko; OstatnĂ© 63â€“65 % = adapter `mapCategory` (nie prĂˇzdny payload); `ai_generations` na prod **chĂ˝ba**.
- **ImplementĂˇcia:** STOP do `GO IMPLEMENT PROPERTY LAUNCH PACK V0`.
- **Artefakty:** `docs/briefs/BO-property-launch-pack-v0.md`, `docs/reports/2026-09-03-property-launch-pack-integration.md`.

## [2026-09-03] â€” Audit kĂłdu nie je audit dĂˇt

Ku kaĹľdĂ©mu tvrdeniu â€žtoto uĹľ mĂˇmeâ€ś sa dokladĂˇ **poÄŤet riadkov v produkcii**, nie existencia sĂşboru. PlatĂ­ pre briefy, roadmapy aj Integration Reporty.

**Doplnok:** poÄŤet riadkov â‰  sprĂˇvnosĹĄ. Mapped polia overovaĹĄ proti nezĂˇvislĂ©mu signĂˇlu (`title`). NeznĂˇmy kĂłd â†’ `NeznĂˇme` (P0 honest unknown), nie fog do legitĂ­mnej kategĂłrie.

## [2026-09-03] â€” customer-health PROD smoke PASS

- `GET https://app.revolis.ai/api/cron/customer-health` + Production `CRON_SECRET`: 401 without/wrong bearer, 200 with secret.
- Smolko `11111111-â€¦-111` **red**, paying, `LEAD_SILENCE` 37 dnĂ­ + `NEVER_LOGGED_IN_SHARE` 92 %. Persist 4 rows. DĂ´kaz: `docs/reports/2026-09-03-customer-health-smoke.md`.

## [2026-09-03] â€” customer-health tabuÄľka na PROD + cron na main

- **#507** merged `203829403` (Vercel cron `0 7 * * *` â†’ `/api/cron/customer-health`).
- **PROD** `ypgajkhqtbriqqmyawyv`: `public.customer_health_daily` uĹľ stĂˇla (RLS on, 0 policies, 0 rows). GO SQL = zapĂ­sanĂ˝ `supabase_migrations.schema_migrations` `20260903070000` / `customer_health_daily`.
- **DĂ´kaz:** `docs/reports/2026-09-03-customer-health-sql-applied.md`.
- Live Bearer smoke (Smolko red) = ÄŹalĹˇĂ­ GO.

## [2026-09-02] â€” PROD `profiles` UPDATE: vĹľdy service_role + RETURNING

- **OpakovanĂ˝ incident (3Ă—):** `profiles_guard_*` triggery (`role`/`agency_id`, `account_tier`/`ui_role`, `is_platform_admin`) **ticho vrĂˇtia** zmenu, ak UPDATE nebeĹľĂ­ ako `service_role`. Dashboard SQL bez `SET LOCAL` vyzerĂˇ ĂşspeĹˇne, ale `RETURNING` ukĂˇĹľe starĂş hodnotu â€” alebo sa zmena vĂ´bec neprejavĂ­.
- **Pravidlo (povinnĂ©):** KaĹľdĂ˝ PROD `UPDATE` na `public.profiles` sa robĂ­ v transakcii so `SET LOCAL request.jwt.claim.role = 'service_role'` a s `RETURNING`. Bez vĂ˝nimky.
  ```sql
  BEGIN;
  SET LOCAL request.jwt.claim.role = 'service_role';
  UPDATE public.profiles SET â€¦ WHERE â€¦ RETURNING id, email, â€¦;
  COMMIT;
  ```
- **Overenie:** `RETURNING` musĂ­ ukĂˇzaĹĄ oÄŤakĂˇvanĂş hodnotu. Ak nie â€” trigger zasiahol; STOP, nie â€žasi OKâ€ś.
- **Kontext #496:** `profiles.id` â‰  `auth.uid()` na PROD â†’ platform-admin gate musĂ­ lookupovaĹĄ cez `.or(auth_user_id.eq.{uid},id.eq.{uid})` (vzor `/trh`, #469).
- **DotknutĂ©:** `fetchProfilePlatformAdminFlag`, `canAccessOperatorDashboard`, grant `is_platform_admin` po migrĂˇcii `20260728140000`.

---

## [2026-08-25] â€” ONL-MCP-001: BUILD gateway, DON'T BUY Premium-for-MCP

- **Rozhodnutie (agent recommendation, founder eĹˇte nepodpĂ­sal):** stavaĹĄ vlastnĂ˝ vendor-neutral Onlinovo MCP Gateway; **nekupovaĹĄ** Shoptet Premium vĂ˝hradne kvĂ´li oficiĂˇlnemu MCP (floor 12 000 KÄŤ/mÄ›s.). ImplementĂˇcia **STOP** do `GO ONL-MCP-002`.
- **Timing:** founder override â€” audit **dnes v noci** 25. 8. 2026, nie 26.â†’27. 8.
- **Fakty:** Onlinovo.sk = Shoptet (verejnĂ˝ fingerprint). Tarif Premium vs standard = **NEZNĂME**. REST API len cez marketplace addon; Shoptet nepĂ­Ĺˇe cestu â€žAPI pre jeden e-shopâ€ś.
- **Artefakt:** `docs/onlinovo/ONL-MCP-FEASIBILITY.md`, `docs/reports/2026-08-25-onl-mcp-001-feasibility.md`, TASK-0005 done.
- **Mimo:** `apps/crm`, prod Shoptet write, ONL-MCP-002/003/004.

---

- [2026-04-29] CI/CD: VyrieĹˇenĂ˝ "Nuclear Option" pre artifacty (apps/crm/.next). Pipeline je ZELENĂ.
- [2026-04-29] XML Feed: ZvolenĂˇ Varianta 1 (VlastnĂ˝ web) pre utajenie pred Webexom.
- [2026-04-29] Outreach: DefinovanĂ© ĹˇablĂłny pre segmenty A (Hot), B (Warm), C (Cold).

## [2026-04-30] - L99 Core Architecture & Security Overhaul

### 1. Rozhodnutie: Prechod na Ĺ tafetovĂş (Relay) OrchestrĂˇciu
- **AlternatĂ­vy:** FixnĂ© crony bez kontroly stavu (pĂ´vodnĂ©), manuĂˇlne spĂşĹˇĹĄanie.
- **PreÄŤo:** EliminĂˇcia kaskĂˇdovĂ˝ch chĂ˝b. KaĹľdĂ˝ krok (Scrape -> Score -> Segment) spracuje len dĂˇta pripravenĂ© predchĂˇdzajĂşcim krokom.
- **DĂ´sledok:** SystĂ©m je autonĂłmny a odolnĂ˝ voÄŤi timeoutom API.

### 2. Rozhodnutie: CentralizovanĂ˝ Revolis Guard (Middleware)
- **AlternatĂ­vy:** Overovanie kÄľĂşÄŤov v kaĹľdom sĂşbore zvlĂˇĹˇĹĄ, Ĺľiadne zabezpeÄŤenie.
- **PreÄŤo:** DRY (Don't Repeat Yourself) princĂ­p. Jeden "vyhadzovaÄŤ" pre vĹˇetky endpointy uÄľahÄŤuje ĂşdrĹľbu a zvyĹˇuje bezpeÄŤnosĹĄ.

### 3. Rozhodnutie: AutomatizovanĂˇ RotĂˇcia KÄľĂşÄŤov (Secret Rotation)
- **AlternatĂ­vy:** StatickĂ© heslĂˇ v kĂłde, manuĂˇlne generovanie hesiel.
- **PreÄŤo:** L99 Security Standard. PouĹľitie 32-znakovej nĂˇhodnej entropie (openssl) minimalizuje riziko Ăştoku hrubou silou.

### 4. Rozhodnutie: Zjednotenie PrĂ­kazov (One-Click Deployment)
- **AlternatĂ­vy:** Posielanie ÄŤiastkovĂ˝ch kĂłdov, vysvetÄľovanie ciest k sĂşborom.
- **PreÄŤo:** RĂ˝chlosĹĄ exekĂşcie. Spojenie generovania kÄľĂşÄŤov, Ăşpravy .env, vercel.json a endpointov do jednĂ©ho Bash skriptu eliminuje chybu pouĹľĂ­vateÄľa.
---
## [2026-04-30] - Slack & Morning Briefing Integration
- **Rozhodnutie:** CentralizĂˇcia Slack notifikĂˇciĂ­ do /lib/slack.js a vytvorenie briefing endpointu.
- **PreÄŤo:** Aby rannĂ˝ briefing aj Outreach engine zdieÄľali rovnakĂş infraĹˇtruktĂşru a tajomstvĂˇ (.env).
- **DĂ´sledok:** AutomatizovanĂ˝ prehÄľad kaĹľdĂ© rĂˇno o 8:00 (podÄľa vercel.json).
---
## [2026-04-30] - DefinĂ­cia AI Soul & Personality
- **Rozhodnutie:** Vytvorenie personality.md ako riadiaceho dokumentu pre AI.
- **PreÄŤo:** Aby kaĹľdĂˇ novĂˇ session zaÄŤĂ­nala s jasnĂ˝m pochopenĂ­m tvojich preferenciĂ­ (rĂ˝chlosĹĄ, automatizĂˇcia, bezpeÄŤnosĹĄ).
- **DĂ´sledok:** EliminĂˇcia repetitĂ­vnych inĹˇtrukciĂ­. AI sa stĂˇva tvojĂ­m digitĂˇlnym dvojÄŤaĹĄom v inĹľinierstve.
---
## [2026-04-30] - ImplementĂˇcia Productivity Framework (2x-50x)
- **Rozhodnutie:** KlasifikĂˇcia Revolis.AI podÄľa 20x Agent modelu a vytvorenie skills.md.
- **PreÄŤo:** Aby sme vedeli, kde sa nachĂˇdzame na ceste k 50x Agent Teamu.
- **DĂ´sledok:** KaĹľdĂˇ novĂˇ funkcia bude navrhovanĂˇ ako Skill Chain (10x), nie ako samostatnĂ˝ Prompt.
---
## [2026-04-30] - Transition to 50x Agent Team (Competitor Agent)
- **Rozhodnutie:** Nasadenie prvĂ©ho ĹˇpecializovanĂ©ho Agenta beĹľiaceho paralelne s hlavnĂ˝m flowom.
- **PreÄŤo:** ImplementĂˇcia Hormoziho princĂ­pu "Speed to Opportunity". Sledovanie konkurencie nesmie brzdiĹĄ hlavnĂ˝ scraping.
- **DĂ´sledok:** SystĂ©m sa menĂ­ z lineĂˇrnej Ĺˇtafety na paralelnĂş fabriku (Agent Team).
---
## [2026-04-30] - Deployment of Social Media Scout Agent
- **Rozhodnutie:** Vytvorenie POST endpointu pre externĂ© sociĂˇlne leady.
- **PreÄŤo:** Facebook skupiny sĂş "ÄŤierny trh" s realitami. Potrebujeme tam maĹĄ sondu, ktorĂˇ zachytĂˇva dopyt skĂ´r, neĹľ sa dostane na portĂˇly.
- **DĂ´sledok:** Revolis AI uĹľ nesleduje len oficiĂˇlne weby, ale nasĂˇva dĂˇta z komunitnĂ©ho priestoru.
---
## [2026-04-30] - Deal-Trigger Deployment & Smoke Test Fix
- **Rozhodnutie:** Nasadenie Deal-Trigger Agenta (15 min interval) a vytvorenie Profit Dashboardu.
- **PreÄŤo:** Prechod od detekcie k akcii (NEGOTIATION_READY). Odblokovanie CI/CD cez dummy ENV kriedenciĂˇly.
- **DĂ´sledok:** SystĂ©m uĹľ len neinformuje, ale proaktĂ­vne tlaÄŤĂ­ najlepĹˇie ponuky p. Smolkovi pod nos.
---
## [2026-04-30] - FinĂˇlny Branding a HybridnĂˇ DokumentĂˇcia
- **Rozhodnutie:** MarketingovĂ© nĂˇzvy "STRĂĹ˝CA CIEN A ZISKOV" a "REALITY MONOPOL".
- **PreÄŤo:** MaximalizĂˇcia emĂłcie v predaji pri zachovanĂ­ kontinuity v dokumentĂˇcii (p. Smolko).
- **DĂ´sledok:** SystĂ©m je "vlk v rĂşchu barĂˇnka" â€“ navonok dravĂ˝, vnĂştri administratĂ­vne ÄŤistĂ˝.
---
## [2026-04-30] - UI Transformation: Slack-Style Navigation
- **Rozhodnutie:** Prechod na dvojĂşrovĹovĂş boÄŤnĂş navigĂˇciu a centrĂˇlne vyhÄľadĂˇvanie.
- **PreÄŤo:** OdstrĂˇnenie chaosu. ZvĂ˝Ĺˇenie prehÄľadnosti cez hierarchickĂ© usporiadanie (Ikony -> Kapitoly -> Obsah).
- **DĂ´sledok:** ProfesionĂˇlne, scannovateÄľnĂ© rozhranie pripravenĂ© na ĹˇkĂˇlovanie (Agent Team).
---
## [2026-04-30] - Global UI Shift & Stress Test Evaluation
- **Rozhodnutie:** Preklopenie celej aplikĂˇcie na SlackLayout cez root layout.
- **PreÄŤo:** Konzistencia. UĹľĂ­vateÄľ nesmie pociĹĄovaĹĄ skoky medzi starĂ˝m a novĂ˝m dizajnom.
- **VĂ˝sledok testu:** 1000 leadov spracovanĂ˝ch ĂşspeĹˇne. ArchitektĂşra ĹˇkĂˇluje lineĂˇrne.
---
## [2026-04-30] - UI Cleanup & Slack Purple Theme
- **Rozhodnutie:** OdstrĂˇnenie auditnĂ˝ch textov z dema, zrĂ˝chlenie scrollovania o 10% (na 18s cyklus) a implementĂˇcia Purple/Dark toggle.
- **PreÄŤo:** VyÄŤistenie vizuĂˇlneho Ĺˇumu a zvĂ˝Ĺˇenie dynamiky rozhrania. PersonalizĂˇcia podÄľa preferenciĂ­ p. Smolka (Slack identity).
- **DĂ´sledok:** Demo pĂ´sobĂ­ profesionĂˇlnejĹˇie a systĂ©m zĂ­skal ikonickĂ˝ Slack Purple vzhÄľad.
---
## [2026-04-30] - AktivĂˇcia SMS Konceptora (Protokol 1C, 2B, 3B)
- **Rozhodnutie:** Nasadenie poloautomatickĂ©ho systĂ©mu na generovanie SMS konceptov orientovanĂ˝ch na exkluzivitu.
- **PreÄŤo:** MaklĂ©r si zachovĂˇva kontrolu nad komunikĂˇciou (2B), ale nestrĂˇca ÄŤas pĂ­sanĂ­m (InformatĂ­vny tĂłn 1C buduje dĂ´veru).
- **DĂ´sledok:** ZvĂ˝Ĺˇenie konverzie leadov na exkluzĂ­vne zmluvy vÄŹaka bleskovĂ©mu doruÄŤeniu relevantnej sprĂˇvy.
---
## [2026-04-30] - AktivĂˇcia Social-to-SMS Bridge
- **Rozhodnutie:** Prepojenie Social Media Scouta s SMS konceptorom pre bleskovĂ© reakcie na Facebooku.
- **PreÄŤo:** V sociĂˇlnych skupinĂˇch rozhodujĂş minĂşty. Automaticky pripravenĂ˝ koncept ĹˇetrĂ­ ÄŤas pri copy-paste komunikĂˇcii.
- **DĂ´sledok:** p. Smolko pĂ´sobĂ­ ako technologicky najlepĹˇie vybavenĂ˝ maklĂ©r, ktorĂ˝ mĂˇ prehÄľad vĹˇade.
---
## [2026-04-30] - Deployment NightWatch & AskUserQuest Protocol
- **Rozhodnutie:** Nasadenie automatickĂ©ho veÄŤernĂ©ho reportu o 20:00 a integrĂˇcia AskUserQuest protokolu do jadra AI.
- **PreÄŤo:** Uzatvorenie feedback loopu (p. Smolko vidĂ­ vĂ˝sledok dĹa) a zefektĂ­vnenie komunikĂˇcie cez multi-select otĂˇzky.
- **DĂ´sledok:** SystĂ©m je plne autonĂłmny v reportovanĂ­ a AI je riadenĂˇ rĂ˝chlymi voÄľbami uĹľĂ­vateÄľa.
---
## [2026-05-22] - Realvia Export v2 Integration Contract
- **Rozhodnutie:** VĹˇetky Realvia-facing endpointy vracajĂş `{ result: "ok"|"error", message: string }` (PR #58).
- **PreÄŤo:** Realvia feedback cielil vĂ˝hradne na response format â€” poslednĂ˝ technickĂ˝ blocker integrĂˇcie.
- **DĂ´sledok:** Webhook + import majĂş jednotnĂ˝ kontrakt zladenĂ˝ s Realvia dokumentĂˇciou.

## [2026-05-22] - Realvia Delete Payload v2
- **Rozhodnutie:** `isDeletePayload` rozpoznĂˇva `{ source_id, action: "delete", archiveType? }` namiesto `deleted: true` (PR #59).
- **PreÄŤo:** Realvia export v2 posiela `action: delete`, nie legacy boolean flag.
- **DĂ´sledok:** archiveType mapuje status: soldâ†’PredanĂˇ, rentâ†’PrenajatĂˇ, cancelâ†’StiahnutĂˇ.

## [2026-05-22] - Unified Realvia Auth Error Message
- **Rozhodnutie:** VĹˇetky auth failure z `validateSecret` vracajĂş `Invalid authentication` (PR #60).
- **PreÄŤo:** KonzistentnĂ˝ externĂ˝ kontrakt; internĂ© logy zachovĂˇvajĂş detail.
- **DĂ´sledok:** Realvia vĹľdy vidĂ­ rovnakĂş auth error message bez ohÄľadu na missing/wrong token.

## [2026-05-22] - AI Shared Memory Layer (P0)
- **Rozhodnutie:** GitHub `memory/` ako handoff vrstva medzi Cursor/Claude a ChatGPT (nie Notion/CrewAI teraz).
- **PreÄŤo:** EliminĂˇcia copy/paste drift; repo uĹľ mĂˇ `session-summary.md`, `decisions.md`, rules, agents.
- **DĂ´sledok:** Jeden sĂşbor handoff namiesto celĂ©ho chatu; orchestration tools aĹľ po Realvia GO.
---
## [2026-06-11] - Ochrana proti merge zo zastaranĂ©ho main (swarm)

- **Rozhodnutie:** GitHub branch protection na `main`: **Require branches to be up to date before merging** + required check `Lint, test, build`.
- **PreÄŤo:** Tri incidenty za 3 dni (#160 bez allowlistu, stale capabilities JSON, stale `decision-flags.verification` po #170) â€” paralelnĂ© vetvy mergnutĂ© bez rebase.
- **DĂ´sledok:** SĂ©mantickĂ© konflikty v CI pred merge. Agent pravidlo: grep `tests/verification/` pri zmene sprĂˇvania. Kanon: `apps/crm/tests/verification/README.md`.

## [2026-06-04] - Arbitrage analyze: `empty` vs `source` (PR-3)
- **PoznĂˇmka (nie bug):** PrĂˇzdny scan vracia `empty: true` + `source: 'live'`, nie `source: 'empty'`. UI spolieha na `empty`, nie na literal `'empty'`. Ak nieÄŤo neskĂ´r filtruje `source === 'empty'`, nenĂˇjde to â€” stealth-recruiter pouĹľĂ­va `'empty'` inak.
- **Cron / copy:** Hobby Vercel = dennĂ© sloty v `apps/crm/vercel.json` (#96). UI copy v `ArbitrageDashboard` zosĂşladenĂ© na "raz denne" (lokĂˇlne, ÄŤakĂˇ malĂ˝ PR).
- **Auto-deploy:** Po merge #96 production deploy `realitka-rcsem38y0` (~5 min) â€” Git hook funguje; predtĂ˝m blokoval aj Hobby `*/6` validĂˇcia. SledovaĹĄ "Ignored Build Step", ak sa znova canceluje preview/prod.

## [2026-06-04] - v1 scope + nav inventĂşra (post PR-3)
- **v1 = CRM + AI jadro** (LIVE: leady, triĂˇĹľ, call analyzer, playbook, Realvia). TrhovĂ˝ feed (`portal_listings` bridge) â†’ backlog **post-v1**, nie teraz. ArbitrĂˇĹľ = ĂşprimnĂ˝ prĂˇzdny modul.
- **Nav /arbitrage:** V `lib/navigation.ts` NAV_ITEMS existuje, ale chĂ˝bal v `NAV_GROUPS` (legacy sidebar). Workdesk (`AppSidebar`) ÄŤĂ­ta `types/navigation.ts` `ALL_NAV_ITEMS` â€” tam poloĹľka **chĂ˝bala Ăşplne** (nie tier gate). Oprava: pridaĹĄ do `ALL_NAV_ITEMS` + `NAV_GROUPS.arbitrage`.
- **PlĂˇn + rola (P0 backlog):** Smolko screenshot = `agent_solo` (Active Force + MaklĂ©r) namiesto `owner_vision` + Market Vision. `enforceSmolkoOwnerDefaults` v kĂłde existuje â€” overiĹĄ, ÄŤi beĹľĂ­ na prod (profil lookup / email / deploy). DĂ´leĹľitejĹˇie neĹľ arbitrĂˇĹľ link.
---

## [2026-06-18] - Stealth funnel incident + CI guard AP-011
- **Incident:** Cursor vygeneroval `stealth-funnel` (zakĂˇzanĂ©) bez explicitnĂ©ho pokynu â€” zahodenĂ© pred commitom; kontaminĂˇcia v `proxy.ts`, `sales-funnel-store`, `update-status` tieĹľ vyÄŤistenĂˇ.
- **Medzera:** CI guard hÄľadal len `stealth-recruiter`; novĂ© meno `stealth-funnel` by preĹˇlo.
- **Rozhodnutie:** Guard rozĹˇĂ­renĂ˝ z konkrĂ©tneho mena na vzor `stealth[-_]?(funnel|lead|recruiter|program)` (PR guard-first, potom tenant isolation). ZĂˇpis AP-011 v `docs/architecture/antipatterns-log.md`.

---
- **Stav:** `SCHEMA_GUARD_SUPABASE_URL` + `SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY` nie sĂş v GitHub Actions secrets â†’ scheduled guard padal kaĹľdĂş noc (konfiguraÄŤnĂ˝ fail, nie drift).
- **Rozhodnutie:** Cron v `.github/workflows/schema-governance-guard.yml` **doÄŤasne vypnutĂ˝**; `workflow_dispatch` ostĂˇva pre manuĂˇlny beh po nastavenĂ­ secrets.
- **Re-enable:** Po doplnenĂ­ secrets odkomentovaĹĄ `schedule` (04:17 UTC) â€” guard mĂˇ chytaĹĄ skutoÄŤnĂ˝ schema drift (AP-008), nie ĹˇumovaĹĄ faloĹˇnĂ˝mi ÄŤervenĂ˝mi.
- **SĂşvis:** Brief 12 Wave B governance; Brief 14 merge #211 na `main`.

---

## [2026-06-19] - BRI / Smolko 439 leadov â€” honest pending, Ĺľiadny backfill

- **Fakt:** Realvia import = identita (meno+email), nie kvalifikĂˇcia. 439/439 prĂˇzdne `budget`/`timeline`/`financing`/`last_contact`; dĂˇta nie sĂş v `payload_raw` ani inde.
- **VETO backfill:** BRI sa **nedĂˇ** oĹľiviĹĄ backfillom z Realvie â€” nemĂˇme z ÄŤoho.
- **Rozhodnutie A (BUILD teraz):** **Honest pending** â€” UI "NekvalifikovanĂ© / chĂ˝bajĂş Ăşdaje" (AP-001). BRI kĂłd nemenĂ­me; oĹľije pri reĂˇlnej prĂˇci maklĂ©ra alebo kvalifikaÄŤnom formulĂˇri.
- **Rozhodnutie B (VALIDATE):** Zdroj kvalifikĂˇcie = Smolko admin **Klienti/Dopyty** (NehnuteÄľnosti) â€” preskĂşmaĹĄ CSV export; nie enrichment engine na prĂˇzdnych poliach.
- **Realvia:** PrimĂˇrny zdroj nehnuteÄľnostĂ­ + identĂ­t leadov; UC direct handoff zruĹˇenĂ˝.
- **Reconcile (B1, #222):** SpustiĹĄ `?reconcile_processed=1` **aĹľ po merge #222**; len pĂˇrovanie cez `source_id` + existujĂşca property (AP-010), nie hromadnĂ˝ prepis. Kozmetika monitoringu, nie blocker.

---

## [2026-06-20] - Vlna 1+2 verified (Smolko PROD vizuĂˇl + brĂˇna A3)

- **Route:** `https://app.revolis.ai/vertical-pack/13303557` Â· login **Reality Smolko** (Rastislav Smolko).
- **Vlna 1 (#228/#229):** verified â€” completeness z reĂˇlneho PROD riadku **89% (8/9)**, chĂ˝ba len cena; listing score + capabilities beĹľia na ĹľivĂ˝ch dĂˇtach (10 fotiek).
- **Vlna 2 (#230):** verified â€” bannery PASS, decky + microsite vykreslenĂ©; **Ĺľiadny** ĹľltĂ˝ "DB riadok nenĂˇjdenĂ˝".
- **Guardian FLAG** na listing/deck/microsite kvĂ´li HTML v popise (`<br />`â€¦) â€” oÄŤakĂˇvanĂ© sprĂˇvanie K1; fix **PR #231** (strip HTML + skip cena 0 v listing body).
- **PoznĂˇmka:** 44% = len fixture fallback (inĂ˝ ĂşÄŤet); na Smolko PROD oÄŤakĂˇvaj **~89%**, nie 44%.
- **A3 brĂˇna:** `processed=false` count = **2**; cleanup SQL nespustenĂ© autonĂłmne (sprĂˇvne).
- **Backlog kozmetika:** A3 annotate Section 2 (2 riadky); merge #231 + re-check demo.

---

- **Vstup:** `docs/prompts/L99-lead-discovery-prompt.md` Â· 5 prĂˇvnych brĂˇn Â· 30-rolovĂˇ perspektĂ­va.
- **VĂ˝stup:** `docs/briefs/overnight/wave3-lead-discovery-roadmap.md` (18 legĂˇlnych spĂ´sobov, TOP 3, zahodenĂ©).
- **TOP 3 (VALIDATE/BUILD aĹľ po dĂˇtach):** (1) Smolko Dopyty CSV import, (2) first-party web/microsite formulĂˇr, (3) reaktivĂˇcia 439 so sĂşhlasom â€” **#3 vyĹľaduje samostatnĂ˝ Ăšstava + gdpr-advisor pred kĂłdom**.
- **VETO nestavaĹĄ:** attribution engine, dedup ML, portĂˇlovĂ© scraping, buyer-intent scraping, enrichment bez sĂşhlasu.
- **Overnight sekvencia:** Vlny 1â€“2 mergnutĂ© (#228â€“#230); A3 PROD SELECT = 2 pending webhook rows (unknown/delete, OK).
- **BUILD brief (pripravenĂ˝):** `docs/briefs/overnight/ruflo-swarm-smolko-dopyty-csv-import.md` â€” spusti po CSV od Smolka.

---

## [2026-07-22] - Sandbox demo + lead_consents (GO founder)

- **Brief:** `docs/briefs/overnight/overnight-brief-sandbox-gdpr.md` â€” GO na migrĂˇciu 2026-07-22.
- **Rozhodnutie:** InternĂˇ sandbox agency `22222222-...` + slug `demo` (FK bez nullable zmeny). Consent do `lead_consents`, nie ÄŹalĹˇie stÄşpce na `leads`.
- **MigrĂˇcia:** `20260722120000_sandbox_gdpr_consent.sql` â€” `is_sandbox`, `sandbox_submissions`, `lead_consents`, seed `/odhad/demo`.
- **BrĂˇna po merge:** founder mobile smoke `/odhad/demo` + Supabase check (0 leads) pred zdieÄľanĂ­m demo linku.


- **Fakt z reĂˇlneho exportu:** stÄşpce `ID, Email, TelefĂłn, Meno, Priezvisko, Meno vlastnĂ­ka, Rola vlastnĂ­ka`.
- **UĹľ v DB (439 leadov z Realvia):** ID, email, telefĂłn, meno, priezvisko â€” ~95% duplikĂˇt.
- **JedinĂ© novĂ©:** priradenie klient â†’ maklĂ©r (`Meno vlastnĂ­ka` / `Rola vlastnĂ­ka`) â€” marginĂˇlne, nie kvalifikĂˇcia.
- **Dopyty:** kvalifikaÄŤnĂ© dĂˇta (rozpoÄŤet, ÄŤo hÄľadĂˇ, timeline) â€” **hromadnĂ˝ export NEDOSTUPNĂť** (Smolko potvrdil).
- **VETO BUILD:** CSV import Klientov **nespĂşĹˇĹĄaĹĄ** â€” prĂ­nos (meno maklĂ©ra) neodĂ´vodĹuje PROD write na 439 riadkov.
- **BRI cesta:** reĂˇlna kvalifikĂˇcia pri kontakte maklĂ©ra + honest pending UI; prĂ­padne first-party formulĂˇr (roadmap TOP #2), nie export.
- **VoliteÄľnĂ© backlog:** `assigned_makler` cez email match â€” len po Ăšstave GO; nie priorita.

---
- **Rozhodnutie:** Overnight swarm Brief 9.0 â€” FĂˇza 0 `feat/automerge-policy` (Tier 3, merge Andy pred spanĂ­m); Vlny 1â€“3 aĹľ po merge robot PR + midnight gate.
- **PravidlĂˇ:** Tier 1 okamĹľitĂ˝ merge (docs/tests/md); Tier 2 po 6 h; Tier 3 denylist (`.github`, migrĂˇcie, auth, billing, ceny, Smolko). Robot vykonĂˇva `docs/AUTOMERGE-POLICY.md`, neinterpretuje.
- **Swarm:** `swarm-1781208552399-vakdrp` (Ruflo hierarchical, 12 agentov).
- **Pre-flight 8.0:** RLS #184 CI zelenĂ©; #183 partial; landing/metrics/nehnuteÄľnosti/w2 â€” vetvy neexistujĂş.
- **Lekcia:** REPORTOVANĂ‰ â‰  COMMITNUTĂ‰; vitest include â‰  CI run (opravenĂ© na #184).
---

## [2026-06-22] - #235 Guardian multi-area (13303557) â€” BUILD

- **Overenie:** PROD popis explicitne: zastavanĂˇ **167 mÂ˛**, ĂşĹľitkovĂˇ **120 mÂ˛**, pozemok **4.500 mÂ˛**; DB `building_area=167`, `usable_area=120`, `land_area=4500`.
- **Rozhodnutie:** Cesta (b) â€” rozĹˇĂ­riĹĄ `PropertyFacts` (`buildingArea`, `plotArea`) + Guardian skenuje vĹˇetky mÂ˛ v tele proti mnoĹľine povolenĂ˝ch plĂ´ch (ĹˇtruktĂşrovanĂ© + mÂ˛ z `source.description`). Cena 0 nevyvolĂˇva price drift scan.
- **VĂ˝sledok:** PROD smoke script â€” **6/6 capability Guardian PASS** (`fromFixture: false`). **Completeness score** (rubrika `scoreListingCompleteness`, 9 polĂ­): **44 %** = 4/9 pre `13303557` â€” nie 89 % (89 % bol docs drift; jedinĂ˝ zdroj pravdy je `listing-score/score.ts`).
- **SĂşbory:** `quality-guardian/types.ts`, `review.ts`, `listing-generator/generate.ts`, testy.

## [2026-06-23] - AP-012 nosiÄŤ: vĂˇgny chore/docs commit (e7040db88) â€” VETO / cleanup

- **Incident:** 4 L99 governance docs (`premortem-mitigations`, `gdpr-operational-checklist`, `tech-ownership`, `product-one-thing`) sa dostali na `main` cez `e7040db88` (`chore(crm): tier label tests, QA docsâ€¦`), nie cez schvĂˇlenĂ˝ feature PR (#240 bol ÄŤistĂ˝ kĂłd).
- **Vektor:** horĹˇĂ­ neĹľ "scope pri malom PR" â€” **vĂˇgna `chore`/`docs` nĂˇlepka**, ktorĂş nikto neÄŤĂ­ta riadkovo.
- **Rozhodnutie:** docs **vyhodenĂ©** z produkÄŤnĂ©ho repa (PR #242); koncepty idĂş do Kit backlogu, nie do CRM pri oprave odkazu.
- **Pravidlo:** `chore:` / `docs:` commit â‰  skip review; diff po riadkoch vĹľdy. ZapĂ­sanĂ© aj v `.claude/anti-style.md`.
- **Guardian PROD:** code-truth #240 OK; predajnĂ˝ argument aĹľ pri 5/5 PROD smoke.

## [2026-06-22] - Blueprint Kit artefakt #5 RRA â€” v1 Medium

- **Rozhodnutie:** RRA extrahovanĂ˝ z produkÄŤnĂ©ho Revolis (5 vrstiev + 3 pravidlĂˇ toku).
- **Cesty:** `docs/blueprint-kit/Foundation/RRA-REFERENCE-ARCHITECTURE.md`, scoreboard #5 Medium.
- **Sync:** `C:\Revolis OS\Foundation\RRA-REFERENCE-ARCHITECTURE.md`.
---

## [2026-06-24] - AP-015 North Star r2â†’r4 â€” BUILD (docs)

- **Rozhodnutie:** North Star preformulovanĂ˝: Revolis = Knowledge Monopoly systĂ©m (Loops Revenue â†’ Learning â†’ Network â†’ Evolution), nie "AI pre realitky".
- **Dokument:** `docs/architecture/north-star-2027-2030.md` (r4).
- **Gate:** Genome Test â€” BUILD len ak 30-dĹovĂ© KPI zĂˇkaznĂ­ka A zapisuje do Loop 2.

## [2026-06-24] - AP-016 Genome entity prijatĂ© â€” BUILD (substrĂˇt)

- **Rozhodnutie:** `public.decisions` (Prediction Registry) + `public.exclusivity_outcomes` (Genome) akceptovanĂ© ako Loop 2 substrĂˇt.
- **Stav:** MigrĂˇcia idempotentnĂˇ v PROD (manuĂˇlne); rep migrĂˇcia vo Wave A briefe.
- **Pravidlo:** Predikcie z Loop 1 (Follow-up Agent) zapisujĂş do `decisions`; Ĺľiadne auto-odosielanie.

## [2026-06-24] - AP-017 Genome Factory rozdelenĂ˝ â€” BACKLOG / ÄŤiastoÄŤnĂ˝ smer

- **Rozhodnutie:** Genome Factory **auto-deploy** parked (`l99-parked-concepts.md`); manuĂˇlna polovica (human approval) povolenĂˇ aĹľ za Guardian 5/5 PROD.
- **VETO:** AutomatickĂ© nasadenie genĂłmu bez founder GO.

## [2026-06-24] - AP-018 ArchitektĂşra uzavretĂˇ â†’ pivot exekĂşcia â€” BUILD (proces)

- **Rozhodnutie:** DokumentĂˇcia architektĂşry (North Star r4, parked concepts) uzavretĂˇ na Ăşrovni smeru; ÄŹalĹˇie hodiny = Loop 1 exekĂşcia (Follow-up draft-only), nie novĂ© koncepty.
- **Overnight:** Brief 10 Wave B (tento commit); Wave A/C samostatnĂ© PR.
- **Merge:** Human GO; nie auto-merge (AP-012).

## [2026-07-19] - Valuation Widget â€” VALIDATE (+ Wave 0 route)

- **SignĂˇl:** Reality Smolko a AA Reality MolnĂˇr verbĂˇlne potvrdili zĂˇujem, ale bez potvrdenĂ©ho distribuÄŤnĂ©ho kanĂˇla, SLA a ochoty platiĹĄ.
- **DĂ´kaz dopytu (2026-07-19):** `realitysmolko.sk/ponuka-dopyt` uĹľ obsahuje poloĹľku "Ocenenie nehnuteÄľnosti" a vedie naĹ platenĂˇ Google Ads kampaĹ (gclid). Dopyt validovanĂ˝ klientom samĂ˝m; kanĂˇl ÄŤ. 1 = tĂˇto strĂˇnka. PredajnĂ˝ rĂˇmec: upgrade platenej kampane (okamĹľitĂ˝ vĂ˝sledok = vyĹˇĹˇia konverzia + leady do Revolis triage namiesto e-mailu), nasadenie vo fĂˇzach (paralelnĂ© tlaÄŤidlo â†’ nĂˇhrada formulĂˇra).
- **Webex bypass (2026-07-19):** Pilot FĂˇza 0 = Ads priamo na Revolis URL, bez Webexu. Seliga voliteÄľnĂ˝ aĹľ pre tlaÄŤidlo na webe. Stealth: Revolis neoslovuje Webex pred dĂ´kazom. Brief: `docs/briefs/validation-valuation-widget.md` Â§ Webex bypass stratĂ©gia.
- **Wave 0 route:** `/odhad/[agencySlug]` + `POST /api/valuation/submit` â†’ `leads` (`source=valuation_widget`). Pilot tenant: `reality-smolko`. Bez faloĹˇnĂ©ho cenovĂ©ho pĂˇsma (maklĂ©r kontaktuje s odhadom).
- **VETO na plnĂ˝ BUILD:** chĂ˝ba licencovanĂ˝, reprodukovateÄľnĂ˝ zdroj cenovĂ˝ch dĂˇt; LLM nesmie vytvĂˇraĹĄ trhovĂ© cenovĂ© pĂˇsmo bez neho.
- **GDPR gate:** pred pilotom Privacy Notice, prĂˇvny zĂˇklad a controller/processor roly potvrdiĹĄ s AKMV.
- **Brief:** `docs/briefs/validation-valuation-widget.md`
- **Odomknutie:** 14-dĹovĂ˝ pilotnĂ˝ kontrakt s konkrĂ©tnymi kanĂˇlmi, SLA, metrikami a data/GDPR brĂˇnou.
- **CenovĂˇ stratĂ©gia (2026-07-19, founder GO):** widget sa nespoplatĹuje samostatne â€” je sĂşÄŤasĹĄ balĂ­ka Revolis, monetizĂˇcia cez seaty. Klientovi sa cenovĂˇ otĂˇzka nekladie; cenovĂş hypotĂ©zu validuje podpis MolnĂˇra ako 2. platiaceho zĂˇkaznĂ­ka.

## [2026-07-17] - Outcome-first workdesk (Livappy psychology) â€” BUILD

- **Rozhodnutie:** ImplementovaĹĄ outcome messaging + 60s first audit + 1 dashboard CTA + short onboarding path. Nie novĂ˝ AI engine â€” orchestrĂˇcia existujĂşcich signĂˇlov (stale, triage, budgetĂ—3%).
- **Brief:** `docs/briefs/BO-outcome-first-workdesk.md`
- **KÄľĂşÄŤovĂ©:** `lib/copy/outcome-copy.ts`, `lib/workdesk/first-audit.ts`, `GET /api/workdesk/first-audit`, `FirstAuditPanel`, Start-today hero, onboarding `SHORT_PATH` + `step-audit`
- **AP-001:** OdstrĂˇnenĂ© fake KPI fallbacky (â‚¬124k / â‚¬18.4k), demo leady v hero, +34% claimy na landing/ROI (ROI = user scenario).
- **Verification:** `tests/verification/first-audit.verification.test.ts` (7/7)
- **Merge:** ÄŤakĂˇ founder GO na commit/PR

## [2026-07-06] - BO-001 Proof of Value Engine (/proof) â€” BUILD

- **Rozhodnutie:** VerejnĂˇ route `/proof` + `lib/proof` engine (extrakcia ROI z landing), `POST /api/proof` â†’ `saas_leads` (`source=proof`, answers v `note` JSON). Ĺ˝iadna migrĂˇcia (AP-019). Honest benchmark copy (AP-001).
- **Brief:** `docs/briefs/BO-001-proof-of-value.md`
- **PR / vetva:** #275 Â· `feat/bo-001-proof`
- **Reuse:** `createSaasLead`, `RoiCalculatorHero` leak model â†’ `lib/proof/engine`, `SLATE_HORIZON`, `LegalFooter`
- **Preview smoke:** `/proof` mobile, 6 krokov, lead v `saas_leads` so `source=proof`
- **Merge:** founder GO (2026-07-06) Â· merged #275 â†’ `main` Â· prod `https://app.revolis.ai/proof` 200, `/api/proof` verejnĂ˝ (400 na prĂˇzdny body)

## [2026-06-XX] - AP-019 Schema allowlist â€” BUILD (incident CEO Command)

- **Rozhodnutie:** KaĹľdĂˇ novĂˇ `public` tabuÄľka musĂ­ Ă­sĹĄ do `apps/crm/config/public-schema-allowlist.json` v tom istom PR ako migrĂˇcia (alebo pred prod apply). Inak Schema Guard mlÄŤĂ­ o drift (prĂ­pad CEO Command / `routine_notifications`).
- **Incident:** `routine_notifications` v repe, nie na PROD, mimo allowlistu â†’ `/api/ceo-command` 500, Guard ticho.
- **Fix:** allowlist + scoped fallback v PR; migrĂˇcia = samostatnĂ˝ prod apply (GO).

## [2026-07-27] - Guardian v1.1 â€” STALE 90d+7d + production allowlist â€” BUILD

- **Rozhodnutie:** STALE len ak existuje `lead_events` a poslednĂˇ aktivita je starĹˇia ako 7 dnĂ­ ale mladĹˇia ako 90 dnĂ­ (Ĺľiadny fallback na `created_at`). Production cron beĹľĂ­ len pre `GUARDIAN_AGENCY_ALLOWLIST` (unset/prĂˇzdne = Ĺľiadny tenant beh). `GUARDIAN_DIGEST_ENABLED` default false nezmenenĂ˝; baseline kill >50 z premortem zostĂˇva.
- **Prod audit (2026-07-27):** 473 open STALE â€” vĹˇetky neplatnĂ© pod v1.1 (Ĺľiadne lead_events); ostatnĂ© open: NO_OWNER 9, NO_PHONE 10, HOT_IGNORED 8.
- **SĂşbory:** `apps/crm/src/lib/guardian/{config,rules}.ts`, cron routes, `scripts/guardian-v11-cleanup-invalid-stale.sql`, brain `rme-dec-20260727-002`.
- **Founder GO:** potvrdiĹĄ agency UUID v allowlist env pred prod cron; voliteÄľnĂ˝ DELETE script po merge.

## [2026-07-28] - Operator Dashboard v1 â€” aggregate-first â€” BUILD (schema gate)

- **Rozhodnutie:** `/operator` len pre `profiles.is_platform_admin` + `OPERATOR_DASHBOARD_ENABLED` (default false); agency user / anonym **404**; v1 bez PII v agregĂˇtoch, bez drill-down/kampanĂ­; sandbox tenant vylĂşÄŤenĂ˝.
- **SchĂ©ma:** `20260728140000_profiles_platform_admin.sql` â€” founder po prod apply: `UPDATE profiles SET is_platform_admin = true WHERE email = 'â€¦'`.
- **Brain:** `build-package.operator-dashboard-v1`, `rme-dec-20260728-001`.

## [2026-08-02] - Engineering justification: Engineering Constitution â€” BUILD

- **Trigger:** new-governance-doc + cursor rule + brain registry wiring
- **Decision path:** extend-existing â€” Decision Memory + brain/registry (Ĺľiadny paralelnĂ˝ coding log)
- **Alternatives considered:** samostatnĂ˝ JSON log (zamietnutĂ© â€” duplicitnĂ˝ graf); CI-only gate bez memory (zamietnutĂ© â€” chĂ˝ba contradiction protocol)
- **Why not reuse:** ExistujĂşca Ăšstava = biznis brĂˇna; chĂ˝bala technickĂˇ vrstva Builder/Judge pre reuse a novĂ© abstrakcie
- **Expected outcome:** KaĹľdĂ˝ novĂ˝ sĂşbor/komponent/dep mĂˇ traceable justification v `memory/decisions.md`; Judge = KontrolĂłr; `npm run brain:ingest` projektuje kurĂˇtorovanĂ© zĂˇznamy
- **Related paths:** `docs/architecture/engineering-constitution.md`, `.cursor/rules/l99-engineering-constitution.mdc`, `brain/src/catalog.ts`, `rme-dec-20260802-001`
- **Contradiction check:** none â€” dopÄşĹa `engineering-os-revolis-rightsized.md` L3 ADR, nekonflikuje s Revolis Constitution v2
- **PR / vetva:** docs/engineering-constitution-decision-memory

## [2026-08-03] - Night Operations v0 (A1/A2/A3) â€” Strategic Bet Â· BUILD (founder GO option C)

- **KategĂłria:** Strategic Bet (klasifikĂˇcia v2) Â· timebox ~3 dni Â· promote / re-bet / kill
- **SSOT:** `docs/architecture/2026-08-03-night-operations.md` Â· Center: `docs/architecture/2026-08-03-night-operations-center.md`
- **Setup:** `docs/automations/2026-08-03-setup-karta.md`
- **Uzly dnes:** A1 Architecture Guardian Â· A2 StrĂˇĹľca vetiev Â· A3 RannĂ˝ brief (FĂˇza 1 read-only)
- **ZakĂˇzanĂ©:** portal scrape Â· auto-deploy Â· prod DELETE Â· CREDITS_ENFORCEMENT on Â· merge #356â€“#366 nie je sĂşÄŤasĹĄou tohto balĂ­ka
- **Review / kill dĂˇtum:** **2026-09-08** (ADR + 30d metriky); prvĂˇ kill kontrola **2026-08-08**

### ADR-001 â€” OrchestrĂˇtor aĹľ pri piatom uzle
Piaty uzol = orchestrĂˇtor. Do Ĺˇtyroch sa reporty ÄŤĂ­tajĂş jednotlivo. RannĂ˝ brief je reportovacia vrstva, nie ĹˇtvrtĂ˝ "feature" uzol.

### ADR-002 â€” VstupnĂˇ brĂˇna
KaĹľdĂ˝ uzol mĂˇ vstupnĂş brĂˇnu. Uzol bez brĂˇny sa nestavia.

### ADR-003 â€” Vrstva 4: navrhovaĹĄ, nestavaĹĄ
Vrstva 4 smie navrhovaĹĄ, prioritizovaĹĄ, odhadovaĹĄ nĂˇvratnosĹĄ a pripraviĹĄ PR. Nikdy commit, merge ani deploy bez ÄŤloveka.

### ADR-004 â€” DvojitĂ© odĂ´vodnenie (vĂ˝chodisko, nie zĂˇkon)
NovĂ˝ uzol vyĹľaduje technickĂ© **aj** obchodnĂ© odĂ´vodnenie. Ani jedno samo nestaÄŤĂ­. PredvolenĂ© prahy (4. uzol: +10 oslovenĂ˝ch; orchestrĂˇtor: 3. platiaci; Center: 5 platiacich) sĂş **vĂ˝chodisko**; odchĂ˝lka je povolenĂˇ so zapĂ­sanĂ˝m dĂ´vodom a dĂˇtumom revĂ­zie v tomto sĂşbore. NeuznanĂ˝ dĂ´vod: "bolo by to zaujĂ­mavĂ© postaviĹĄ."

### ADR-005 â€” Ĺ˝ivotnĂ˝ cyklus uzla
NĂVRH â†’ BEĹ˝ĂŤ â†’ VYHODNOTENIE (30/90 dnĂ­) â†’ PONECHAĹ¤ | ZLĂšÄŚIĹ¤ | VYPNĂšĹ¤. VypnutĂ˝ uzol sa **nemaĹľe** â€” zostĂˇva v repe s dĂˇtumom a dĂ´vodom. SpĂşĹˇĹĄaÄŤe vypnutia: 30 dnĂ­ bez verdiktu v `docs/audit/nodes-value.jsonl` Â· 30 dnĂ­ bez akcie Â· trvalo ÄŤervenĂ˝ 14 dnĂ­ Â· nahradenĂ˝ Â· prah splnenĂ˝ natrvalo.

### Kill kritĂ©rium
Ak 2026-08-08 nebude founder vedieĹĄ povedaĹĄ, Ĺľe reporty ÄŤĂ­tal pĂ¤ĹĄ rĂˇn po sebe, vypnĂşĹĄ vĹˇetky tri a nestavaĹĄ ĹˇtvrtĂ˝.

- **Verdikt schema:** `verdict â { konal | vedel | zbytoÄŤnĂ© }` â€” append do `docs/audit/nodes-value.jsonl`
- **PR / vetva:** docs/night-ops-2026-08-03

## [2026-08-06] â€” Listing generator prompt: K1 GO â€ş K2+K3 STOP
- **Rozhodnutie:** Founder schvĂˇlil K1 (metĂłda 10 technĂ­k + vetvy). DodanĂ© K2 draft systĂ©movĂ©ho promptu + K3 eval (6 JSON). **STOP pred K4.**
- **SĂşbory:** `docs/sales/listing-generator-system-prompt-DRAFT.md`, `docs/sales/listing-generator-K3-eval.md`
- **Sabinov zdroj:** Word `PODKLADY K INZERCII REALITY SMOLKO.docx` (md demo v repo chĂ˝ba).
- **ÄŽalej:** founder GO â€ş K4 oponenti (O1â€“O6 z metapromptu).

---

## D-2026-08-06-01 â€” Nasadzuje sa celĂ˝ backlog, nie zĂşĹľenĂ˝ augustovĂ˝ rozsah

**NAHRĂDZA:** D-2026-08-05-01, D-2026-08-05-02, D-2026-08-05-04, D-2026-08-05-06

### Rozhodnutie

RuĹˇĂ­ sa zĂşĹľenie augustovĂ©ho rozsahu. Nasadzuje sa **celĂ˝ otvorenĂ˝ backlog**
(poloĹľky A1â€“F6 podÄľa `REV-DEPLOY-PROGRAM-001.md`): produkt, dĂˇtovĂˇ vrstva,
Memory Engine, Engineering OS moduly, L4 Governance, L5 Evolution a prevĂˇdzkovĂ©
opravy. Odklad governance a infraĹˇtruktĂşry do 1.9.2026 sa ruĹˇĂ­. Zmrazenie
implementĂˇcie L4/L5 sa ruĹˇĂ­ â€” moduly prechĂˇdzajĂş z evidovanĂ˝ch do
implementovanĂ˝ch podÄľa vlnovĂ©ho plĂˇnu.

### DÄ‚Â´vod (argument foundera)

Onboarding zĂˇkaznĂ­kov aj vĂ˝voj robĂ­ jeden ÄŤlovek. Keby uprednostnil onboarding,
nemal by ÄŤo predĂˇvaĹĄ. Produkt nie je dotiahnutĂ˝ a chĂ˝ba mu zdroj leadov â€”
Smolkova kampaĹ zatiaÄľ nepriniesla novĂ˝ch klientov. Tretie nezĂˇvislĂ© potvrdenie
trhu (MolnĂˇr 7/2026, SuchĂ˝ 5.8.2026, pitch ARCHEUS) hovorĂ­, Ĺľe kancelĂˇrie
odmietajĂş ponuky AI/CRM, lebo nikto im nedodĂˇ klientov, ktorĂ­ chcĂş predaĹĄ.
Fokus na jednu vec predpokladĂˇ istotu, na ÄŤo sa sĂşstrediĹĄ; tĂş Revolis zatiaÄľ
nemĂˇ. Preto sa stavia do ĹˇĂ­rky, kĂ˝m sa zdroj leadov nevyrieĹˇi.

### VyÄŤĂ­slenĂˇ cena rozhodnutia

Rozpad backlogu: **118 PR v 15 vlnĂˇch.** PoctivĂ˝ odhad pri jednom ÄŤloveku
s AI nĂˇstrojmi popri obchode: **5â€“6 mesiacov, dokonÄŤenie koniec januĂˇra 2027.**
PrvĂ˝ blok (rozpĂ¤tie vo widgete, oprava CI brain indexov, kalibrĂˇcia, vyprĂˇzdnenie
fronty PR) je hotovÄ‚Ëť do polovice augusta.

### ZĂˇvĂ¤znĂ© podmienky pred spustenĂ­m

QA brĂˇna programu **nepreĹˇla** (15 poruĹˇenĂ­). NasledujĂşce podmienky platia
bez ohÄľadu na rozsah a nie sĂş predmetom vyjednĂˇvania:

1. **Krok 0 pred akĂ˝mkoÄľvek paralelizmom.** DĂ´kazy neprekrytia sa prepoÄŤĂ­tajĂş
   proti skutoÄŤnĂ˝m cestĂˇm overenĂ˝m inventarizaÄŤnĂ˝m behom v repe, nie proti
   odhadom. Bez toho ÄąÄľiadny noĂ„Ĺ¤nÄ‚Ëť swarm.
2. **W1 a W3 sa neaktivujĂş**, kĂ˝m nie je ÄŤierne na bielom doloĹľenĂ©, komu pĂ­Ĺˇu.
   PrÄ‚Â­tomnosÄąÄ„ opt-out kontaktu (`mihalrado`, Simi Real) naznaĂ„Ĺ¤uje, ÄąÄľe oslovujÄ‚Ĺź
   prospektov â€” ÄŤo je absolĂştny zĂˇkaz zo ZAKĂZANĂťCH AKCIĂŤ. Denylist nie je sĂşhlas.
3. **Ĺ˝iadny zber identifikĂˇtorov nĂˇvĹˇtevnĂ­kov widgetu** (`visitor_hash`,
   cookies, fingerprint) pred rozhodnutĂ­m prevĂˇdzkovateÄľ vs. sprostredkovateÄľ,
   pred zverejnenou privacy policy a pred consent mechanizmom. Riziko nesie
   platiaci zĂˇkaznĂ­k, nie Revolis.
4. **MestskĂ© kotvy kalibrĂˇcie s `productUse: false`** (barometer Realitnej Ăşnie)
   sa nesmĂş dostaĹĄ do produkÄŤnĂ©ho vĂ˝poÄŤtu bez pĂ­somnĂ©ho povolenia Ăşnie.
5. **MigrĂˇcia a kĂłd, ktorĂ˝ ju pouĹľĂ­va, nikdy v jednom PR** (Ăšstava ÄŚl. 7,
   incident 22.07).
6. **NoÄŤnĂ˝ beh sa nikdy nedotkne** PROD dĂˇt, platieb ani widgetu platiaceho
   zĂˇkaznĂ­ka.

### Kill kritĂ©riĂˇ (Strategic Bet podÄľa klasifikĂˇcie v2)

Program sa zastavĂ­ a vyhodnotĂ­ (promote / re-bet / kill), ak nastane ktorĂ©koÄľvek:

- PrvĂ˝ blok (rozpĂ¤tie, CI brain fix, kalibrĂˇcia, vyprĂˇzdnenie fronty PR) nie je
  hotovĂ˝ do **20.8.2026** â€” znamenĂˇ to, Ĺľe odhad je fikcia a plĂˇn treba prepoÄŤĂ­taĹĄ.
- KtorĂ˝koÄľvek incident na zĂˇkaznĂ­ckych dĂˇtach spĂ´sobenĂ˝ nasadzovanĂ­m.
- ObchodnĂˇ aktivita klesne pod **1 obchodnĂş akciu denne** poÄŤas dvoch po sebe
  idĂşcich tĂ˝ĹľdĹov.
- Do **1.9.2026** nie je uzavretĂˇ kalibrĂˇcia so zelenĂ˝m golden setom
  (D-2026-08-05-03 zostĂˇva nadradenĂ© v rĂˇmci produktovej lĂ­nie).

### Poradie hodnoty v rĂˇmci ĹˇirokĂ©ho rozsahu

VzhÄľadom na trhovĂ˝ signĂˇl z troch nezĂˇvislĂ˝ch zdrojov majĂş v rĂˇmci backlogu
prednosĹĄ poloĹľky vedĂşce k **dodaniu predĂˇvajĂşcich** (widget, kalibrĂˇcia,
valuation_estimates, intent signĂˇly, zdroj leadov) pred poloĹľkami, ktorĂ©
vylepĹˇujĂş CRM. Nie je to Ĺˇkrtanie rozsahu â€” je to poradie vnĂştri neho.

### Reverzibilita

ZvratnĂ© s nĂˇkladom. Rozhodnutie sa dĂˇ kedykoÄľvek zĂşĹľiĹĄ spĂ¤ĹĄ; uĹľ zmergovanĂ© PR
vĹˇak zostanĂş a ich ĂşdrĹľba tieĹľ.

### NĂˇsledky pre ostatnĂ© dokumenty

- `docs/sales/realizacny-zoznam-do-11-8.md` â€” sekcia "OdloĹľenĂ© do 1.9."
  prestĂˇva platiĹĄ. Zoznam dennĂ˝ch obchodnĂ˝ch priorĂ­t do 11.8. zostĂˇva.
- `docs/architecture/engineering-os/README.md` â€” poznĂˇmka âť„ď¸Ź FREEZE sa ruĹˇĂ­;
  moduly graph-engineering a hybrid-retrieval prechĂˇdzajĂş z Approved (impl.
  Deferred) na Approved (impl. plĂˇnovanĂˇ, vlna podÄľa programu).
- `CONSTITUTION.md` â€” ratifikĂˇcia textu vo v1.1 zostĂˇva; obmedzenie
  "bez implementĂˇcie vynucovania do 1.9." sa ruĹˇĂ­, Constitution Engine je
  sĂşÄŤasĹĄou programu.


---

## D-2026-08-06-02 â€” ADR Memory Engine: re-bet kill kritĂ©riĂ­

**TĂ˝ka sa:** `docs/architecture/adr-2026-07-28-memory-engine.md`, sekcia Â§5 Kill kritĂ©riĂˇ

### Rozhodnutie

Kill kritĂ©rium *"PR-1..PR-4 nie sĂş zmergovanĂ© do 6.8.2026"* **vyprĹˇalo dnes
a nahrĂˇdza sa.** Bet sa nezabĂ­ja, prehodnocuje sa.

### DÄ‚Â´vod

KritĂ©rium bolo stanovenĂ© 28.7.2026 â€” pred objavenĂ­m chyby valuaÄŤnej kalkulaÄŤky
(+40 %, poĹˇkodzuje znaÄŤku platiaceho zĂˇkaznĂ­ka), pred dvojdĹovou migrĂˇciou n8n
na vlastnĂ˝ VPS a pred rozhodnutĂ­m D-2026-08-06-01 o rozĹˇĂ­renĂ­ augustovĂ©ho rozsahu.
Meralo teda dodrĹľanie plĂˇnu, ktorĂ˝ bol medzitĂ˝m vedome nahradenĂ˝.

ZĂˇroveĹ bolo zle postavenĂ©: dĂˇtum meria, ÄŤi sa stihlo commitnĂşĹĄ, nie to,
ÄŤi mĂˇ bet zmysel. BlokĂˇtor B7 (`SYSTEM_USAGE_AGENCY_ID`) sa medzitĂ˝m ukĂˇzal
ako **uĹľ vyrieĹˇenĂ˝** (migrĂˇcia `20260731220000_system_usage_agency.sql` vrĂˇtane
guardu proti Smolkovmu UUID), takĹľe PR-1 nie je blokovanĂ© niÄŤĂ­m.

### NovĂ© kill kritĂ©riĂˇ

1. **PR-1 (migrĂˇcia `memory_events`, `memory_facts`, `entity_edges` + RLS +
   indexy) zmergovanĂ˝ do 8.8.2026.** Je aditĂ­vny, bez produkÄŤnĂ©ho rizika,
   nedotĂ˝ka sa existujĂşceho kĂłdu. Ak sa nestihne ani on, bet sa zabĂ­ja
   bez ÄŹalĹˇej diskusie.

2. **PR-2 aĹľ PR-4 zmergovanĂ© do 10 pracovnĂ˝ch dnĂ­ od zelenĂ©ho golden setu
   kalibrĂˇcie.** InfraĹˇtruktĂşra ide za produktom, nie pred nĂ­m.

3. â­ **PouĹľitie namiesto termĂ­nu â€” nadradenĂ© kritĂ©riĂˇm 1 a 2:**
   ak 30 dnÄ‚Â­ po nasadenÄ‚Â­ PR-3 (outbox) obsahuje tabuĂ„Äľka `memory_events`
   menej neĹľ **100 zĂˇznamov**, bet sa zabĂ­ja. Znamenalo by to, Ĺľe do pamĂ¤te
   niĂ„Ĺ¤ neteĂ„Ĺ¤ie a postavili sme sklad bez tovaru.

**PoznĂˇmka k hierarchii:** termĂ­ny merajĂş disciplĂ­nu, pouĹľitie meria zmysel.
Ak sa termĂ­ny nestihnĂş, ale dĂˇta teÄŤĂş, bet Ĺľije. Ak sa termĂ­ny stihnĂş a dĂˇta
neteÄŤĂş, bet je mĹ•tvy bez ohÄľadu na to, koÄľko kĂłdu vzniklo.

### Reverzibilita

Ä˝ahko zvratnĂ© â€” kritĂ©riĂˇ sa dajĂş kedykoÄľvek prepĂ­saĹĄ ÄŹalĹˇĂ­m amendmentom
podĂ„Äľa CONSTITUTION.md Ă„Ĺšl. 8.

### Ä‚ĹˇdrÄąÄľbovÄ‚Ëť krok

V `docs/architecture/adr-2026-07-28-memory-engine.md`, Â§5 Kill kritĂ©riĂˇ,
doplĹ k pĂ´vodnĂ©mu bodu *"PR-1..PR-4 nie sĂş zmergovanĂ© do 6.8."* riadok:

> **STAV: NAHRADENĂ‰ rozhodnutĂ­m D-2026-08-06-02 (2026-08-06).**

PÄ‚Â´vodnÄ‚Ëť text nemaÄąÄľ.

## [2026-08-07] â€” Listing generator K4 REDO: STOP pred K5 (eskalĂˇcie)
- **Rozhodnutie:** Founder GO K4. OponentskĂ˝ kolotoÄŤ (oficiĂˇlna tabuÄľka O1â€“O6 z `metaprompta3generator.md`) â€” 3 kolĂˇ. O2/O3 bez BLOKUJE po regenerĂˇcii. **K4 STOP** â€” ÄŤakĂˇ E1 (soft municipal character) + E2 (dÄşĹľka mainText 150â€“280 vs UI 250â€“400).
- **SĂşbory:** `docs/sales/listing-generator-system-prompt-K4.md` (kandidĂˇt), `docs/sales/listing-generator-K4-review.md`, K3-eval regenerovanĂ©; DRAFT = superseded.
- **ÄŽalej:** founder rozhodne E1+E2 â†’ GO K5.


## [2026-08-07] â€” Listing generator K5: E1/E2 CLOSED + FINAL
- **E1 (FOUNDER):** Veto O2 platĂ­. CharakterizĂˇcia lokality vĂ˝hradne z `charakterLokality` (enum + voÄľnĂ˝ text, voliteÄľnĂ©). Bez vstupu = Ĺľiadna veta o povahe lokality. UI pole â†’ recommendation v `inzerat-generator-tab.md`.
- **E2 (FOUNDER):** mainText 220â€“320 slov, cieÄľ ~270 (golden 296/275/240/254). JedinĂ˝ zdroj pravdy = systĂ©movĂ˝ prompt; UI brief odkazuje na FINAL.
- **BUILD:** `docs/sales/listing-generator-system-prompt-FINAL.md` + `docs/sales/listing-generator-K5-handoff.md`. K4 = superseded medzikrok. Status **K5 HOTOVĂ‰**.
- **OstĂˇva:** UI implementĂˇcia `charakterLokality` + wire FINAL do generateListingContent (mimo K5).

## [2026-08-07] â€” Listing generator C4: schema = ListingContent (CLOSED)
- **C4 (FOUNDER, vykonaĹĄ TERAZ):** FINAL prompt emituje produkÄŤnĂ© kÄľĂşÄŤe `ListingContent` â€” Ĺľiadny mapper. `mainText`â€ş`portal_text`; `socialText`â€ş`fb_ad_copy`+`ig_caption`; optionals: `titles?`, `missingData?`, `recommendations?`, `techniquesUsed?`.
- **BUILD:** typ rozĹˇĂ­renĂ˝ aditĂ­vne; K3 T1â€“T6 regenerovanĂ©; vitest 6/6 PASS (`listing-content-c4-schema.verification.test.ts`).
- **NEROBIĹ¤:** PR-A (wire FINAL do `generateListingContent`) â€” ÄŤakĂˇ GO + C2.
- **SĂşbory:** FINAL, K5-handoff, K3-eval, inzerat-generator-tab, `listing-content.ts`.

## [2026-08-07] â€” Listing generator: founder (b) stress feedback (nie C2 close)
- **Fakt:** Founder oznaÄŤil `fb_ad_copy` lead z K3 Test 5 (PreĹˇov 72 m2, prĂˇzdny popis) ako "pĂ­sal ÄŤlovek".
- **Pravda:** text = FINAL stress (nie golden / ÄŤlovek). InterpretĂˇcia: prompt oklamal foundera na riedkom vstupe â€ş pozitĂ­vny stress/C3 signĂˇl.
- **Nie:** C2 verdikt Teriakovce/Ä˝ubotice; (b) C2 pĂˇry neuzatvĂˇra. PR-A stĂˇle ÄŤakĂˇ C2 protokol + GO.
- **SĂşbory:** `docs/sales/listing-generator-C2-notes.md`, K3-eval Test 5, K5-handoff Â§5b.

## [2026-08-07] â€” Listing generator PR-A: FINAL prompt wire (GO)
- **GO (FOUNDER):** po C2 PASS + C4 CLOSED â€” wire FINAL do generateListingContent / SYSTEM_PROMPT.
- **BUILD:** listing-content-system-prompt.ts (FINAL inline const); optionals na ListingContent; C4 fixtures + prompt-wire verification; docs listing-generator-* â€ş docs/prompts/ (smolko golden ostĂˇva v docs/sales/).
- **Mimo scope:** PR-B UI charakterLokality; mapper Ĺľiadny.
- **Rollback:** revert PR.
- **Merge:** founder pri klĂˇvesnici (agent NEmerguje).

---

## D-2026-08-09-01 â€” Acquisition OS v2.2: GO na Stage 0

**Rozhodnutie:** Blueprint `acquisition-os-v2.2-final-locked.md` sa zamykĂˇ
a implementuje sa VĂťHRADNE Stage 0 (read-only sync z Google Test MCC,
tenant izolĂˇcia, audit). Stage 1+ vyĹľaduje samostatnĂ© GO po Stage 0 PASS
checkliste s dĂ´kazmi.

**Hranice (neprerokovateÄľnĂ© v Stage 0):** Ĺľiadne reĂˇlne peniaze, Ĺľiadne
mutĂˇcie kampanĂ­/budgetov, Ĺľiadne conversion uploady, Ĺľiadny LLM, Ĺľiadna
Meta/Microsoft, webhook spracĂşva iba is_test.

**VzĹĄah k Memory Engine ADR:** `acquisition_events` je domĂ©novĂ˝ ledger
udalostĂ­ externĂ˝ch providerov (Google Ads), `memory_events` je CRM outbox.
Nie je to duplicitnĂ˝ event store â€” hranica: ÄŤo sa stalo U PROVIDERA vs.
ÄŤo sa stalo V CRM. Ak Stage 1 ukĂˇĹľe prekryv, rieĹˇi sa amendmentom ADR,
nie ad-hoc v kĂłde.

**Reverzibilita:** Stage 0 je ÄŤisto aditĂ­vny (novĂ© tabuÄľky, novĂ© routes),
rollback = revert PR bez dopadu na existujĂşci produkt.

**Kill kritĂ©rium Stage 0:** ak do 14 pracovnĂ˝ch dnĂ­ od PR-S0.1 neprejde
kompletnĂ˝ PASS checklist s dĂ´kazmi, Stage 0 sa zastavuje a reviduje sa
rozsah â€” nie blueprint, ale tempo (founder je sĂˇm na vĹˇetko).

---

## D-2026-08-10-01 â€” Memory Engine: kill kritĂ©rium vykonanĂ©

**Rozhodnutie:** Bet Memory Engine sa zabĂ­ja podÄľa D-2026-08-06-02 bod 1.
OverenĂ© 10.8.2026 na origin/main: Ĺľiadna memory_engine migrĂˇcia neexistuje
(93 migrĂˇciĂ­, HEAD c32e841 = PR #377). PR-1 nebol zmergovanĂ˝ do 8.8.
Founder potvrdil kill 10.8.2026.

**ÄŚo to znamenĂˇ:** ADR `adr-2026-07-28-memory-engine.md` zostĂˇva v repe
(do Â§5 doplnenĂ˝ stav BET KILLED), zadania PR-1..PR-4 idĂş do zĂˇsobnĂ­ka
bez termĂ­nu. NiÄŤ sa nemaĹľe â€” zabĂ­ja sa zĂˇvĂ¤zok, nie dokumentĂˇcia.

**PreÄŤo je to sprĂˇvne:** memory_events prehral sĂşboj o founderov ÄŤas
tri tĂ˝Ĺľdne po sebe â€” vĹľdy s prĂˇcou, ktorĂˇ mala ĹĄahajĂşceho zĂˇkaznĂ­ka
(valuaÄŤnĂˇ kalkulaÄŤka, A3 generĂˇtor, Acquisition OS). Infra bez
spotrebiteÄľa dĂˇt sa nestavia na disciplĂ­nu, stavia sa na dopyt.

**Podmienka znovuotvorenia (jedinĂˇ):** existuje konkrĂ©tna feature so
zĂˇkaznĂ­kom, ktorĂˇ potrebuje ÄŤĂ­taĹĄ memory_facts / memory_events.
Vtedy novĂ˝ bet s novou premisou a novĂ˝m amendmentom ADR â€”
nie oĹľivenie starĂ©ho termĂ­nu.

**PoznĂˇmka:** acquisition_events zo Stage 0 nie je nĂˇhrada memory_events
(hranica: D-2026-08-09-01). VznikĂˇ preto, lebo ho Stage 0 reĂˇlne
potrebuje â€” presne ten dĂ´kaz dopytu, ktorĂ˝ memory_events nemal.

---

## D-2026-08-14-01 â€” L99 Lead Factory Initiative: VALIDATE + FĂˇza 1 hranica

**KategĂłria:** Strategic Bet Â· **Verdikt Ăšstavy:** VALIDATE
(otĂˇzka 1 pre plnĂş tovĂˇreĹ = nie â†’ strop VALIDATE; otĂˇzka 8 pre ML/personalizĂˇciu
= prĂ­liĹˇ skoro â†’ Strategic Backlog)

**Brief:** `docs/briefs/l99-lead-factory-initiative.md`
**Premortem:** `docs/premortems/2026-08-14-l99-lead-factory.md`
**PR / vetva:** `cursor/l99-lead-factory-brief-1782` (draft; merge = founder GO)

### Hranica (FOUNDER GO 2026-08-14)

FĂˇza 1 vĂ˝hradne verejnĂ© / first-party zdroje. External lead providers a nĂˇkup
databĂˇz = zamknutĂˇ prĂˇvna brĂˇna, default OFF. Odomknutie len po podpĂ­sanom
balancing teste (ÄŤl. 6(1)(f)) + DPA.

**Segment:** B2C predĂˇvajĂşci = zdroj leadu; B2B RK = platiaci klient; maklĂ©r
spotrebĂşva lead.

**Jurisdikcia:** SR vo FĂˇze 1. CZ/EĂš zdroje teraz nerieĹˇiĹĄ. Priestor v modeli:
reuse `public.agencies.country` (default `'Slovensko'`), nie novĂ˝ hardcoded SK
predpoklad v GDPR logike.

**Open dependency (nie blocker draftu):** zmluva ĂšGKK (Zhluk 3) a partnerstvĂˇ
s portĂˇlmi (Zhluk 5) â€” zatiaÄľ neznĂˇme.

### ÄŚo sa NEstavia

Lead Factory Council (desiatky tĂ­mov), tisĂ­ce strĂˇn knowledge base, ML,
AI personalizĂˇcia, CRM Intelligence, Experimentation â€” data-blocked (Zhluk 1).
Acquisition OS (D-2026-08-09-01) ostĂˇva oddelenĂ˝ bet (Google Ads sync, nie B2C leady).

### PrvĂ˝ deliverable

DefinĂ­cia â€žpredhriaty leadâ€ś (C0 zachytenĂ˝ / C1 predhriaty / C2 kvalifikovanĂ˝
rozhovor) je **nĂˇvrh v briefe Â§2**, nie predpoklad. ÄŽalĹˇĂ­ kĂłd (meranie na
existujĂşcom valuation widgete) aĹľ po founder GO na tĂşto definĂ­ciu.

### Engineering justification (novĂ© sĂşbory)

- **Trigger:** new-docs â€” Strategic Bet brief + premortem (workflow.mdc povinnĂ© pred commitom programu)
- **Decision path:** reuse â€” mapuje existujĂşce povrchy (`/odhad`, `lead_consents`, AP-011, KontrolĂłr) namiesto novĂ©ho acquisition stacku
- **Alternatives considered:** (a) stavaĹĄ tovĂˇreĹ/councily hneÄŹ â€” zamietnutĂ©, Feature Trap + timing veto; (b) len Slack/chat zĂˇznam bez artefaktu â€” zamietnutĂ©, KontrolĂłr bod 10; (c) implementovaĹĄ C1 meranie v tomto PR â€” zamietnutĂ©, definĂ­cia eĹˇte nemĂˇ GO
- **Why not reuse only a chat:** program potrebuje kanonickĂ˝ brief + premortem v repe, inak ÄŹalĹˇĂ­ agent znova vymyslĂ­ scope
- **Contradiction check:** none â€” dopÄşĹa D-2026-08-06-01 (priorita dodania predĂˇvajĂşcich); nezamieĹa Acquisition OS Stage 0; nezapĂ­na stealth (AP-011)
- **Expected outcome:** Founder prijme/upravĂ­ Â§2; aĹľ potom samostatnĂ˝ meracĂ­ BO. C1 sa nerenderuje ako live % bez timestampu kontaktu (AP-001)
- **Related paths:** `docs/briefs/l99-lead-factory-initiative.md`, `docs/premortems/2026-08-14-l99-lead-factory.md`

### Kill / stop

- 3 first-party C0 bez pokusu o kontakt >24 h â†’ PAUZA Ads na widget (aĹľ keÄŹ kampaĹ beĹľĂ­)
- AkĂ˝koÄľvek dashboard % â€žpredhriatychâ€ś bez dĂ´kazu kontaktu â†’ STOP merge
- External ingest mimo allowlistu FĂˇzy 1 â†’ revert + legal
- Review dĂˇtum: **2026-09-14**


## D-2026-08-17-01 â€” Tri drobnĂ© rozhodnutia z auditov
1. Decisions dedup: Variant A â€” brain/decisions/decisions.md sa maĹľe,
   zdroj pravdy je memory/decisions.md, index.json zostĂˇva generovanĂ˝ pohÄľad.
2. 2026_genome_layer2.sql: RENAME na ÄŤasovanĂ˝ nĂˇzov + migration-history
   repair pod explicitnĂ˝m GO (podÄľa genome-layer2-audit).
3. Amendment k D-2026-08-13-01: CORE 4 pluginy (Supabase, Vercel, GitHub,
   Browser) preĹˇli T11 brĂˇnou â€” kaĹľdĂ˝ mal ÄŤakajĂşcu Ăşlohu. OstatnĂ© JIT.

## D-2026-08-17-02 â€” STF #393â€“397: retroaktĂ­vne GO
STF P0 lane som zmergoval ja (founder) bez predchĂˇdzajĂşceho D-zĂˇpisu.
GO sa dopÄşĹa retroaktĂ­vne. Rozsah STF a kill kritĂ©rium doplnĂ­m
samostatnĂ˝m zĂˇpisom do 7 dnĂ­ â€” dovtedy pre ÄŹalĹˇie STF PR platĂ­ G0 STOP.

## D-2026-08-15-01 â€” Stage 0 PASS zastaveny (perfgate)

**Datum:** 2026-08-15
**GO:** founder docs+evidence. T2 dodany: ~2 min. **STOP â€” nerealizuje sa ako PASS.**

Funkcny sandbox DoD (connect, webhook is_test, produktovy search po #413, production `/acquisition` obsah) **drzi**.

Perfgate **FAIL:** T1 ~2 min, T2 ~2 min. Nie jednorazovy cold start.

Supabase (T2 19:06-19:08 UTC): desiatky `profiles` lookupov + `properties?limit=500` + `leads?select=*&limit=500` z dashboard layout/workdesk shellu. `acquisition_*` SELECT-y az o ~2 min neskor, potom HTTP 200 <2 s. Pomalost nie je GAQL ani dashboard query.

Oprava layout/N+1/500-row hydrate = samostatny PR, vlastne GO. Tento D-zapis nie je Stage 0 PASS. Nie je to Stage 1.

**Kill deadline Stage 0:** 2026-08-31.

## D-2026-08-15-02 â€” customer-facing performance bug (workdesk layout)

**Datum:** 2026-08-15
**GO:** founder, samostatny perf PR. Merge = founder.

T2 `/acquisition` ~2 min nie je unikĂˇt tej stranky. Rovnaky `(dashboard)/layout.tsx` obaluje `/dashboard` a `/leads`. Vercel v T2 okne ukazuje `GET /leads` este pocas cakania na `/acquisition`; sidebar prefetch tahal `properties?limit=500` a `leads?select=*&limit=500`. Session 18:06 UTC: ~68 s `getUser` bez page-query.

**Klasifikacia:** customer-facing performance bug. Constitution: retencia (pomalĂ˝ workdesk), BUILD, maly PR.

Fix: request-scoped profile memo + `prefetch={false}` na nav Linkoch. Ziadna zmena RLS / auth rozhodnutia / zobrazovanych dat na `/dashboard` a `/leads` (tie stranky data stale tahaju same).

Stage 0 PASS sa nevyhlasuje. Nie je to Stage 1.

## D-2026-08-15-03 â€” Stage 0 PASS

**Datum:** 2026-08-15
**GO:** founder, docs-only addendum. Merge tohto PR = founder.

Acquisition OS Stage 0 (sandbox: Test MCC `7024414113`, Demo agency) je **PASS**.

Dokaz:
1. Funkcny DoD z #414/#415 (connect, webhook is_test, produktovy search, production `/acquisition` screenshoty).
2. Perfgate po #416 (production, founder): `/acquisition` 4 s / 4 s, `/dashboard` 6 s / 6 s, `/leads` 4 s / 5 s. Baseline pred fixom ~2 min. Skorsie T1 ~3 min = meranie pocas deploy okna (artefakt).
3. Reporty: `docs/architecture/acquisition-os-stage0-PASS-report.md`, `docs/reports/2026-08-15-workdesk-layout-perf.md`.

#400 `chore/stage0-smoke` zatvorene **bez merge**. Vetva zmazana. Supabase Preview env na tu vetvu sa **neprescopovava**: ziadny Supabase branch; Vercel unscoped Preview uz ma `SUPABASE_URL` + anon/publishable. Branch-scoped `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` ostavaju orphan na zmazanej vetve â€” kopirovat service role na vsetky Preview by rozsirilo secret.

**Nie je to Stage 1.** Ziadny realny RK, serving, conversion upload, navrat webhook kluca do Production.

**Kill deadline Stage 0:** 2026-08-31 (funkcia uzavreta; dalsi kod = vlastne GO).

## D-2026-08-15-04 â€” Fix profile email ILIKE wildcard auth takeover

**Datum:** 2026-08-15
**BUILD:** critical auth guard (PR on `cursor/critical-bug-management-2148`).

`findProfileByEmailCandidates` used `.ilike("email", login)` so `_`/`%` were SQL wildcards (`in_o@` â†’ `info@`). Combined with service-role resolve + `/api/leads/inventory` service fallback â†’ account takeover / cross-tenant lead dump.

Fix: exact `.eq` when candidate contains `_`/`%`; keep `ilike` only for safe patterns. Report: `docs/reports/2026-08-15-critical-email-ilike-auth.md`.

## [2026-08-21] â€” Billing wipe fixes: implement without waiting on impact count

- **Rozhodnutie:** GO na dva samostatnĂ© fix PR z dneĹˇnĂ©ho mainu (#451 legacy unknownâ‰ free; credits-expire guard). PoÄŤet zasiahnutĂ˝ch zĂˇkaznĂ­kov nerozhoduje o tom, ÄŤi opraviĹĄ â€” len o remediĂˇcii.
- **PreÄŤo:** Bug potvrdenĂ˝ v kĂłde na main; kaĹľdĂ˝ deĹ ÄŤakania = ÄŹalĹˇĂ­ deĹ rizika free-tier wipe / credit wipe.
- **DĂ´sledok:** Impact SQL A1/B2 beĹľĂ­ sĂşbeĹľne (read-only). A1: 1 riadok sandbox-looking UUID; B2: 0 riadkov. RemediĂˇcia aĹľ po overenĂ­ reĂˇlneho klienta.
- **Proces:** Open PR â‰  hotovĂˇ prĂˇca (DMARC ~7d, billing ~15d). RannĂ˝ report mĂˇ obsahovaĹĄ vek najstarĹˇieho otvorenĂ©ho PR.

## D-2026-08-18-01 â€” Ruflo Model Collaboration Bridge Phase 0 (VALIDATE)

**Founder GO:** explicitnĂ© GO 2026-08-18 iba na Phase 0. Ĺ˝iadny PR, merge,
deploy, DB/env mutation ani produkÄŤnĂ˝/external write.

**Rozhodnutie:** Composio nie je model-to-model transport. Phase 0 pouĹľĂ­va
Ruflo-invokable lokĂˇlny harness a natĂ­vny Anthropic Messages API adapter;
Ruflo vlastnĂ­ policy/state, Opus je governance rola a vĹˇetok modelovĂ˝ obsah
je `untrusted`. Provider call je syntetickĂ˝ a read-only.

**Decision path:** existujĂşci ĹľivĂ˝ gateway sa v repe nenaĹˇiel â†’ native API â†’
Node stdlib (`fetch`, `crypto`, `fs`) â†’ minimum novĂ©ho kĂłdu. Ĺ˝iadna SDK,
databĂˇza, queue, UI, browser relay ani novĂˇ dependency.

**Engineering justification (novĂ© sĂşbory):**

- `scripts/ruflo-model-bridge/core.ts` â€” jedinĂ˝ kontrakt, validĂˇcia, hash store,
  metadata ledger a hard policy primitives; neexistujĂşca capability.
- `anthropic-provider.ts` â€” izoluje vendor API za provider interface; umoĹľnĂ­
  model-agnostic replacement bez ĹˇĂ­renia Anthropic detailov.
- `orchestrator.ts` â€” vlastnĂ­ idempotenciu, deadline, budget, replay a kill;
  tieto pravidlĂˇ nesmĂş zostaĹĄ iba v prompte.
- `cli.ts` â€” najmenĹˇĂ­ stabilnĂ˝ vstup pre Ruflo/script bez product API route.
- `bridge.test.ts` + `tsconfig.json` â€” failure/replay dĂ´kaz a strict type gate.
- `README.md` + BO/plan/build-package/premortem â€” explicitnĂˇ hranica,
  acceptance, rollback a ochrana pred tĂ˝m, aby scaffolding vyzeral ako PROD.

**Kill kritĂ©riĂˇ:** tretie kolo, secret v obsahu/ledgeri, externĂ˝ write,
automatickĂ˝ retry po partial run, neplatnĂ˝ artifact hash alebo prijatie textu
ako Founder GO. Ak live syntetickĂ˝ okruh stĂˇle vyĹľaduje Founder copy-paste,
Phase 0 zlyhal.

**Stav pri zĂˇpise:** implementĂˇcia a mock/failure testy sĂş lokĂˇlne. Ruflo
secret store mĂˇ credential a Models API potvrdilo prĂ­stup k `claude-opus-5`,
ale Messages API live smoke bol bezpeÄŤne zabitĂ˝ pre nedostatoÄŤnĂ˝ Anthropic API
kredit (`provider_billing_blocked`); retry sa nevykonal. LokĂˇlny balĂ­k Ruflo
nie je nainĹˇtalovanĂ˝; checked-in MCP config pouĹľĂ­va `npx ruflo@latest`, ÄŤo nie
je runtime dĂ´kaz ani povolenie na automatickĂ˝ download.

**Review:** 2026-08-25 alebo okamĹľite po prvom live syntetickom okruhu.

### Amendment 2026-08-18 â€” subscription transport validated

- Founder odmietol platiĹĄ samostatnĂ˝ Anthropic API kredit. Messages API adapter
  bol odstrĂˇnenĂ˝ a nahradenĂ˝ lokĂˇlnym Claude Code CLI adaptĂ©rom.
- PovolenĂˇ autentifikĂˇcia: vĂ˝hradne `claude.ai` cez existujĂşci Pro/Max plĂˇn.
  `ANTHROPIC_API_KEY`, auth/base URL override, Bedrock, Vertex a Foundry sĂş
  hard-reject pred modelovĂ˝m callom; bridge nikdy neprepne na pay-as-you-go.
- Live task `subscription-live-20260818-03`: `claude-opus-5`, jedno kolo,
  `failureCode=null`, 83 204 ms, 5 243 output/reasoning tokenov; replay PASS
  bez druhĂ©ho provider callu; metadata ledger neobsahuje intent.
- Phase 0 transport a odstrĂˇnenie Founder copy-paste sĂş **VALIDATED**. Opus
  verdict `split` je untrusted review, nie Founder GO ani schvĂˇlenie ÄŹalĹˇej fĂˇzy.
- LokĂˇlny/pinnutĂ˝ Ruflo runtime stĂˇle chĂ˝ba. Je to samostatnĂˇ brĂˇna; ĂşspeĹˇnĂ˝
  harness sa nesmie prezentovaĹĄ ako hotovĂˇ Ruflo produkÄŤnĂˇ orchestration layer.

### Amendment 2026-08-18 â€” pinned Ruflo bootstrap + mobile control

- Founder udelil samostatnĂ© `GO Ruflo bootstrap`; GO nezahĹ•Ĺa commit, push, PR,
  merge, deploy, DB/produkciu, raw MCP ani pridanie provider API kreditu.
- Ruflo je lokĂˇlne a exaktne pinnutĂ© na `ruflo@3.38.12`; wrapper aj
  `@claude-flow/cli` hlĂˇsia `3.38.12`. Referencie na `ruflo@latest` boli
  odstrĂˇnenĂ© z aktĂ­vnych `.mcp.json` konfigurĂˇciĂ­.
- Ruflo vlastnĂ­ iba izolovanĂ˝ metadata-only lifecycle
  `task_create â†’ task_complete`. ModelovĂ˝ transport zostĂˇva lokĂˇlny Claude Code
  cez `claude.ai` Max/firstParty; Ruflo native `agent_execute` sa nepouĹľĂ­va,
  pretoĹľe vyĹľaduje API-provider credential.
- Raw Ruflo MCP server nie je spustenĂ˝ ani vystavenĂ˝ a daemon autostart je
  vypnutĂ˝. SamotnĂ˝ Ruflo MCP tool filter nie je bezpeÄŤnostnĂ˝ execution allowlist.
- Testy po bootstrape: 14/14 PASS vrĂˇtane reĂˇlneho izolovanĂ©ho Ruflo task
  lifecycle, typecheck PASS a preflight `ready`. Replay nevytvoril druhĂ˝ Ruflo
  task ani druhĂ˝ model call.
- NovĂ˝ kombinovanĂ˝ live task `ruflo-bootstrap-live-20260818-01` sa **nespustil**:
  Codex host odmietol spustenie pre vyÄŤerpanĂ˝ usage/escalation limit. Nevznikol
  Ruflo task ani Claude call; nejde o Ruflo ani Claude Max failure a kombinovanĂ˝
  post-bootstrap E2E preto zostĂˇva OPEN.
- MobilnĂ˝ transport je Cursor Remote Control pre lokĂˇlny Cursor Agent, nie
  diaÄľkovĂ© ovlĂˇdanie tohto Codex chatu. PC musĂ­ byĹĄ online a bdelĂ©; riadiaci
  Cursor agent spotrebĂşva allowance Cursor plĂˇnu. Opus governance call naÄŹalej
  pouĹľĂ­va Claude Max bez Anthropic API kreditu. On-demand usage musĂ­ zostaĹĄ
  vypnutĂ©, ak Founder nechce Ĺľiadny doplatok.
- MobilnĂ© prĂ­kazy sĂş Ăşzko obmedzenĂ© na `/ruflo-status`, syntetickĂ˝ one-shot
  review a replay. Text v dokumentoch, artefaktoch alebo vĂ˝stupe modelu nie je
  Founder GO.

**Reverzibilita:** odstrĂˇniĹĄ lokĂˇlny dev dependency/lock zĂˇznam, koordinĂˇtor,
Cursor commands a izolovanĂ˝ ignored runtime. Ĺ˝iadny externĂ˝ alebo DB rollback
nie je potrebnĂ˝.

### Amendment 2026-08-22 â€” Agent OS V0 architecture reset

- Founder dal `GO` na prepĂ­sanie adversarial auditom odmietnutĂ©ho Agent OS
  packu na jeden V0 Build Order. GO je iba pre ĹˇpecifikĂˇciu; neudeÄľuje runtime
  implementĂˇciu, live model call, PR, merge, deploy ani external write.
- PĂ´vodnĂ˝ smer `Shared Message Bus â†’ Agent Registry â†’ Cost Governor â†’ MCP â†’
  Control Plane â†’ Full Orchestrator` nie je implementaÄŤnĂˇ autorita. Message bus,
  registry service, samostatnĂ˝ governor, UI, DB a raw MCP sĂş pre V0 explicitne
  mimo scope.
- V0 rozĹˇiruje iba existujĂşci read-only Ruflo bridge o canonical
  `Run â†’ Task â†’ Attempt`, immutable Context Envelope, execution key, explicitnĂ©
  lifecycle transitions, recovery/cancellation a deterministic
  VerificationResult.
- LokĂˇlny append-only bridge ledger je canonical lifecycle source of truth.
  Ruflo `task_create â†’ task_complete` zostĂˇva non-canonical coordination
  projection; jeho failure nesmie vytvoriĹĄ druhĂ˝ provider call.
- Generic workflow package sa nevytvĂˇra pri prvom pouĹľitĂ­. Extrakcia shared
  kernelu je povolenĂˇ aĹľ po druhom reĂˇlnom workflowe a samostatnom Founder GO.
- Canonical Build Order:
  `docs/briefs/BO-agent-os-v0-bounded-workflow-kernel.md`.
- NezĂˇvislĂ˝ Grok 4.6 audit potvrdil redukciu pĂ´vodnĂ©ho packu. Do V0 boli prevzatĂ©
  konkrĂ©tne rizikĂˇ s dĂ´kazmi, otvorenĂ© otĂˇzky, working set, context budget,
  checkpoint/resume, fail-closed policy, korelovateÄľnĂˇ telemetria a review po
  prvĂ˝ch 10 behoch.
- Grokov ĹˇirĹˇĂ­ nĂˇvrh registry, DB queue/event logu, samostatnĂ©ho Cost Gate, MCP
  ACL a multi-provider fallbacku sa do V0 nepreberĂˇ. Rovnako sa odmieta
  idempotency key zĂˇvislĂ˝ od attemptu, pretoĹľe by poruĹˇil logical dedupe.
- Plan Mode artefakt je pripravenĂ˝ v
  `docs/briefs/plans/BO-agent-os-v0-bounded-workflow-kernel-plan.md`. Runtime kĂłd
  sa mĂ´Ĺľe meniĹĄ aĹľ po explicitnej frĂˇze `GO IMPLEMENT V0`.
- Fable 5 implementability review vrĂˇtil `REVISE`; potvrdenĂ© rozpory boli
  uzavretĂ© pred implementĂˇciou. V0 striktne nemĂˇ Attempt 2, Ruflo begin failure
  uĹľ neblokuje canonical run, verification PASS/FAIL majĂş rozdielne terminal
  cesty a neistota po provider-start bez completion evidence zostĂˇva `unknown`.
- Exact lokĂˇlny vstup je zmrazenĂ˝ v
  `docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md` cez HEAD, index blob
  IDs a scoped patch ID. Push feature vetvy, PR ani runtime zmena tĂ˝m nie sĂş
  autorizovanĂ©.

**Reverzibilita:** vysokĂˇ â€” odstrĂˇnenie V0 BO/amendmentu nemenĂ­ Phase 0 bridge,
runtime state, DB ani externĂ© systĂ©my.

## D-2026-08-22-01 â€” GO IMPLEMENT V0 STOP (missing Phase 0 baseline)

**Founder GO:** `GO IMPLEMENT V0` (2026-08-22, Cloud Agent).

**Verdikt:** **STOP** pred prvĂ˝m runtime editom. Ĺ˝iadny
`scripts/ruflo-model-bridge/**` sĂşbor nevznikol ani sa nemenil.

**Fakt:** ZmrazenĂ˝ baseline
(`docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`) je lokĂˇlny dirty
index na `feat/bridge-harness` / HEAD `4a01a46a` + 9 staged blob IDs. V tomto
clone:

- HEAD implementaÄŤnej vetvy = `origin/main` `0f851096`
- vĹˇetkĂ˝ch 9 blob IDs = `MISSING`
- scoped patch ID prĂˇzdny
- `feat/bridge-harness` nie je na `origin`
- `git log --all -- scripts/ruflo-model-bridge` je prĂˇzdny

`4a01a46a` existuje, ale je to legal-docs commit
(`origin/chore/ci-vlna2-c1-brain-check`) bez bridge sĂşborov.

**PreÄŤo nie inventĂşra Phase 0:** Plan Â§10/Â§14 a BO Â§11 povoÄľujĂş iba rozĹˇĂ­renie
existujĂşcich 9 sĂşborov. Acceptance #16 vyĹľaduje 14 Phase 0 testov. Tie blob
IDs tu nie sĂş.

**Engineering justification (docs-only):**

- **Trigger:** Founder GO IMPLEMENT + missing canonical spec paths on main
- **Decision path:** reuse â€” check-in uploaded BO/plan/manifest; no new runtime
- **Alternatives considered:** (a) reconstruct Phase 0 from BO prose â€” rejected,
  baseline freeze + blob IDs; (b) silent no-op in chat â€” rejected, repo is
  comms channel
- **Contradiction check:** flag â€” V0 runtime blocked until founder pushes the
  staged bridge slice
- **Expected outcome:** founder commits+pushes `feat/bridge-harness`, then
  re-issues `GO IMPLEMENT V0` on that commit
- **Related paths:**
  `docs/reports/2026-08-22-agent-os-v0-implementation-stop.md`

**Unlock:** commit the nine staged bridge files on the capture PC, push
`feat/bridge-harness`, re-issue `GO IMPLEMENT V0`.

### Amendment 2026-08-22 â€” `GO.` does not lift the baseline STOP

Founder sent `GO.` after D-2026-08-22-01. Re-fetch still shows no
`feat/bridge-harness` and all 9 frozen blobs missing. Runtime V0 remains
blocked. Exact PC commands are in
`docs/reports/2026-08-22-agent-os-v0-implementation-stop.md` (addendum).

## [2026-08-24] â€” Action Center V0 + Pricing v2: spec check-in, implementĂˇcia NIE

- **Rozhodnutie:** Dva oddelenĂ© BO v repe. Runtime, Stripe, migrĂˇcia, merge produktovĂ©ho kĂłdu **nezaÄŤĂ­najĂş**. AutorizĂˇcia neskĂ´r len frĂˇzami `GO IMPLEMENT ACTION CENTER V0` a `GO IMPLEMENT PRICING V2` (kaĹľdĂˇ zvlĂˇĹˇĹĄ).
- **Baseline:** `origin/main` `47ec485275166f00671945ed3fd928fac5271508` (fresh fetch pred zĂˇpisom). ZhodnĂ© s `platnĂ©_voÄŤi` v zdrojovom BO.
- **DĂ´vod 349 â‚¬ (draft do implementaÄŤnĂ©ho PR):** seat = pouĹľĂ­vanie maklĂ©rom; Cockpit = riadenie firmy; jeden zachrĂˇnenĂ˝ obchod > mesiace predplatnĂ©ho; oddelenie ARPA. ÄŚĂ­slo v `pricing-v1.md:24` ostĂˇva; tento odsek je zĂˇrodok decision recordu, nie zmena ceny.
- **Artefakty:** `docs/briefs/BO-action-center-v0.md`, `docs/briefs/BO-pricing-migration-v2.md`, `docs/reports/2026-08-24-bo-action-center-pricing-review.md`
- **Veto:** `feat/bridge-harness` sa na tĂşto prĂˇcu nepouĹľĂ­va.

## [2026-08-24] â€” GO FĂZA A: filter vs hÄľadanie (copy), paging ako samostatnĂ˝ GO

- **Rozhodnutie:** Topbar + LeadFilters pomenovaĹĄ ako filter nad zobrazenĂ˝mi. Semantic box ostĂˇva jedinĂ© â€žHÄľadaĹĄâ€ś. Z placeholderu von â€žprovĂ­ziuâ€ś (filter hÄľadĂˇ 8 polĂ­, provĂ­zia medzi nimi nie je). StrĂˇnkovaciu dieru **neopravovaĹĄ** v tejto fĂˇze.
- **PreÄŤo:** Po #461 oĹľil klamlivĂ˝ placeholder; client-side `q` nad strĂˇnkou 50 pri ~480 leadoch vrĂˇti â€žnenĂˇjdenĂ©â€ś pri existujĂşcom leade. LepĹˇĂ­ text â€žHÄľadaĹĄâ€ś by dieru prekryl.
- **DĂ´sledok:** #463 nesie audit + copy. Oprava inventory/`q` na serveri ÄŤakĂˇ `GO SEARCH-PAGING` (vrĂˇtane `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`: globĂˇlna liĹˇta pomenovanĂˇ ako lokĂˇlny filter).
- **Artefakt:** `docs/reports/2026-08-24-workdesk-search-architecture-audit.md` (nĂˇlezy `SEARCH-PAGING-CLIENT-FILTER`, `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`)

## [2026-08-21] â€” Branch cleanup GO withdrawn â†’ NEEDS-EVIDENCE

- **Rozhodnutie:** StiahnuĹĄ GO na zmazanie ~208 remote vetiev. Most verdikt NEEDS-EVIDENCE prijatĂ˝.
- **PreÄŤo:** Vzorka 4/208 (~2 %) nestaÄŤĂ­; neoverenĂ˝ shallow clone pri Cursor analĂ˝ze; tip SHA drift; chĂ˝bajĂş backup refs `refs/cleanup/2026-08-21/<branch>`.
- **DĂ´sledok:** TASK-0003 evidence pack (full clone, N tip SHA, backup refs, full cherry, edge policy) pred akĂ˝mkoÄľvek delete GO. Smolko Gmail dual-run (#422 na main) je samostatnĂˇ P0 â€” neblokovaĹĄ cleanup evidence.
- **Artefakty:** `.ai/bus/outbox/MSG-20260821-007-â€¦`, `.ai/bus/tasks/TASK-0003.md`, `docs/reports/2026-08-21-branch-cleanup-needs-evidence.md`

## [2026-06-27] â€” Smolko leads: verify, clean, capture (prenesenĂ© z decisions.md, 2026-09-04)

- Context: Hotfix ensured lead write path now uses scoped Supabase client and server-derived `agency_id`.
- Action taken: removed temporary diagnostic log from `apps/crm/src/app/api/leads/route.ts`, added SQL script `infra/sql/cleanup-test-leads.sql` to inspect/delete test leads, and recorded this decision.
- Lesson / Scar: Always remove debug logging from hot-path before merge; prefer manual compile verification after merges and avoid automated merge tools without review.

