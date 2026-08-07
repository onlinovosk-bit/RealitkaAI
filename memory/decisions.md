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

## [2026-07-22] - Sandbox demo + lead_consents (GO founder)

- **Brief:** `docs/briefs/overnight/overnight-brief-sandbox-gdpr.md` — GO na migráciu 2026-07-22.
- **Rozhodnutie:** Interná sandbox agency `22222222-...` + slug `demo` (FK bez nullable zmeny). Consent do `lead_consents`, nie ďalšie stĺpce na `leads`.
- **Migrácia:** `20260722120000_sandbox_gdpr_consent.sql` — `is_sandbox`, `sandbox_submissions`, `lead_consents`, seed `/odhad/demo`.
- **Brána po merge:** founder mobile smoke `/odhad/demo` + Supabase check (0 leads) pred zdieľaním demo linku.


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

## [2026-07-19] - Valuation Widget — VALIDATE (+ Wave 0 route)

- **Signál:** Reality Smolko a AA Reality Molnár verbálne potvrdili záujem, ale bez potvrdeného distribučného kanála, SLA a ochoty platiť.
- **Dôkaz dopytu (2026-07-19):** `realitysmolko.sk/ponuka-dopyt` už obsahuje položku „Ocenenie nehnuteľnosti“ a vedie naň platená Google Ads kampaň (gclid). Dopyt validovaný klientom samým; kanál č. 1 = táto stránka. Predajný rámec: upgrade platenej kampane (okamžitý výsledok = vyššia konverzia + leady do Revolis triage namiesto e-mailu), nasadenie vo fázach (paralelné tlačidlo → náhrada formulára).
- **Webex bypass (2026-07-19):** Pilot Fáza 0 = Ads priamo na Revolis URL, bez Webexu. Seliga voliteľný až pre tlačidlo na webe. Stealth: Revolis neoslovuje Webex pred dôkazom. Brief: `docs/briefs/validation-valuation-widget.md` § Webex bypass stratégia.
- **Wave 0 route:** `/odhad/[agencySlug]` + `POST /api/valuation/submit` → `leads` (`source=valuation_widget`). Pilot tenant: `reality-smolko`. Bez falošného cenového pásma (maklér kontaktuje s odhadom).
- **VETO na plný BUILD:** chýba licencovaný, reprodukovateľný zdroj cenových dát; LLM nesmie vytvárať trhové cenové pásmo bez neho.
- **GDPR gate:** pred pilotom Privacy Notice, právny základ a controller/processor roly potvrdiť s AKMV.
- **Brief:** `docs/briefs/validation-valuation-widget.md`
- **Odomknutie:** 14-dňový pilotný kontrakt s konkrétnymi kanálmi, SLA, metrikami a data/GDPR bránou.
- **Cenová stratégia (2026-07-19, founder GO):** widget sa nespoplatňuje samostatne — je súčasť balíka Revolis, monetizácia cez seaty. Klientovi sa cenová otázka nekladie; cenovú hypotézu validuje podpis Molnára ako 2. platiaceho zákazníka.

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

## [2026-07-27] - Guardian v1.1 — STALE 90d+7d + production allowlist — BUILD

- **Rozhodnutie:** STALE len ak existuje `lead_events` a posledná aktivita je staršia ako 7 dní ale mladšia ako 90 dní (žiadny fallback na `created_at`). Production cron beží len pre `GUARDIAN_AGENCY_ALLOWLIST` (unset/prázdne = žiadny tenant beh). `GUARDIAN_DIGEST_ENABLED` default false nezmenený; baseline kill >50 z premortem zostáva.
- **Prod audit (2026-07-27):** 473 open STALE — všetky neplatné pod v1.1 (žiadne lead_events); ostatné open: NO_OWNER 9, NO_PHONE 10, HOT_IGNORED 8.
- **Súbory:** `apps/crm/src/lib/guardian/{config,rules}.ts`, cron routes, `scripts/guardian-v11-cleanup-invalid-stale.sql`, brain `rme-dec-20260727-002`.
- **Founder GO:** potvrdiť agency UUID v allowlist env pred prod cron; voliteľný DELETE script po merge.

## [2026-07-28] - Operator Dashboard v1 — aggregate-first — BUILD (schema gate)

- **Rozhodnutie:** `/operator` len pre `profiles.is_platform_admin` + `OPERATOR_DASHBOARD_ENABLED` (default false); agency user / anonym **404**; v1 bez PII v agregátoch, bez drill-down/kampaní; sandbox tenant vylúčený.
- **Schéma:** `20260728140000_profiles_platform_admin.sql` — founder po prod apply: `UPDATE profiles SET is_platform_admin = true WHERE email = '…'`.
- **Brain:** `build-package.operator-dashboard-v1`, `rme-dec-20260728-001`.

## [2026-08-02] - Engineering justification: Engineering Constitution — BUILD

- **Trigger:** new-governance-doc + cursor rule + brain registry wiring
- **Decision path:** extend-existing — Decision Memory + brain/registry (žiadny paralelný coding log)
- **Alternatives considered:** samostatný JSON log (zamietnuté — duplicitný graf); CI-only gate bez memory (zamietnuté — chýba contradiction protocol)
- **Why not reuse:** Existujúca Ústava = biznis brána; chýbala technická vrstva Builder/Judge pre reuse a nové abstrakcie
- **Expected outcome:** Každý nový súbor/komponent/dep má traceable justification v `memory/decisions.md`; Judge = Kontrolór; `npm run brain:ingest` projektuje kurátorované záznamy
- **Related paths:** `docs/architecture/engineering-constitution.md`, `.cursor/rules/l99-engineering-constitution.mdc`, `brain/src/catalog.ts`, `rme-dec-20260802-001`
- **Contradiction check:** none — dopĺňa `engineering-os-revolis-rightsized.md` L3 ADR, nekonflikuje s Revolis Constitution v2
- **PR / vetva:** docs/engineering-constitution-decision-memory

## [2026-08-03] - Night Operations v0 (A1/A2/A3) — Strategic Bet · BUILD (founder GO option C)

- **Kategória:** Strategic Bet (klasifikácia v2) · timebox ~3 dni · promote / re-bet / kill
- **SSOT:** `docs/architecture/2026-08-03-night-operations.md` · Center: `docs/architecture/2026-08-03-night-operations-center.md`
- **Setup:** `docs/automations/2026-08-03-setup-karta.md`
- **Uzly dnes:** A1 Architecture Guardian · A2 Strážca vetiev · A3 Ranný brief (Fáza 1 read-only)
- **Zakázané:** portal scrape · auto-deploy · prod DELETE · CREDITS_ENFORCEMENT on · merge #356–#366 nie je súčasťou tohto balíka
- **Review / kill dátum:** **2026-09-08** (ADR + 30d metriky); prvá kill kontrola **2026-08-08**

### ADR-001 — Orchestrátor až pri piatom uzle
Piaty uzol = orchestrátor. Do štyroch sa reporty čítajú jednotlivo. Ranný brief je reportovacia vrstva, nie štvrtý "feature" uzol.

### ADR-002 — Vstupná brána
Každý uzol má vstupnú bránu. Uzol bez brány sa nestavia.

### ADR-003 — Vrstva 4: navrhovať, nestavať
Vrstva 4 smie navrhovať, prioritizovať, odhadovať návratnosť a pripraviť PR. Nikdy commit, merge ani deploy bez človeka.

### ADR-004 — Dvojité odôvodnenie (východisko, nie zákon)
Nový uzol vyžaduje technické **aj** obchodné odôvodnenie. Ani jedno samo nestačí. Predvolené prahy (4. uzol: +10 oslovených; orchestrátor: 3. platiaci; Center: 5 platiacich) sú **východisko**; odchýlka je povolená so zapísaným dôvodom a dátumom revízie v tomto súbore. Neuznaný dôvod: "bolo by to zaujímavé postaviť."

### ADR-005 — Životný cyklus uzla
NÁVRH → BEŽÍ → VYHODNOTENIE (30/90 dní) → PONECHAŤ | ZLÚČIŤ | VYPNÚŤ. Vypnutý uzol sa **nemaže** — zostáva v repe s dátumom a dôvodom. Spúšťače vypnutia: 30 dní bez verdiktu v `docs/audit/nodes-value.jsonl` · 30 dní bez akcie · trvalo červený 14 dní · nahradený · prah splnený natrvalo.

### Kill kritérium
Ak 2026-08-08 nebude founder vedieť povedať, že reporty čítal päť rán po sebe, vypnúť všetky tri a nestavať štvrtý.

- **Verdikt schema:** `verdict ∈ { konal | vedel | zbytočné }` — append do `docs/audit/nodes-value.jsonl`
- **PR / vetva:** docs/night-ops-2026-08-03

## [2026-08-06] � Listing generator prompt: K1 GO � K2+K3 STOP
- **Rozhodnutie:** Founder schv�lil K1 (met�da 10 techn�k + vetvy). Dodan� K2 draft syst�mov�ho promptu + K3 eval (6 JSON). **STOP pred K4.**
- **S�bory:** `docs/sales/listing-generator-system-prompt-DRAFT.md`, `docs/sales/listing-generator-K3-eval.md`
- **Sabinov zdroj:** Word `PODKLADY K INZERCII REALITY SMOLKO.docx` (md demo v repo ch�ba).
- **�alej:** founder GO � K4 oponenti (O1�O6 z metapromptu).

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

### DĂ´vod (argument foundera)

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
fronty PR) je hotovĂ˝ do polovice augusta.

### ZĂˇvĂ¤znĂ© podmienky pred spustenĂ­m

QA brĂˇna programu **nepreĹˇla** (15 poruĹˇenĂ­). NasledujĂşce podmienky platia
bez ohÄľadu na rozsah a nie sĂş predmetom vyjednĂˇvania:

1. **Krok 0 pred akĂ˝mkoÄľvek paralelizmom.** DĂ´kazy neprekrytia sa prepoÄŤĂ­tajĂş
   proti skutoÄŤnĂ˝m cestĂˇm overenĂ˝m inventarizaÄŤnĂ˝m behom v repe, nie proti
   odhadom. Bez toho Ĺľiadny noÄŤnĂ˝ swarm.
2. **W1 a W3 sa neaktivujĂş**, kĂ˝m nie je ÄŤierne na bielom doloĹľenĂ©, komu pĂ­Ĺˇu.
   PrĂ­tomnosĹĄ opt-out kontaktu (`mihalrado`, Simi Real) naznaÄŤuje, Ĺľe oslovujĂş
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

- `docs/sales/realizacny-zoznam-do-11-8.md` â€” sekcia â€žOdloĹľenĂ© do 1.9."
  prestĂˇva platiĹĄ. Zoznam dennĂ˝ch obchodnĂ˝ch priorĂ­t do 11.8. zostĂˇva.
- `docs/architecture/engineering-os/README.md` â€” poznĂˇmka âť„ď¸Ź FREEZE sa ruĹˇĂ­;
  moduly graph-engineering a hybrid-retrieval prechĂˇdzajĂş z Approved (impl.
  Deferred) na Approved (impl. plĂˇnovanĂˇ, vlna podÄľa programu).
- `CONSTITUTION.md` â€” ratifikĂˇcia textu vo v1.1 zostĂˇva; obmedzenie
  â€žbez implementĂˇcie vynucovania do 1.9." sa ruĹˇĂ­, Constitution Engine je
  sĂşÄŤasĹĄou programu.


---

## D-2026-08-06-02 â€” ADR Memory Engine: re-bet kill kritĂ©riĂ­

**TĂ˝ka sa:** `docs/architecture/adr-2026-07-28-memory-engine.md`, sekcia Â§5 Kill kritĂ©riĂˇ

### Rozhodnutie

Kill kritĂ©rium *â€žPR-1..PR-4 nie sĂş zmergovanĂ© do 6.8.2026"* **vyprĹˇalo dnes
a nahrĂˇdza sa.** Bet sa nezabĂ­ja, prehodnocuje sa.

### DĂ´vod

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
   ak 30 dnĂ­ po nasadenĂ­ PR-3 (outbox) obsahuje tabuÄľka `memory_events`
   menej neĹľ **100 zĂˇznamov**, bet sa zabĂ­ja. Znamenalo by to, Ĺľe do pamĂ¤te
   niÄŤ neteÄŤie a postavili sme sklad bez tovaru.

**PoznĂˇmka k hierarchii:** termĂ­ny merajĂş disciplĂ­nu, pouĹľitie meria zmysel.
Ak sa termĂ­ny nestihnĂş, ale dĂˇta teÄŤĂş, bet Ĺľije. Ak sa termĂ­ny stihnĂş a dĂˇta
neteÄŤĂş, bet je mĹ•tvy bez ohÄľadu na to, koÄľko kĂłdu vzniklo.

### Reverzibilita

Ä˝ahko zvratnĂ© â€” kritĂ©riĂˇ sa dajĂş kedykoÄľvek prepĂ­saĹĄ ÄŹalĹˇĂ­m amendmentom
podÄľa CONSTITUTION.md ÄŚl. 8.

### ĂšdrĹľbovĂ˝ krok

V `docs/architecture/adr-2026-07-28-memory-engine.md`, Â§5 Kill kritĂ©riĂˇ,
doplĹ k pĂ´vodnĂ©mu bodu *â€žPR-1..PR-4 nie sĂş zmergovanĂ© do 6.8."* riadok:

> **STAV: NAHRADENĂ‰ rozhodnutĂ­m D-2026-08-06-02 (2026-08-06).**

PĂ´vodnĂ˝ text nemaĹľ.

## [2026-08-07] — Listing generator K4 REDO: STOP pred K5 (eskalácie)
- **Rozhodnutie:** Founder GO K4. Oponentský kolotoč (oficiálna tabuľka O1–O6 z `metaprompta3generator.md`) — 3 kolá. O2/O3 bez BLOKUJE po regenerácii. **K4 STOP** — čaká E1 (soft municipal character) + E2 (dĺžka mainText 150–280 vs UI 250–400).
- **Súbory:** `docs/sales/listing-generator-system-prompt-K4.md` (kandidát), `docs/sales/listing-generator-K4-review.md`, K3-eval regenerované; DRAFT = superseded.
- **Ďalej:** founder rozhodne E1+E2 → GO K5.


## [2026-08-07] — Listing generator K5: E1/E2 CLOSED + FINAL
- **E1 (FOUNDER):** Veto O2 platí. Charakterizácia lokality výhradne z `charakterLokality` (enum + voľný text, voliteľné). Bez vstupu = žiadna veta o povahe lokality. UI pole → recommendation v `inzerat-generator-tab.md`.
- **E2 (FOUNDER):** mainText 220–320 slov, cieľ ~270 (golden 296/275/240/254). Jediný zdroj pravdy = systémový prompt; UI brief odkazuje na FINAL.
- **BUILD:** `docs/sales/listing-generator-system-prompt-FINAL.md` + `docs/sales/listing-generator-K5-handoff.md`. K4 = superseded medzikrok. Status **K5 HOTOVÉ**.
- **Ostáva:** UI implementácia `charakterLokality` + wire FINAL do generateListingContent (mimo K5).

## [2026-08-07] � Listing generator C4: schema = ListingContent (CLOSED)
- **C4 (FOUNDER, vykona� TERAZ):** FINAL prompt emituje produk�n� k���e `ListingContent` � �iadny mapper. `mainText`�`portal_text`; `socialText`�`fb_ad_copy`+`ig_caption`; optionals: `titles?`, `missingData?`, `recommendations?`, `techniquesUsed?`.
- **BUILD:** typ roz��ren� adit�vne; K3 T1�T6 regenerovan�; vitest 6/6 PASS (`listing-content-c4-schema.verification.test.ts`).
- **NEROBI�:** PR-A (wire FINAL do `generateListingContent`) � �ak� GO + C2.
- **S�bory:** FINAL, K5-handoff, K3-eval, inzerat-generator-tab, `listing-content.ts`.

## [2026-08-07] � Listing generator: founder (b) stress feedback (nie C2 close)
- **Fakt:** Founder ozna�il `fb_ad_copy` lead z K3 Test 5 (Pre�ov 72 m2, pr�zdny popis) ako �p�sal �lovek�.
- **Pravda:** text = FINAL stress (nie golden / �lovek). Interpret�cia: prompt oklamal foundera na riedkom vstupe � pozit�vny stress/C3 sign�l.
- **Nie:** C2 verdikt Teriakovce/�ubotice; (b) C2 p�ry neuzatv�ra. PR-A st�le �ak� C2 protokol + GO.
- **S�bory:** `docs/sales/listing-generator-C2-notes.md`, K3-eval Test 5, K5-handoff �5b.

## [2026-08-07] � Listing generator PR-A: FINAL prompt wire (GO)
- **GO (FOUNDER):** po C2 PASS + C4 CLOSED � wire FINAL do generateListingContent / SYSTEM_PROMPT.
- **BUILD:** listing-content-system-prompt.ts (FINAL inline const); optionals na ListingContent; C4 fixtures + prompt-wire verification; docs listing-generator-* � docs/prompts/ (smolko golden ost�va v docs/sales/).
- **Mimo scope:** PR-B UI charakterLokality; mapper �iadny.
- **Rollback:** revert PR.
- **Merge:** founder pri kl�vesnici (agent NEmerguje).
