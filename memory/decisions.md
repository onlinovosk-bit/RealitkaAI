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
## [2026-06-04] - Arbitrage analyze: `empty` vs `source` (PR-3)
- **Poznámka (nie bug):** Prázdny scan vracia `empty: true` + `source: 'live'`, nie `source: 'empty'`. UI spolieha na `empty`, nie na literal `'empty'`. Ak niečo neskôr filtruje `source === 'empty'`, nenájde to — stealth-recruiter používa `'empty'` inak.
- **Cron / copy:** Hobby Vercel = denné sloty v `apps/crm/vercel.json` (#96). UI copy v `ArbitrageDashboard` zosúladené na „raz denne“ (lokálne, čaká malý PR).
- **Auto-deploy:** Po merge #96 production deploy `realitka-rcsem38y0` (~5 min) — Git hook funguje; predtým blokoval aj Hobby `*/6` validácia. Sledovať „Ignored Build Step“, ak sa znova canceluje preview/prod.

## [2026-06-04] - v1 scope + nav inventúra (post PR-3)
- **v1 = CRM + AI jadro** (LIVE: leady, triáž, call analyzer, playbook, Realvia). Trhový feed (`portal_listings` bridge) → backlog **post-v1**, nie teraz. Arbitráž = úprimný prázdny modul.
- **Nav /arbitrage:** V `lib/navigation.ts` NAV_ITEMS existuje, ale chýbal v `NAV_GROUPS` (legacy sidebar). Workdesk (`AppSidebar`) číta `types/navigation.ts` `ALL_NAV_ITEMS` — tam položka **chýbala úplne** (nie tier gate). Oprava: pridať do `ALL_NAV_ITEMS` + `NAV_GROUPS.arbitrage`.
- **Plán + rola (P0 backlog):** Smolko screenshot = `agent_solo` (Active Force + Maklér) namiesto `owner_vision` + Market Vision. `enforceSmolkoOwnerDefaults` v kóde existuje — overiť, či beží na prod (profil lookup / email / deploy). Dôležitejšie než arbitráž link.
---
