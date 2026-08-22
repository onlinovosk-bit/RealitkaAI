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
- **Cron / copy:** Hobby Vercel = denné sloty v `apps/crm/vercel.json` (#96). UI copy v `ArbitrageDashboard` zosúladené na "raz denne" (lokálne, čaká malý PR).
- **Auto-deploy:** Po merge #96 production deploy `realitka-rcsem38y0` (~5 min) — Git hook funguje; predtým blokoval aj Hobby `*/6` validácia. Sledovať "Ignored Build Step", ak sa znova canceluje preview/prod.

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
- **Rozhodnutie A (BUILD teraz):** **Honest pending** — UI "Nekvalifikované / chýbajú údaje" (AP-001). BRI kód nemeníme; ožije pri reálnej práci makléra alebo kvalifikačnom formulári.
- **Rozhodnutie B (VALIDATE):** Zdroj kvalifikácie = Smolko admin **Klienti/Dopyty** (Nehnuteľnosti) — preskúmať CSV export; nie enrichment engine na prázdnych poliach.
- **Realvia:** Primárny zdroj nehnuteľností + identít leadov; UC direct handoff zrušený.
- **Reconcile (B1, #222):** Spustiť `?reconcile_processed=1` **až po merge #222**; len párovanie cez `source_id` + existujúca property (AP-010), nie hromadný prepis. Kozmetika monitoringu, nie blocker.

---

## [2026-06-20] - Vlna 1+2 verified (Smolko PROD vizuál + brána A3)

- **Route:** `https://app.revolis.ai/vertical-pack/13303557` · login **Reality Smolko** (Rastislav Smolko).
- **Vlna 1 (#228/#229):** verified — completeness z reálneho PROD riadku **89% (8/9)**, chýba len cena; listing score + capabilities bežia na živých dátach (10 fotiek).
- **Vlna 2 (#230):** verified — bannery PASS, decky + microsite vykreslené; **žiadny** žltý "DB riadok nenájdený".
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
- **Vektor:** horší než "scope pri malom PR" — **vágna `chore`/`docs` nálepka**, ktorú nikto nečíta riadkovo.
- **Rozhodnutie:** docs **vyhodené** z produkčného repa (PR #242); koncepty idú do Kit backlogu, nie do CRM pri oprave odkazu.
- **Pravidlo:** `chore:` / `docs:` commit ≠ skip review; diff po riadkoch vždy. Zapísané aj v `.claude/anti-style.md`.
- **Guardian PROD:** code-truth #240 OK; predajný argument až pri 5/5 PROD smoke.

## [2026-06-22] - Blueprint Kit artefakt #5 RRA — v1 Medium

- **Rozhodnutie:** RRA extrahovaný z produkčného Revolis (5 vrstiev + 3 pravidlá toku).
- **Cesty:** `docs/blueprint-kit/Foundation/RRA-REFERENCE-ARCHITECTURE.md`, scoreboard #5 Medium.
- **Sync:** `C:\Revolis OS\Foundation\RRA-REFERENCE-ARCHITECTURE.md`.
---

## [2026-06-24] - AP-015 North Star r2→r4 — BUILD (docs)

- **Rozhodnutie:** North Star preformulovaný: Revolis = Knowledge Monopoly systém (Loops Revenue → Learning → Network → Evolution), nie "AI pre realitky".
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
- **Dôkaz dopytu (2026-07-19):** `realitysmolko.sk/ponuka-dopyt` už obsahuje položku "Ocenenie nehnuteľnosti" a vedie naň platená Google Ads kampaň (gclid). Dopyt validovaný klientom samým; kanál č. 1 = táto stránka. Predajný rámec: upgrade platenej kampane (okamžitý výsledok = vyššia konverzia + leady do Revolis triage namiesto e-mailu), nasadenie vo fázach (paralelné tlačidlo → náhrada formulára).
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

## [2026-08-06] — Listing generator prompt: K1 GO › K2+K3 STOP
- **Rozhodnutie:** Founder schválil K1 (metóda 10 techník + vetvy). Dodané K2 draft systémového promptu + K3 eval (6 JSON). **STOP pred K4.**
- **Súbory:** `docs/sales/listing-generator-system-prompt-DRAFT.md`, `docs/sales/listing-generator-K3-eval.md`
- **Sabinov zdroj:** Word `PODKLADY K INZERCII REALITY SMOLKO.docx` (md demo v repo chýba).
- **Ďalej:** founder GO › K4 oponenti (O1–O6 z metapromptu).

---

## D-2026-08-06-01 — Nasadzuje sa celý backlog, nie zúžený augustový rozsah

**NAHRÁDZA:** D-2026-08-05-01, D-2026-08-05-02, D-2026-08-05-04, D-2026-08-05-06

### Rozhodnutie

Ruší sa zúženie augustového rozsahu. Nasadzuje sa **celý otvorený backlog**
(položky A1–F6 podľa `REV-DEPLOY-PROGRAM-001.md`): produkt, dátová vrstva,
Memory Engine, Engineering OS moduly, L4 Governance, L5 Evolution a prevádzkové
opravy. Odklad governance a infraštruktúry do 1.9.2026 sa ruší. Zmrazenie
implementácie L4/L5 sa ruší — moduly prechádzajú z evidovaných do
implementovaných podľa vlnového plánu.

### DĂ´vod (argument foundera)

Onboarding zákazníkov aj vývoj robí jeden človek. Keby uprednostnil onboarding,
nemal by čo predávať. Produkt nie je dotiahnutý a chýba mu zdroj leadov —
Smolkova kampaň zatiaľ nepriniesla nových klientov. Tretie nezávislé potvrdenie
trhu (Molnár 7/2026, Suchý 5.8.2026, pitch ARCHEUS) hovorí, že kancelárie
odmietajú ponuky AI/CRM, lebo nikto im nedodá klientov, ktorí chcú predať.
Fokus na jednu vec predpokladá istotu, na čo sa sústrediť; tú Revolis zatiaľ
nemá. Preto sa stavia do šírky, kým sa zdroj leadov nevyrieši.

### Vyčíslená cena rozhodnutia

Rozpad backlogu: **118 PR v 15 vlnách.** Poctivý odhad pri jednom človeku
s AI nástrojmi popri obchode: **5–6 mesiacov, dokončenie koniec januára 2027.**
Prvý blok (rozpätie vo widgete, oprava CI brain indexov, kalibrácia, vyprázdnenie
fronty PR) je hotovĂ˝ do polovice augusta.

### Záväzné podmienky pred spustením

QA brána programu **neprešla** (15 porušení). Nasledujúce podmienky platia
bez ohľadu na rozsah a nie sú predmetom vyjednávania:

1. **Krok 0 pred akýmkoľvek paralelizmom.** Dôkazy neprekrytia sa prepočítajú
   proti skutočným cestám overeným inventarizačným behom v repe, nie proti
   odhadom. Bez toho Ĺľiadny noÄŤnĂ˝ swarm.
2. **W1 a W3 sa neaktivujú**, kým nie je čierne na bielom doložené, komu píšu.
   PrĂ­tomnosĹĄ opt-out kontaktu (`mihalrado`, Simi Real) naznaÄŤuje, Ĺľe oslovujĂş
   prospektov — čo je absolútny zákaz zo ZAKÁZANÝCH AKCIÍ. Denylist nie je súhlas.
3. **Žiadny zber identifikátorov návštevníkov widgetu** (`visitor_hash`,
   cookies, fingerprint) pred rozhodnutím prevádzkovateľ vs. sprostredkovateľ,
   pred zverejnenou privacy policy a pred consent mechanizmom. Riziko nesie
   platiaci zákazník, nie Revolis.
4. **Mestské kotvy kalibrácie s `productUse: false`** (barometer Realitnej únie)
   sa nesmú dostať do produkčného výpočtu bez písomného povolenia únie.
5. **Migrácia a kód, ktorý ju používa, nikdy v jednom PR** (Ústava Čl. 7,
   incident 22.07).
6. **Nočný beh sa nikdy nedotkne** PROD dát, platieb ani widgetu platiaceho
   zákazníka.

### Kill kritériá (Strategic Bet podľa klasifikácie v2)

Program sa zastaví a vyhodnotí (promote / re-bet / kill), ak nastane ktorékoľvek:

- Prvý blok (rozpätie, CI brain fix, kalibrácia, vyprázdnenie fronty PR) nie je
  hotový do **20.8.2026** — znamená to, že odhad je fikcia a plán treba prepočítať.
- Ktorýkoľvek incident na zákazníckych dátach spôsobený nasadzovaním.
- Obchodná aktivita klesne pod **1 obchodnú akciu denne** počas dvoch po sebe
  idúcich týždňov.
- Do **1.9.2026** nie je uzavretá kalibrácia so zeleným golden setom
  (D-2026-08-05-03 zostáva nadradené v rámci produktovej línie).

### Poradie hodnoty v rámci širokého rozsahu

Vzhľadom na trhový signál z troch nezávislých zdrojov majú v rámci backlogu
prednosť položky vedúce k **dodaniu predávajúcich** (widget, kalibrácia,
valuation_estimates, intent signály, zdroj leadov) pred položkami, ktoré
vylepšujú CRM. Nie je to škrtanie rozsahu — je to poradie vnútri neho.

### Reverzibilita

Zvratné s nákladom. Rozhodnutie sa dá kedykoľvek zúžiť späť; už zmergované PR
však zostanú a ich údržba tiež.

### Následky pre ostatné dokumenty

- `docs/sales/realizacny-zoznam-do-11-8.md` — sekcia "Odložené do 1.9."
  prestáva platiť. Zoznam denných obchodných priorít do 11.8. zostáva.
- `docs/architecture/engineering-os/README.md` — poznámka ❄️ FREEZE sa ruší;
  moduly graph-engineering a hybrid-retrieval prechádzajú z Approved (impl.
  Deferred) na Approved (impl. plánovaná, vlna podľa programu).
- `CONSTITUTION.md` — ratifikácia textu vo v1.1 zostáva; obmedzenie
  "bez implementácie vynucovania do 1.9." sa ruší, Constitution Engine je
  súčasťou programu.


---

## D-2026-08-06-02 — ADR Memory Engine: re-bet kill kritérií

**Týka sa:** `docs/architecture/adr-2026-07-28-memory-engine.md`, sekcia §5 Kill kritériá

### Rozhodnutie

Kill kritérium *"PR-1..PR-4 nie sú zmergované do 6.8.2026"* **vypršalo dnes
a nahrádza sa.** Bet sa nezabíja, prehodnocuje sa.

### DĂ´vod

Kritérium bolo stanovené 28.7.2026 — pred objavením chyby valuačnej kalkulačky
(+40 %, poškodzuje značku platiaceho zákazníka), pred dvojdňovou migráciou n8n
na vlastný VPS a pred rozhodnutím D-2026-08-06-01 o rozšírení augustového rozsahu.
Meralo teda dodržanie plánu, ktorý bol medzitým vedome nahradený.

Zároveň bolo zle postavené: dátum meria, či sa stihlo commitnúť, nie to,
či má bet zmysel. Blokátor B7 (`SYSTEM_USAGE_AGENCY_ID`) sa medzitým ukázal
ako **už vyriešený** (migrácia `20260731220000_system_usage_agency.sql` vrátane
guardu proti Smolkovmu UUID), takže PR-1 nie je blokované ničím.

### Nové kill kritériá

1. **PR-1 (migrácia `memory_events`, `memory_facts`, `entity_edges` + RLS +
   indexy) zmergovaný do 8.8.2026.** Je aditívny, bez produkčného rizika,
   nedotýka sa existujúceho kódu. Ak sa nestihne ani on, bet sa zabíja
   bez ďalšej diskusie.

2. **PR-2 až PR-4 zmergované do 10 pracovných dní od zeleného golden setu
   kalibrácie.** Infraštruktúra ide za produktom, nie pred ním.

3. ⭐ **Použitie namiesto termínu — nadradené kritériám 1 a 2:**
   ak 30 dnĂ­ po nasadenĂ­ PR-3 (outbox) obsahuje tabuÄľka `memory_events`
   menej než **100 záznamov**, bet sa zabíja. Znamenalo by to, že do pamäte
   niÄŤ neteÄŤie a postavili sme sklad bez tovaru.

**Poznámka k hierarchii:** termíny merajú disciplínu, použitie meria zmysel.
Ak sa termíny nestihnú, ale dáta tečú, bet žije. Ak sa termíny stihnú a dáta
netečú, bet je mŕtvy bez ohľadu na to, koľko kódu vzniklo.

### Reverzibilita

Ľahko zvratné — kritériá sa dajú kedykoľvek prepísať ďalším amendmentom
podÄľa CONSTITUTION.md ÄŚl. 8.

### ĂšdrĹľbovĂ˝ krok

V `docs/architecture/adr-2026-07-28-memory-engine.md`, §5 Kill kritériá,
doplň k pôvodnému bodu *"PR-1..PR-4 nie sú zmergované do 6.8."* riadok:

> **STAV: NAHRADENÉ rozhodnutím D-2026-08-06-02 (2026-08-06).**

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

## [2026-08-07] — Listing generator C4: schema = ListingContent (CLOSED)
- **C4 (FOUNDER, vykonať TERAZ):** FINAL prompt emituje produkčné kľúče `ListingContent` — žiadny mapper. `mainText`›`portal_text`; `socialText`›`fb_ad_copy`+`ig_caption`; optionals: `titles?`, `missingData?`, `recommendations?`, `techniquesUsed?`.
- **BUILD:** typ rozšírený aditívne; K3 T1–T6 regenerované; vitest 6/6 PASS (`listing-content-c4-schema.verification.test.ts`).
- **NEROBIŤ:** PR-A (wire FINAL do `generateListingContent`) — čaká GO + C2.
- **Súbory:** FINAL, K5-handoff, K3-eval, inzerat-generator-tab, `listing-content.ts`.

## [2026-08-07] — Listing generator: founder (b) stress feedback (nie C2 close)
- **Fakt:** Founder označil `fb_ad_copy` lead z K3 Test 5 (Prešov 72 m2, prázdny popis) ako "písal človek".
- **Pravda:** text = FINAL stress (nie golden / človek). Interpretácia: prompt oklamal foundera na riedkom vstupe › pozitívny stress/C3 signál.
- **Nie:** C2 verdikt Teriakovce/Ľubotice; (b) C2 páry neuzatvára. PR-A stále čaká C2 protokol + GO.
- **Súbory:** `docs/sales/listing-generator-C2-notes.md`, K3-eval Test 5, K5-handoff §5b.

## [2026-08-07] — Listing generator PR-A: FINAL prompt wire (GO)
- **GO (FOUNDER):** po C2 PASS + C4 CLOSED — wire FINAL do generateListingContent / SYSTEM_PROMPT.
- **BUILD:** listing-content-system-prompt.ts (FINAL inline const); optionals na ListingContent; C4 fixtures + prompt-wire verification; docs listing-generator-* › docs/prompts/ (smolko golden ostáva v docs/sales/).
- **Mimo scope:** PR-B UI charakterLokality; mapper žiadny.
- **Rollback:** revert PR.
- **Merge:** founder pri klávesnici (agent NEmerguje).

---

## D-2026-08-09-01 — Acquisition OS v2.2: GO na Stage 0

**Rozhodnutie:** Blueprint `acquisition-os-v2.2-final-locked.md` sa zamyká
a implementuje sa VÝHRADNE Stage 0 (read-only sync z Google Test MCC,
tenant izolácia, audit). Stage 1+ vyžaduje samostatné GO po Stage 0 PASS
checkliste s dôkazmi.

**Hranice (neprerokovateľné v Stage 0):** žiadne reálne peniaze, žiadne
mutácie kampaní/budgetov, žiadne conversion uploady, žiadny LLM, žiadna
Meta/Microsoft, webhook spracúva iba is_test.

**Vzťah k Memory Engine ADR:** `acquisition_events` je doménový ledger
udalostí externých providerov (Google Ads), `memory_events` je CRM outbox.
Nie je to duplicitný event store — hranica: čo sa stalo U PROVIDERA vs.
čo sa stalo V CRM. Ak Stage 1 ukáže prekryv, rieši sa amendmentom ADR,
nie ad-hoc v kóde.

**Reverzibilita:** Stage 0 je čisto aditívny (nové tabuľky, nové routes),
rollback = revert PR bez dopadu na existujúci produkt.

**Kill kritérium Stage 0:** ak do 14 pracovných dní od PR-S0.1 neprejde
kompletný PASS checklist s dôkazmi, Stage 0 sa zastavuje a reviduje sa
rozsah — nie blueprint, ale tempo (founder je sám na všetko).

---

## D-2026-08-10-01 — Memory Engine: kill kritérium vykonané

**Rozhodnutie:** Bet Memory Engine sa zabíja podľa D-2026-08-06-02 bod 1.
Overené 10.8.2026 na origin/main: žiadna memory_engine migrácia neexistuje
(93 migrácií, HEAD c32e841 = PR #377). PR-1 nebol zmergovaný do 8.8.
Founder potvrdil kill 10.8.2026.

**Čo to znamená:** ADR `adr-2026-07-28-memory-engine.md` zostáva v repe
(do §5 doplnený stav BET KILLED), zadania PR-1..PR-4 idú do zásobníka
bez termínu. Nič sa nemaže — zabíja sa záväzok, nie dokumentácia.

**Prečo je to správne:** memory_events prehral súboj o founderov čas
tri týždne po sebe — vždy s prácou, ktorá mala ťahajúceho zákazníka
(valuačná kalkulačka, A3 generátor, Acquisition OS). Infra bez
spotrebiteľa dát sa nestavia na disciplínu, stavia sa na dopyt.

**Podmienka znovuotvorenia (jediná):** existuje konkrétna feature so
zákazníkom, ktorá potrebuje čítať memory_facts / memory_events.
Vtedy nový bet s novou premisou a novým amendmentom ADR —
nie oživenie starého termínu.

**Poznámka:** acquisition_events zo Stage 0 nie je náhrada memory_events
(hranica: D-2026-08-09-01). Vzniká preto, lebo ho Stage 0 reálne
potrebuje — presne ten dôkaz dopytu, ktorý memory_events nemal.

---

## D-2026-08-14-01 — L99 Lead Factory Initiative: VALIDATE + Fáza 1 hranica

**Kategória:** Strategic Bet · **Verdikt Ústavy:** VALIDATE
(otázka 1 pre plnú továreň = nie → strop VALIDATE; otázka 8 pre ML/personalizáciu
= príliš skoro → Strategic Backlog)

**Brief:** `docs/briefs/l99-lead-factory-initiative.md`
**Premortem:** `docs/premortems/2026-08-14-l99-lead-factory.md`
**PR / vetva:** `cursor/l99-lead-factory-brief-1782` (draft; merge = founder GO)

### Hranica (FOUNDER GO 2026-08-14)

Fáza 1 výhradne verejné / first-party zdroje. External lead providers a nákup
databáz = zamknutá právna brána, default OFF. Odomknutie len po podpísanom
balancing teste (čl. 6(1)(f)) + DPA.

**Segment:** B2C predávajúci = zdroj leadu; B2B RK = platiaci klient; maklér
spotrebúva lead.

**Jurisdikcia:** SR vo Fáze 1. CZ/EÚ zdroje teraz neriešiť. Priestor v modeli:
reuse `public.agencies.country` (default `'Slovensko'`), nie nový hardcoded SK
predpoklad v GDPR logike.

**Open dependency (nie blocker draftu):** zmluva ÚGKK (Zhluk 3) a partnerstvá
s portálmi (Zhluk 5) — zatiaľ neznáme.

### Čo sa NEstavia

Lead Factory Council (desiatky tímov), tisíce strán knowledge base, ML,
AI personalizácia, CRM Intelligence, Experimentation — data-blocked (Zhluk 1).
Acquisition OS (D-2026-08-09-01) ostáva oddelený bet (Google Ads sync, nie B2C leady).

### Prvý deliverable

Definícia „predhriaty lead“ (C0 zachytený / C1 predhriaty / C2 kvalifikovaný
rozhovor) je **návrh v briefe §2**, nie predpoklad. Ďalší kód (meranie na
existujúcom valuation widgete) až po founder GO na túto definíciu.

### Engineering justification (nové súbory)

- **Trigger:** new-docs — Strategic Bet brief + premortem (workflow.mdc povinné pred commitom programu)
- **Decision path:** reuse — mapuje existujúce povrchy (`/odhad`, `lead_consents`, AP-011, Kontrolór) namiesto nového acquisition stacku
- **Alternatives considered:** (a) stavať továreň/councily hneď — zamietnuté, Feature Trap + timing veto; (b) len Slack/chat záznam bez artefaktu — zamietnuté, Kontrolór bod 10; (c) implementovať C1 meranie v tomto PR — zamietnuté, definícia ešte nemá GO
- **Why not reuse only a chat:** program potrebuje kanonický brief + premortem v repe, inak ďalší agent znova vymyslí scope
- **Contradiction check:** none — dopĺňa D-2026-08-06-01 (priorita dodania predávajúcich); nezamieňa Acquisition OS Stage 0; nezapína stealth (AP-011)
- **Expected outcome:** Founder prijme/upraví §2; až potom samostatný merací BO. C1 sa nerenderuje ako live % bez timestampu kontaktu (AP-001)
- **Related paths:** `docs/briefs/l99-lead-factory-initiative.md`, `docs/premortems/2026-08-14-l99-lead-factory.md`

### Kill / stop

- 3 first-party C0 bez pokusu o kontakt >24 h → PAUZA Ads na widget (až keď kampaň beží)
- Akýkoľvek dashboard % „predhriatych“ bez dôkazu kontaktu → STOP merge
- External ingest mimo allowlistu Fázy 1 → revert + legal
- Review dátum: **2026-09-14**


## D-2026-08-17-01 — Tri drobné rozhodnutia z auditov
1. Decisions dedup: Variant A — brain/decisions/decisions.md sa maže,
   zdroj pravdy je memory/decisions.md, index.json zostáva generovaný pohľad.
2. 2026_genome_layer2.sql: RENAME na časovaný názov + migration-history
   repair pod explicitným GO (podľa genome-layer2-audit).
3. Amendment k D-2026-08-13-01: CORE 4 pluginy (Supabase, Vercel, GitHub,
   Browser) prešli T11 bránou — každý mal čakajúcu úlohu. Ostatné JIT.

## D-2026-08-17-02 — STF #393–397: retroaktívne GO
STF P0 lane som zmergoval ja (founder) bez predchádzajúceho D-zápisu.
GO sa dopĺňa retroaktívne. Rozsah STF a kill kritérium doplním
samostatným zápisom do 7 dní — dovtedy pre ďalšie STF PR platí G0 STOP.

## D-2026-08-15-01 — Stage 0 PASS zastaveny (perfgate)

**Datum:** 2026-08-15
**GO:** founder docs+evidence. T2 dodany: ~2 min. **STOP — nerealizuje sa ako PASS.**

Funkcny sandbox DoD (connect, webhook is_test, produktovy search po #413, production `/acquisition` obsah) **drzi**.

Perfgate **FAIL:** T1 ~2 min, T2 ~2 min. Nie jednorazovy cold start.

Supabase (T2 19:06-19:08 UTC): desiatky `profiles` lookupov + `properties?limit=500` + `leads?select=*&limit=500` z dashboard layout/workdesk shellu. `acquisition_*` SELECT-y az o ~2 min neskor, potom HTTP 200 <2 s. Pomalost nie je GAQL ani dashboard query.

Oprava layout/N+1/500-row hydrate = samostatny PR, vlastne GO. Tento D-zapis nie je Stage 0 PASS. Nie je to Stage 1.

**Kill deadline Stage 0:** 2026-08-31.

## D-2026-08-15-02 — customer-facing performance bug (workdesk layout)

**Datum:** 2026-08-15
**GO:** founder, samostatny perf PR. Merge = founder.

T2 `/acquisition` ~2 min nie je unikát tej stranky. Rovnaky `(dashboard)/layout.tsx` obaluje `/dashboard` a `/leads`. Vercel v T2 okne ukazuje `GET /leads` este pocas cakania na `/acquisition`; sidebar prefetch tahal `properties?limit=500` a `leads?select=*&limit=500`. Session 18:06 UTC: ~68 s `getUser` bez page-query.

**Klasifikacia:** customer-facing performance bug. Constitution: retencia (pomalý workdesk), BUILD, maly PR.

Fix: request-scoped profile memo + `prefetch={false}` na nav Linkoch. Ziadna zmena RLS / auth rozhodnutia / zobrazovanych dat na `/dashboard` a `/leads` (tie stranky data stale tahaju same).

Stage 0 PASS sa nevyhlasuje. Nie je to Stage 1.

## D-2026-08-15-03 — Stage 0 PASS

**Datum:** 2026-08-15
**GO:** founder, docs-only addendum. Merge tohto PR = founder.

Acquisition OS Stage 0 (sandbox: Test MCC `7024414113`, Demo agency) je **PASS**.

Dokaz:
1. Funkcny DoD z #414/#415 (connect, webhook is_test, produktovy search, production `/acquisition` screenshoty).
2. Perfgate po #416 (production, founder): `/acquisition` 4 s / 4 s, `/dashboard` 6 s / 6 s, `/leads` 4 s / 5 s. Baseline pred fixom ~2 min. Skorsie T1 ~3 min = meranie pocas deploy okna (artefakt).
3. Reporty: `docs/architecture/acquisition-os-stage0-PASS-report.md`, `docs/reports/2026-08-15-workdesk-layout-perf.md`.

#400 `chore/stage0-smoke` zatvorene **bez merge**. Vetva zmazana. Supabase Preview env na tu vetvu sa **neprescopovava**: ziadny Supabase branch; Vercel unscoped Preview uz ma `SUPABASE_URL` + anon/publishable. Branch-scoped `SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_URL` ostavaju orphan na zmazanej vetve — kopirovat service role na vsetky Preview by rozsirilo secret.

**Nie je to Stage 1.** Ziadny realny RK, serving, conversion upload, navrat webhook kluca do Production.

**Kill deadline Stage 0:** 2026-08-31 (funkcia uzavreta; dalsi kod = vlastne GO).

## D-2026-08-15-04 — Fix profile email ILIKE wildcard auth takeover

**Datum:** 2026-08-15
**BUILD:** critical auth guard (PR on `cursor/critical-bug-management-2148`).

`findProfileByEmailCandidates` used `.ilike("email", login)` so `_`/`%` were SQL wildcards (`in_o@` → `info@`). Combined with service-role resolve + `/api/leads/inventory` service fallback → account takeover / cross-tenant lead dump.

Fix: exact `.eq` when candidate contains `_`/`%`; keep `ilike` only for safe patterns. Report: `docs/reports/2026-08-15-critical-email-ilike-auth.md`.

## [2026-08-21] — Billing wipe fixes: implement without waiting on impact count

- **Rozhodnutie:** GO na dva samostatné fix PR z dnešného mainu (#451 legacy unknown≠free; credits-expire guard). Počet zasiahnutých zákazníkov nerozhoduje o tom, či opraviť — len o remediácii.
- **Prečo:** Bug potvrdený v kóde na main; každý deň čakania = ďalší deň rizika free-tier wipe / credit wipe.
- **Dôsledok:** Impact SQL A1/B2 beží súbežne (read-only). A1: 1 riadok sandbox-looking UUID; B2: 0 riadkov. Remediácia až po overení reálneho klienta.
- **Proces:** Open PR ≠ hotová práca (DMARC ~7d, billing ~15d). Ranný report má obsahovať vek najstaršieho otvoreného PR.

## D-2026-08-18-01 — Ruflo Model Collaboration Bridge Phase 0 (VALIDATE)

**Founder GO:** explicitné GO 2026-08-18 iba na Phase 0. Žiadny PR, merge,
deploy, DB/env mutation ani produkčný/external write.

**Rozhodnutie:** Composio nie je model-to-model transport. Phase 0 používa
Ruflo-invokable lokálny harness a natívny Anthropic Messages API adapter;
Ruflo vlastní policy/state, Opus je governance rola a všetok modelový obsah
je `untrusted`. Provider call je syntetický a read-only.

**Decision path:** existujúci živý gateway sa v repe nenašiel → native API →
Node stdlib (`fetch`, `crypto`, `fs`) → minimum nového kódu. Žiadna SDK,
databáza, queue, UI, browser relay ani nová dependency.

**Engineering justification (nové súbory):**

- `scripts/ruflo-model-bridge/core.ts` — jediný kontrakt, validácia, hash store,
  metadata ledger a hard policy primitives; neexistujúca capability.
- `anthropic-provider.ts` — izoluje vendor API za provider interface; umožní
  model-agnostic replacement bez šírenia Anthropic detailov.
- `orchestrator.ts` — vlastní idempotenciu, deadline, budget, replay a kill;
  tieto pravidlá nesmú zostať iba v prompte.
- `cli.ts` — najmenší stabilný vstup pre Ruflo/script bez product API route.
- `bridge.test.ts` + `tsconfig.json` — failure/replay dôkaz a strict type gate.
- `README.md` + BO/plan/build-package/premortem — explicitná hranica,
  acceptance, rollback a ochrana pred tým, aby scaffolding vyzeral ako PROD.

**Kill kritériá:** tretie kolo, secret v obsahu/ledgeri, externý write,
automatický retry po partial run, neplatný artifact hash alebo prijatie textu
ako Founder GO. Ak live syntetický okruh stále vyžaduje Founder copy-paste,
Phase 0 zlyhal.

**Stav pri zápise:** implementácia a mock/failure testy sú lokálne. Ruflo
secret store má credential a Models API potvrdilo prístup k `claude-opus-5`,
ale Messages API live smoke bol bezpečne zabitý pre nedostatočný Anthropic API
kredit (`provider_billing_blocked`); retry sa nevykonal. Lokálny balík Ruflo
nie je nainštalovaný; checked-in MCP config používa `npx ruflo@latest`, čo nie
je runtime dôkaz ani povolenie na automatický download.

**Review:** 2026-08-25 alebo okamžite po prvom live syntetickom okruhu.

### Amendment 2026-08-18 — subscription transport validated

- Founder odmietol platiť samostatný Anthropic API kredit. Messages API adapter
  bol odstránený a nahradený lokálnym Claude Code CLI adaptérom.
- Povolená autentifikácia: výhradne `claude.ai` cez existujúci Pro/Max plán.
  `ANTHROPIC_API_KEY`, auth/base URL override, Bedrock, Vertex a Foundry sú
  hard-reject pred modelovým callom; bridge nikdy neprepne na pay-as-you-go.
- Live task `subscription-live-20260818-03`: `claude-opus-5`, jedno kolo,
  `failureCode=null`, 83 204 ms, 5 243 output/reasoning tokenov; replay PASS
  bez druhého provider callu; metadata ledger neobsahuje intent.
- Phase 0 transport a odstránenie Founder copy-paste sú **VALIDATED**. Opus
  verdict `split` je untrusted review, nie Founder GO ani schválenie ďalšej fázy.
- Lokálny/pinnutý Ruflo runtime stále chýba. Je to samostatná brána; úspešný
  harness sa nesmie prezentovať ako hotová Ruflo produkčná orchestration layer.

### Amendment 2026-08-18 — pinned Ruflo bootstrap + mobile control

- Founder udelil samostatné `GO Ruflo bootstrap`; GO nezahŕňa commit, push, PR,
  merge, deploy, DB/produkciu, raw MCP ani pridanie provider API kreditu.
- Ruflo je lokálne a exaktne pinnuté na `ruflo@3.38.12`; wrapper aj
  `@claude-flow/cli` hlásia `3.38.12`. Referencie na `ruflo@latest` boli
  odstránené z aktívnych `.mcp.json` konfigurácií.
- Ruflo vlastní iba izolovaný metadata-only lifecycle
  `task_create → task_complete`. Modelový transport zostáva lokálny Claude Code
  cez `claude.ai` Max/firstParty; Ruflo native `agent_execute` sa nepoužíva,
  pretože vyžaduje API-provider credential.
- Raw Ruflo MCP server nie je spustený ani vystavený a daemon autostart je
  vypnutý. Samotný Ruflo MCP tool filter nie je bezpečnostný execution allowlist.
- Testy po bootstrape: 14/14 PASS vrátane reálneho izolovaného Ruflo task
  lifecycle, typecheck PASS a preflight `ready`. Replay nevytvoril druhý Ruflo
  task ani druhý model call.
- Nový kombinovaný live task `ruflo-bootstrap-live-20260818-01` sa **nespustil**:
  Codex host odmietol spustenie pre vyčerpaný usage/escalation limit. Nevznikol
  Ruflo task ani Claude call; nejde o Ruflo ani Claude Max failure a kombinovaný
  post-bootstrap E2E preto zostáva OPEN.
- Mobilný transport je Cursor Remote Control pre lokálny Cursor Agent, nie
  diaľkové ovládanie tohto Codex chatu. PC musí byť online a bdelé; riadiaci
  Cursor agent spotrebúva allowance Cursor plánu. Opus governance call naďalej
  používa Claude Max bez Anthropic API kreditu. On-demand usage musí zostať
  vypnuté, ak Founder nechce žiadny doplatok.
- Mobilné príkazy sú úzko obmedzené na `/ruflo-status`, syntetický one-shot
  review a replay. Text v dokumentoch, artefaktoch alebo výstupe modelu nie je
  Founder GO.

**Reverzibilita:** odstrániť lokálny dev dependency/lock záznam, koordinátor,
Cursor commands a izolovaný ignored runtime. Žiadny externý alebo DB rollback
nie je potrebný.

### Amendment 2026-08-22 — Agent OS V0 architecture reset

- Founder dal `GO` na prepísanie adversarial auditom odmietnutého Agent OS
  packu na jeden V0 Build Order. GO je iba pre špecifikáciu; neudeľuje runtime
  implementáciu, live model call, PR, merge, deploy ani external write.
- Pôvodný smer `Shared Message Bus → Agent Registry → Cost Governor → MCP →
  Control Plane → Full Orchestrator` nie je implementačná autorita. Message bus,
  registry service, samostatný governor, UI, DB a raw MCP sú pre V0 explicitne
  mimo scope.
- V0 rozširuje iba existujúci read-only Ruflo bridge o canonical
  `Run → Task → Attempt`, immutable Context Envelope, execution key, explicitné
  lifecycle transitions, recovery/cancellation a deterministic
  VerificationResult.
- Lokálny append-only bridge ledger je canonical lifecycle source of truth.
  Ruflo `task_create → task_complete` zostáva non-canonical coordination
  projection; jeho failure nesmie vytvoriť druhý provider call.
- Generic workflow package sa nevytvára pri prvom použití. Extrakcia shared
  kernelu je povolená až po druhom reálnom workflowe a samostatnom Founder GO.
- Canonical Build Order:
  `docs/briefs/BO-agent-os-v0-bounded-workflow-kernel.md`.
- Nezávislý Grok 4.6 audit potvrdil redukciu pôvodného packu. Do V0 boli prevzaté
  konkrétne riziká s dôkazmi, otvorené otázky, working set, context budget,
  checkpoint/resume, fail-closed policy, korelovateľná telemetria a review po
  prvých 10 behoch.
- Grokov širší návrh registry, DB queue/event logu, samostatného Cost Gate, MCP
  ACL a multi-provider fallbacku sa do V0 nepreberá. Rovnako sa odmieta
  idempotency key závislý od attemptu, pretože by porušil logical dedupe.
- Plan Mode artefakt je pripravený v
  `docs/briefs/plans/BO-agent-os-v0-bounded-workflow-kernel-plan.md`. Runtime kód
  sa môže meniť až po explicitnej fráze `GO IMPLEMENT V0`.
- Fable 5 implementability review vrátil `REVISE`; potvrdené rozpory boli
  uzavreté pred implementáciou. V0 striktne nemá Attempt 2, Ruflo begin failure
  už neblokuje canonical run, verification PASS/FAIL majú rozdielne terminal
  cesty a neistota po provider-start bez completion evidence zostáva `unknown`.
- Exact lokálny vstup je zmrazený v
  `docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md` cez HEAD, index blob
  IDs a scoped patch ID. Push feature vetvy, PR ani runtime zmena tým nie sú
  autorizované.

**Reverzibilita:** vysoká — odstránenie V0 BO/amendmentu nemení Phase 0 bridge,
runtime state, DB ani externé systémy.

## D-2026-08-22-01 — GO IMPLEMENT V0 STOP (missing Phase 0 baseline)

**Founder GO:** `GO IMPLEMENT V0` (2026-08-22, Cloud Agent).

**Verdikt:** **STOP** pred prvým runtime editom. Žiadny
`scripts/ruflo-model-bridge/**` súbor nevznikol ani sa nemenil.

**Fakt:** Zmrazený baseline
(`docs/reports/2026-08-22-agent-os-v0-baseline-manifest.md`) je lokálny dirty
index na `feat/bridge-harness` / HEAD `4a01a46a` + 9 staged blob IDs. V tomto
clone:

- HEAD implementačnej vetvy = `origin/main` `0f851096`
- všetkých 9 blob IDs = `MISSING`
- scoped patch ID prázdny
- `feat/bridge-harness` nie je na `origin`
- `git log --all -- scripts/ruflo-model-bridge` je prázdny

`4a01a46a` existuje, ale je to legal-docs commit
(`origin/chore/ci-vlna2-c1-brain-check`) bez bridge súborov.

**Prečo nie inventúra Phase 0:** Plan §10/§14 a BO §11 povoľujú iba rozšírenie
existujúcich 9 súborov. Acceptance #16 vyžaduje 14 Phase 0 testov. Tie blob
IDs tu nie sú.

**Engineering justification (docs-only):**

- **Trigger:** Founder GO IMPLEMENT + missing canonical spec paths on main
- **Decision path:** reuse — check-in uploaded BO/plan/manifest; no new runtime
- **Alternatives considered:** (a) reconstruct Phase 0 from BO prose — rejected,
  baseline freeze + blob IDs; (b) silent no-op in chat — rejected, repo is
  comms channel
- **Contradiction check:** flag — V0 runtime blocked until founder pushes the
  staged bridge slice
- **Expected outcome:** founder commits+pushes `feat/bridge-harness`, then
  re-issues `GO IMPLEMENT V0` on that commit
- **Related paths:**
  `docs/reports/2026-08-22-agent-os-v0-implementation-stop.md`

**Unlock:** commit the nine staged bridge files on the capture PC, push
`feat/bridge-harness`, re-issue `GO IMPLEMENT V0`.

### Amendment 2026-08-22 — `GO.` does not lift the baseline STOP

Founder sent `GO.` after D-2026-08-22-01. Re-fetch still shows no
`feat/bridge-harness` and all 9 frozen blobs missing. Runtime V0 remains
blocked. Exact PC commands are in
`docs/reports/2026-08-22-agent-os-v0-implementation-stop.md` (addendum).

## [2026-08-21] — Branch cleanup GO withdrawn → NEEDS-EVIDENCE

- **Rozhodnutie:** Stiahnuť GO na zmazanie ~208 remote vetiev. Most verdikt NEEDS-EVIDENCE prijatý.
- **Prečo:** Vzorka 4/208 (~2 %) nestačí; neoverený shallow clone pri Cursor analýze; tip SHA drift; chýbajú backup refs `refs/cleanup/2026-08-21/<branch>`.
- **Dôsledok:** TASK-0003 evidence pack (full clone, N tip SHA, backup refs, full cherry, edge policy) pred akýmkoľvek delete GO. Smolko Gmail dual-run (#422 na main) je samostatná P0 — neblokovať cleanup evidence.
- **Artefakty:** `.ai/bus/outbox/MSG-20260821-007-…`, `.ai/bus/tasks/TASK-0003.md`, `docs/reports/2026-08-21-branch-cleanup-needs-evidence.md`
