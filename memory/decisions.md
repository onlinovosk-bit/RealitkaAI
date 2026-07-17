# Critical Decisions Log
- [2026-04-29] CI/CD: Vyriešený "Nuclear Option" pre artifacty (apps/crm/.next). Pipeline je ZELENÁ.
- [2026-04-29] XML Feed: Zvolená Varianta 1 (Vlastný web) pre utajenie pred Webexom.
- [2026-04-29] Outreach: Definované šablóny pre segmenty A (Hot), B (Warm), C (Cold).

## [2026-04-30] - L99 Core Architecture & Security Overhaul

### 1. Rozhodnutie: Prechod na Štafetovú (Relay) Orchestráciu
- **Alternatívy:** Fixné crony bez kontroly stavu (pôvodné), manuálne spúšťanie.
- **Prečo:** Eliminácia kaskádových chýb. Každý krok (Scrape -> Score -> Segment) spracuje len dáta pripravené predchádzajúcim krokom.
- **Dôsledok:** Systém je autonómny a odolný voči timeoutom API.

### 2. Rozhodnutie: Centralizovaný Revolis Guard (Middleware)
- **Alternatívy:** Overovanie kľúčov v každom súbore zvlášť, žiadne zabezpečenie.
- **Prečo:** DRY (Don't Repeat Yourself) princíp. Jeden "vyhadzovač" pre všetky endpointy uľahčuje údržbu a zvyšuje bezpečnosť.

### 3. Rozhodnutie: Automatizovaná Rotácia Kľúčov (Secret Rotation)
- **Alternatívy:** Statické heslá v kóde, manuálne generovanie hesiel.
- **Prečo:** L99 Security Standard. Použitie 32-znakovej náhodnej entropie (openssl) minimalizuje riziko útoku hrubou silou.

### 4. Rozhodnutie: Zjednotenie Príkazov (One-Click Deployment)
- **Alternatívy:** Posielanie čiastkových kódov, vysvetľovanie ciest k súborom.
- **Prečo:** Rýchlosť exekúcie. Spojenie generovania kľúčov, úpravy .env, vercel.json a endpointov do jedného Bash skriptu eliminuje chybu používateľa.
---
## [2026-04-30] - Slack & Morning Briefing Integration
- **Rozhodnutie:** Centralizácia Slack notifikácií do /lib/slack.js a vytvorenie briefing endpointu.
- **Prečo:** Aby ranný briefing aj Outreach engine zdieľali rovnakú infraštruktúru a tajomstvá (.env).
- **Dôsledok:** Automatizovaný prehľad každé ráno o 8:00 (podľa vercel.json).
---
## [2026-04-30] - Definícia AI Soul & Personality
- **Rozhodnutie:** Vytvorenie personality.md ako riadiaceho dokumentu pre AI.
- **Prečo:** Aby každá nová session začínala s jasným pochopením tvojich preferencií (rýchlosť, automatizácia, bezpečnosť).
- **Dôsledok:** Eliminácia repetitívnych inštrukcií. AI sa stáva tvojím digitálnym dvojčaťom v inžinierstve.
---
## [2026-04-30] - Implementácia Productivity Framework (2x-50x)
- **Rozhodnutie:** Klasifikácia Revolis.AI podľa 20x Agent modelu a vytvorenie skills.md.
- **Prečo:** Aby sme vedeli, kde sa nachádzame na ceste k 50x Agent Teamu.
- **Dôsledok:** Každá nová funkcia bude navrhovaná ako Skill Chain (10x), nie ako samostatný Prompt.
---
## [2026-04-30] - Transition to 50x Agent Team (Competitor Agent)
- **Rozhodnutie:** Nasadenie prvého špecializovaného Agenta bežiaceho paralelne s hlavným flowom.
- **Prečo:** Implementácia Hormoziho princípu "Speed to Opportunity". Sledovanie konkurencie nesmie brzdiť hlavný scraping.
- **Dôsledok:** Systém sa mení z lineárnej štafety na paralelnú fabriku (Agent Team).
---
## [2026-04-30] - Deployment of Social Media Scout Agent
- **Rozhodnutie:** Vytvorenie POST endpointu pre externé sociálne leady.
- **Prečo:** Facebook skupiny sú "čierny trh" s realitami. Potrebujeme tam mať sondu, ktorá zachytáva dopyt skôr, než sa dostane na portály.
- **Dôsledok:** Revolis AI už nesleduje len oficiálne weby, ale nasáva dáta z komunitného priestoru.
---
## [2026-04-30] - Deal-Trigger Deployment & Smoke Test Fix
- **Rozhodnutie:** Nasadenie Deal-Trigger Agenta (15 min interval) a vytvorenie Profit Dashboardu.
- **Prečo:** Prechod od detekcie k akcii (NEGOTIATION_READY). Odblokovanie CI/CD cez dummy ENV kriedenciály.
- **Dôsledok:** Systém už len neinformuje, ale proaktívne tlačí najlepšie ponuky p. Smolkovi pod nos.
---
## [2026-04-30] - Finálny Branding a Hybridná Dokumentácia
- **Rozhodnutie:** Marketingové názvy "STRÁŽCA CIEN A ZISKOV" a "REALITY MONOPOL".
- **Prečo:** Maximalizácia emócie v predaji pri zachovaní kontinuity v dokumentácii (p. Smolko).
- **Dôsledok:** Systém je "vlk v rúchu baránka" – navonok dravý, vnútri administratívne čistý.
---
## [2026-04-30] - UI Transformation: Slack-Style Navigation
- **Rozhodnutie:** Prechod na dvojúrovňovú bočnú navigáciu a centrálne vyhľadávanie.
- **Prečo:** Odstránenie chaosu. Zvýšenie prehľadnosti cez hierarchické usporiadanie (Ikony -> Kapitoly -> Obsah).
- **Dôsledok:** Profesionálne, scannovateľné rozhranie pripravené na škálovanie (Agent Team).
---
## [2026-04-30] - Global UI Shift & Stress Test Evaluation
- **Rozhodnutie:** Preklopenie celej aplikácie na SlackLayout cez root layout.
- **Prečo:** Konzistencia. Užívateľ nesmie pociťovať skoky medzi starým a novým dizajnom.
- **Výsledok testu:** 1000 leadov spracovaných úspešne. Architektúra škáluje lineárne.
---
## [2026-04-30] - UI Cleanup & Slack Purple Theme
- **Rozhodnutie:** Odstránenie auditných textov z dema, zrýchlenie scrollovania o 10% (na 18s cyklus) a implementácia Purple/Dark toggle.
- **Prečo:** Vyčistenie vizuálneho šumu a zvýšenie dynamiky rozhrania. Personalizácia podľa preferencií p. Smolka (Slack identity).
- **Dôsledok:** Demo pôsobí profesionálnejšie a systém získal ikonický Slack Purple vzhľad.
---
## [2026-04-30] - Aktivácia SMS Konceptora (Protokol 1C, 2B, 3B)
- **Rozhodnutie:** Nasadenie poloautomatického systému na generovanie SMS konceptov orientovaných na exkluzivitu.
- **Prečo:** Maklér si zachováva kontrolu nad komunikáciou (2B), ale nestráca čas písaním (Informatívny tón 1C buduje dôveru).
- **Dôsledok:** Zvýšenie konverzie leadov na exkluzívne zmluvy vďaka bleskovému doručeniu relevantnej správy.
---
## [2026-04-30] - Aktivácia Social-to-SMS Bridge
- **Rozhodnutie:** Prepojenie Social Media Scouta s SMS konceptorom pre bleskové reakcie na Facebooku.
- **Prečo:** V sociálnych skupinách rozhodujú minúty. Automaticky pripravený koncept šetrí čas pri copy-paste komunikácii.
- **Dôsledok:** p. Smolko pôsobí ako technologicky najlepšie vybavený maklér, ktorý má prehľad všade.
---
## [2026-04-30] - Deployment NightWatch & AskUserQuest Protocol
- **Rozhodnutie:** Nasadenie automatického večerného reportu o 20:00 a integrácia AskUserQuest protokolu do jadra AI.
- **Prečo:** Uzatvorenie feedback loopu (p. Smolko vidí výsledok dňa) a zefektívnenie komunikácie cez multi-select otázky.
- **Dôsledok:** Systém je plne autonómny v reportovaní a AI je riadená rýchlymi voľbami užívateľa.
---
## [2026-05-22] - Realvia Export v2 Integration Contract
- **Rozhodnutie:** Všetky Realvia-facing endpointy vracajú `{ result: "ok"|"error", message: string }` (PR #58).
- **Prečo:** Realvia feedback cielil výhradne na response format — posledný technický blocker integrácie.
- **Dôsledok:** Webhook + import majú jednotný kontrakt zladený s Realvia dokumentáciou.

## [2026-05-22] - Realvia Delete Payload v2
- **Rozhodnutie:** `isDeletePayload` rozpoznáva `{ source_id, action: "delete", archiveType? }` namiesto `deleted: true` (PR #59).
- **Prečo:** Realvia export v2 posiela `action: delete`, nie legacy boolean flag.
- **Dôsledok:** archiveType mapuje status: sold→Predaná, rent→Prenajatá, cancel→Stiahnutá.

## [2026-05-22] - Unified Realvia Auth Error Message
- **Rozhodnutie:** Všetky auth failure z `validateSecret` vracajú `Invalid authentication` (PR #60).
- **Prečo:** Konzistentný externý kontrakt; interné logy zachovávajú detail.
- **Dôsledok:** Realvia vždy vidí rovnakú auth error message bez ohľadu na missing/wrong token.

## [2026-05-22] - AI Shared Memory Layer (P0)
- **Rozhodnutie:** GitHub `memory/` ako handoff vrstva medzi Cursor/Claude a ChatGPT (nie Notion/CrewAI teraz).
- **Prečo:** Eliminácia copy/paste drift; repo už má `session-summary.md`, `decisions.md`, rules, agents.
- **Dôsledok:** Jeden súbor handoff namiesto celého chatu; orchestration tools až po Realvia GO.
---
## [2026-06-11] - Ochrana proti merge zo zastaraného main (swarm)

- **Rozhodnutie:** GitHub branch protection na `main`: **Require branches to be up to date before merging** + required check `Lint, test, build`.
- **Prečo:** Tri incidenty za 3 dni (#160 bez allowlistu, stale capabilities JSON, stale `decision-flags.verification` po #170) — paralelné vetvy mergnuté bez rebase.
- **Dôsledok:** Sémantické konflikty v CI pred merge. Agent pravidlo: grep `tests/verification/` pri zmene správania. Kanon: `apps/crm/tests/verification/README.md`.

## [2026-06-04] - Arbitrage analyze: `empty` vs `source` (PR-3)
- **Poznámka (nie bug):** Prázdny scan vracia `empty: true` + `source: 'live'`, nie `source: 'empty'`. UI spolieha na `empty`, nie na literal `'empty'`. Ak niečo neskôr filtruje `source === 'empty'`, nenájde to — stealth-recruiter používa `'empty'` inak.
- **Cron / copy:** Hobby Vercel = denné sloty v `apps/crm/vercel.json` (#96). UI copy v `ArbitrageDashboard` zosúladené na „raz denne“ (lokálne, čaká malý PR).
- **Auto-deploy:** Po merge #96 production deploy `realitka-rcsem38y0` (~5 min) — Git hook funguje; predtým blokoval aj Hobby `*/6` validácia. Sledovať „Ignored Build Step“, ak sa znova canceluje preview/prod.

## [2026-06-04] - v1 scope + nav inventúra (post PR-3)
- **v1 = CRM + AI jadro** (LIVE: leady, triáž, call analyzer, playbook, Realvia). Trhový feed (`portal_listings` bridge) → backlog **post-v1**, nie teraz. Arbitráž = úprimný prázdny modul.
- **Nav /arbitrage:** V `lib/navigation.ts` NAV_ITEMS existuje, ale chýbal v `NAV_GROUPS` (legacy sidebar). Workdesk (`AppSidebar`) číta `types/navigation.ts` `ALL_NAV_ITEMS` — tam položka **chýbala úplne** (nie tier gate). Oprava: pridať do `ALL_NAV_ITEMS` + `NAV_GROUPS.arbitrage`.
- **Plán + rola (P0 backlog):** Smolko screenshot = `agent_solo` (Active Force + Maklér) namiesto `owner_vision` + Market Vision. `enforceSmolkoOwnerDefaults` v kóde existuje — overiť, či beží na prod (profil lookup / email / deploy). Dôležitejšie než arbitráž link.
---

## [2026-06-18] - Stealth funnel incident + CI guard AP-011
- **Incident:** Cursor vygeneroval `stealth-funnel` (zakázané) bez explicitného pokynu — zahodené pred commitom; kontaminácia v `proxy.ts`, `sales-funnel-store`, `update-status` tiež vyčistená.
- **Medzera:** CI guard hľadal len `stealth-recruiter`; nové meno `stealth-funnel` by prešlo.
- **Rozhodnutie:** Guard rozšírený z konkrétneho mena na vzor `stealth[-_]?(funnel|lead|recruiter|program)` (PR guard-first, potom tenant isolation). Zápis AP-011 v `docs/architecture/antipatterns-log.md`.

---
- **Stav:** `SCHEMA_GUARD_SUPABASE_URL` + `SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY` nie sú v GitHub Actions secrets → scheduled guard padal každú noc (konfiguračný fail, nie drift).
- **Rozhodnutie:** Cron v `.github/workflows/schema-governance-guard.yml` **dočasne vypnutý**; `workflow_dispatch` ostáva pre manuálny beh po nastavení secrets.
- **Re-enable:** Po doplnení secrets odkomentovať `schedule` (04:17 UTC) — guard má chytať skutočný schema drift (AP-008), nie šumovať falošnými červenými.
- **Súvis:** Brief 12 Wave B governance; Brief 14 merge #211 na `main`.

---

## [2026-06-19] - BRI / Smolko 439 leadov — honest pending, žiadny backfill

- **Fakt:** Realvia import = identita (meno+email), nie kvalifikácia. 439/439 prázdne `budget`/`timeline`/`financing`/`last_contact`; dáta nie sú v `payload_raw` ani inde.
- **VETO backfill:** BRI sa **nedá** oživiť backfillom z Realvie — nemáme z čoho.
- **Rozhodnutie A (BUILD teraz):** **Honest pending** — UI „Nekvalifikované / chýbajú údaje" (AP-001). BRI kód nemeníme; ožije pri reálnej práci makléra alebo kvalifikačnom formulári.
- **Rozhodnutie B (VALIDATE):** Zdroj kvalifikácie = Smolko admin **Klienti/Dopyty** (Nehnuteľnosti) — preskúmať CSV export; nie enrichment engine na prázdnych poliach.
- **Realvia:** Primárny zdroj nehnuteľností + identít leadov; UC direct handoff zrušený.
- **Reconcile (B1, #222):** Spustiť `?reconcile_processed=1` **až po merge #222**; len párovanie cez `source_id` + existujúca property (AP-010), nie hromadný prepis. Kozmetika monitoringu, nie blocker.

---

## [2026-06-20] - Vlna 1+2 verified (Smolko PROD vizuál + brána A3)

- **Route:** `https://app.revolis.ai/vertical-pack/13303557` · login **Reality Smolko** (Rastislav Smolko).
- **Vlna 1 (#228/#229):** verified — completeness z reálneho PROD riadku **89% (8/9)**, chýba len cena; listing score + capabilities bežia na živých dátach (10 fotiek).
- **Vlna 2 (#230):** verified — bannery PASS, decky + microsite vykreslené; **žiadny** žltý „DB riadok nenájdený".
- **Guardian FLAG** na listing/deck/microsite kvôli HTML v popise (`<br />`…) — očakávané správanie K1; fix **PR #231** (strip HTML + skip cena 0 v listing body).
- **Poznámka:** 44% = len fixture fallback (iný účet); na Smolko PROD očakávaj **~89%**, nie 44%.
- **A3 brána:** `processed=false` count = **2**; cleanup SQL nespustené autonómne (správne).
- **Backlog kozmetika:** A3 annotate Section 2 (2 riadky); merge #231 + re-check demo.

---

- **Vstup:** `docs/prompts/L99-lead-discovery-prompt.md` · 5 právnych brán · 30-rolová perspektíva.
- **Výstup:** `docs/briefs/overnight/wave3-lead-discovery-roadmap.md` (18 legálnych spôsobov, TOP 3, zahodené).
- **TOP 3 (VALIDATE/BUILD až po dátach):** (1) Smolko Dopyty CSV import, (2) first-party web/microsite formulár, (3) reaktivácia 439 so súhlasom — **#3 vyžaduje samostatný Ústava + gdpr-advisor pred kódom**.
- **VETO nestavať:** attribution engine, dedup ML, portálové scraping, buyer-intent scraping, enrichment bez súhlasu.
- **Overnight sekvencia:** Vlny 1–2 mergnuté (#228–#230); A3 PROD SELECT = 2 pending webhook rows (unknown/delete, OK).
- **BUILD brief (pripravený):** `docs/briefs/overnight/ruflo-swarm-smolko-dopyty-csv-import.md` — spusti po CSV od Smolka.

---

## [2026-06-21] - Smolko Klienti CSV — VALIDATE CLOSED (nie BUILD)

- **Fakt z reálneho exportu:** stĺpce `ID, Email, Telefón, Meno, Priezvisko, Meno vlastníka, Rola vlastníka`.
- **Už v DB (439 leadov z Realvia):** ID, email, telefón, meno, priezvisko — ~95% duplikát.
- **Jediné nové:** priradenie klient → maklér (`Meno vlastníka` / `Rola vlastníka`) — marginálne, nie kvalifikácia.
- **Dopyty:** kvalifikačné dáta (rozpočet, čo hľadá, timeline) — **hromadný export NEDOSTUPNÝ** (Smolko potvrdil).
- **VETO BUILD:** CSV import Klientov **nespúšťať** — prínos (meno makléra) neodôvodňuje PROD write na 439 riadkov.
- **BRI cesta:** reálna kvalifikácia pri kontakte makléra + honest pending UI; prípadne first-party formulár (roadmap TOP #2), nie export.
- **Voliteľné backlog:** `assigned_makler` cez email match — len po Ústave GO; nie priorita.

---
- **Rozhodnutie:** Overnight swarm Brief 9.0 — Fáza 0 `feat/automerge-policy` (Tier 3, merge Andy pred spaním); Vlny 1–3 až po merge robot PR + midnight gate.
- **Pravidlá:** Tier 1 okamžitý merge (docs/tests/md); Tier 2 po 6 h; Tier 3 denylist (`.github`, migrácie, auth, billing, ceny, Smolko). Robot vykonáva `docs/AUTOMERGE-POLICY.md`, neinterpretuje.
- **Swarm:** `swarm-1781208552399-vakdrp` (Ruflo hierarchical, 12 agentov).
- **Pre-flight 8.0:** RLS #184 CI zelené; #183 partial; landing/metrics/nehnuteľnosti/w2 — vetvy neexistujú.
- **Lekcia:** REPORTOVANÉ ≠ COMMITNUTÉ; vitest include ≠ CI run (opravené na #184).
---

## [2026-06-22] - #235 Guardian multi-area (13303557) — BUILD

- **Overenie:** PROD popis explicitne: zastavaná **167 m²**, úžitková **120 m²**, pozemok **4.500 m²**; DB `building_area=167`, `usable_area=120`, `land_area=4500`.
- **Rozhodnutie:** Cesta (b) — rozšíriť `PropertyFacts` (`buildingArea`, `plotArea`) + Guardian skenuje všetky m² v tele proti množine povolených plôch (štruktúrované + m² z `source.description`). Cena 0 nevyvoláva price drift scan.
- **Výsledok:** PROD smoke script — **6/6 capability Guardian PASS** (`fromFixture: false`). **Completeness score** (rubrika `scoreListingCompleteness`, 9 polí): **44 %** = 4/9 pre `13303557` — nie 89 % (89 % bol docs drift; jediný zdroj pravdy je `listing-score/score.ts`).
- **Súbory:** `quality-guardian/types.ts`, `review.ts`, `listing-generator/generate.ts`, testy.

## [2026-06-23] - AP-012 nosič: vágny chore/docs commit (e7040db88) — VETO / cleanup

- **Incident:** 4 L99 governance docs (`premortem-mitigations`, `gdpr-operational-checklist`, `tech-ownership`, `product-one-thing`) sa dostali na `main` cez `e7040db88` (`chore(crm): tier label tests, QA docs…`), nie cez schválený feature PR (#240 bol čistý kód).
- **Vektor:** horší než „scope pri malom PR" — **vágna `chore`/`docs` nálepka**, ktorú nikto nečíta riadkovo.
- **Rozhodnutie:** docs **vyhodené** z produkčného repa (PR #242); koncepty idú do Kit backlogu, nie do CRM pri oprave odkazu.
- **Pravidlo:** `chore:` / `docs:` commit ≠ skip review; diff po riadkoch vždy. Zapísané aj v `.claude/anti-style.md`.
- **Guardian PROD:** code-truth #240 OK; predajný argument až pri 5/5 PROD smoke.

## [2026-06-22] - Blueprint Kit artefakt #5 RRA — v1 Medium

- **Rozhodnutie:** RRA extrahovaný z produkčného Revolis (5 vrstiev + 3 pravidlá toku).
- **Cesty:** `docs/blueprint-kit/Foundation/RRA-REFERENCE-ARCHITECTURE.md`, scoreboard #5 Medium.
- **Sync:** `C:\Revolis OS\Foundation\RRA-REFERENCE-ARCHITECTURE.md`.
---

## [2026-06-24] - AP-015 North Star r2→r4 — BUILD (docs)

- **Rozhodnutie:** North Star preformulovaný: Revolis = Knowledge Monopoly systém (Loops Revenue → Learning → Network → Evolution), nie „AI pre realitky“.
- **Dokument:** `docs/architecture/north-star-2027-2030.md` (r4).
- **Gate:** Genome Test — BUILD len ak 30-dňové KPI zákazníka A zapisuje do Loop 2.

## [2026-06-24] - AP-016 Genome entity prijaté — BUILD (substrát)

- **Rozhodnutie:** `public.decisions` (Prediction Registry) + `public.exclusivity_outcomes` (Genome) akceptované ako Loop 2 substrát.
- **Stav:** Migrácia idempotentná v PROD (manuálne); rep migrácia vo Wave A briefe.
- **Pravidlo:** Predikcie z Loop 1 (Follow-up Agent) zapisujú do `decisions`; žiadne auto-odosielanie.

## [2026-06-24] - AP-017 Genome Factory rozdelený — BACKLOG / čiastočný smer

- **Rozhodnutie:** Genome Factory **auto-deploy** parked (`l99-parked-concepts.md`); manuálna polovica (human approval) povolená až za Guardian 5/5 PROD.
- **VETO:** Automatické nasadenie genómu bez founder GO.

## [2026-06-24] - AP-018 Architektúra uzavretá → pivot exekúcia — BUILD (proces)

- **Rozhodnutie:** Dokumentácia architektúry (North Star r4, parked concepts) uzavretá na úrovni smeru; ďalšie hodiny = Loop 1 exekúcia (Follow-up draft-only), nie nové koncepty.
- **Overnight:** Brief 10 Wave B (tento commit); Wave A/C samostatné PR.
- **Merge:** Human GO; nie auto-merge (AP-012).

## [2026-07-17] - Outcome-first workdesk (Livappy psychology) — BUILD

- **Rozhodnutie:** Implementovať outcome messaging + 60s first audit + 1 dashboard CTA + short onboarding path. Nie nový AI engine — orchestrácia existujúcich signálov (stale, triage, budget×3%).
- **Brief:** `docs/briefs/BO-outcome-first-workdesk.md`
- **Kľúčové:** `lib/copy/outcome-copy.ts`, `lib/workdesk/first-audit.ts`, `GET /api/workdesk/first-audit`, `FirstAuditPanel`, Start-today hero, onboarding `SHORT_PATH` + `step-audit`
- **AP-001:** Odstránené fake KPI fallbacky (€124k / €18.4k), demo leady v hero, +34% claimy na landing/ROI (ROI = user scenario).
- **Verification:** `tests/verification/first-audit.verification.test.ts` (7/7)
- **Merge:** čaká founder GO na commit/PR

## [2026-07-06] - BO-001 Proof of Value Engine (/proof) — BUILD

- **Rozhodnutie:** Verejná route `/proof` + `lib/proof` engine (extrakcia ROI z landing), `POST /api/proof` → `saas_leads` (`source=proof`, answers v `note` JSON). Žiadna migrácia (AP-019). Honest benchmark copy (AP-001).
- **Brief:** `docs/briefs/BO-001-proof-of-value.md`
- **PR / vetva:** #275 · `feat/bo-001-proof`
- **Reuse:** `createSaasLead`, `RoiCalculatorHero` leak model → `lib/proof/engine`, `SLATE_HORIZON`, `LegalFooter`
- **Preview smoke:** `/proof` mobile, 6 krokov, lead v `saas_leads` so `source=proof`
- **Merge:** founder GO (2026-07-06) · merged #275 → `main` · prod `https://app.revolis.ai/proof` 200, `/api/proof` verejný (400 na prázdny body)

## [2026-06-XX] - AP-019 Schema allowlist — BUILD (incident CEO Command)

- **Rozhodnutie:** Každá nová `public` tabuľka musí ísť do `apps/crm/config/public-schema-allowlist.json` v tom istom PR ako migrácia (alebo pred prod apply). Inak Schema Guard mlčí o drift (prípad CEO Command / `routine_notifications`).
- **Incident:** `routine_notifications` v repe, nie na PROD, mimo allowlistu → `/api/ceo-command` 500, Guard ticho.
- **Fix:** allowlist + scoped fallback v PR; migrácia = samostatný prod apply (GO).
