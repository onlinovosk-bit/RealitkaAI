# REVOLIS Agentic Prompt Stack v1.0
## API Cost Governor + najvyššia prioritná engineering úloha

**Status:** uložené v repozitári 2026-10-15. Implementácia je úzka vrstva v `packages/bus-core/src/cost-governor.ts`, nie globálny orchestrátor.  
**Repo:** `onlinovosk-bit/RealitkaAI`  
**Odporúčaná cesta:** `docs/prompts/agentic/revolis-api-cost-governor-stack-v1.0.md`  
**Jazyk výstupov:** slovenčina; technické identifikátory a kód ponechať v pôvodnom tvare.

---

## 1. Účel

Jeden meta-prompt má spustiť riadený pracovný cyklus, ktorý:

1. načíta aktuálnu pravdu z repozitára a existujúce governance pravidlá;
2. aktivuje/implementuje REVOLIS API COST GOVERNOR v1.0 v najmenšom bezpečnom rozsahu;
3. pred každou platenou AI úlohou vynúti rozpočet, oprávnenie, modelovú politiku a hard stop;
4. zaznamená odhadované aj skutočné náklady a výsledok úlohy;
5. otestuje ochranné pravidlá aj zlyhania;
6. nezávisle overí zmeny;
7. až potom vyberie a vykoná **jednu** najvyššie prioritnú ďalšiu engineering úlohu pre Revolis.AI podľa aktuálnych dôkazov;
8. vytvorí reprodukovateľné dôkazy a zastaví sa na hranici Founder approval.

Toto je **agentický workflow a pracovný kontrakt**, nie tvrdenie, že Governor už existuje alebo že agenti bežia autonómne v produkcii.

## 2. Záväzné princípy

- **Extend, do not replace:** použiť existujúci `packages/bus-core/`, `scripts/bus/`, `.ai/bus/` a `packages/control-contract/`; nevytvárať druhý Bus, runner ani Control Plane.
- **Fail closed:** neznámy rozpočet, neznámy model, neznáma cena, neplatná konfigurácia alebo chýbajúca telemetria nesmú viesť k neobmedzenému platenému volaniu.
- **No silent escalation:** zlyhanie lacnejšieho modelu nesmie automaticky spustiť drahší model bez výslovného pravidla v schválenej politike a dostupného rozpočtu.
- **No autonomous budget expansion:** agent nesmie zvýšiť per-task/day/month limit, zapnúť auto-reload, kúpiť kredity ani meniť poskytovateľský billing.
- **Human gate survives:** `GO REQUIRED` a `STOP` sa nikdy nesmú zmeniť na povolenie iba preto, že správa bola potvrdená alebo prevzatá.
- **Keep capability boundaries:** dodržať `AUTO-SAFE`, `READ_ONLY`, allowlist schopností, kill switch a existujúce identity pravidlá.
- **No production side effects:** bez samostatného Founder GO nevykonávať deploy, merge, produkčné migrácie, zmeny produkčných secrets/env, platobné operácie ani externé správy.
- **Evidence over claims:** odlíšiť `CODE`, `TESTED`, `MERGED`, `DEPLOYED` a `PRODUCTION-VERIFIED`. Nikdy ich nezamieňať.
- **Measured value:** merať cenu za úspešne dokončenú úlohu, nie iba cenu za token.
- **Bounded work:** jedna primárna úloha na iteráciu; najviac dva opravné cykly; potom STOP s konkrétnym blockerom.

## 3. Kontext, ktorý treba overiť pri každom spustení

Pred prácou načítaj minimálne:

- `CLAUDE.md`, `.cursor/rules/` a príslušné engineering governance dokumenty;
- `.ai/bus/README.md`, `.ai/bus/AGENT_PROTOCOL.md`, `.ai/bus/message.schema.md`;
- `docs/architecture/agentic-system-inventory.md`;
- `docs/architecture/l99-parked-concepts.md`;
- `docs/reports/2026-09-30-rau-w0-reality-audit.md`;
- `packages/bus-core/src/execution-cap.ts`;
- `scripts/bus/consume.ts`;
- `apps/crm/src/lib/ai/llm-usage-cost.ts` a súvisiace cost telemetry súbory;
- `memory/open-tasks.md`, aktuálne otvorené PR/CI a posledné rozhodovacie záznamy.

Ak cesta neexistuje alebo sa stav líši, zaznamenaj to ako zistenie. Historický dokument nie je dôkazom dnešného produkčného stavu. Najprv over aktuálny branch, HEAD, čistotu worktree, otvorené zmeny, CI a existujúce blokery. Nikdy neprepisuj cudzie rozpracované zmeny.

### Známe východiskové signály, ktoré sa musia znovu overiť

- BUS/Runner/Control Contract už existujú a treba ich rozšíriť.
- `scripts/bus/consume.ts` bol inventarizovaný s hard-coded default modelom `sonnet`.
- `packages/bus-core/src/execution-cap.ts` obsahuje limit počtu vykonaní, nie plnohodnotný USD limit.
- CRM nákladové odhady v `llm-usage-cost.ts` boli označené ako potenciálne zastarané; nepoužívaj ich ako pravdivý aktuálny cenník bez verifikácie.
- `docs/architecture/l99-parked-concepts.md` predtým odložil plný Model Router + Cost Governor do času merania nákladov. Tento Founder GO povoľuje úzky Governor pre riadenie agentických API úloh, ale **neoprávňuje** automaticky postaviť rozsiahly router, nové orchestrácie ani produkčné zmeny.
- `memory/open-tasks.md` historicky evidoval produkčný Stripe checkout blokovaný chýbajúcimi seat price IDs. Agent nesmie vytvárať alebo hádať Stripe price IDs a nesmie meniť produkčné env. Aktuálny stav sa musí overiť.

## 4. Roly a poradie

Použi role ako logické fázy; nepredstieraj, že ide o nezávislé fyzické agenty, ak runtime nevie preukázať ich oddelenie.

1. **Architect / Planner** — read-only audit, závislosti, plán, risk register, rozpočet.
2. **Governor / Policy Gate** — vyhodnotí task contract a rozhodne `ALLOW`, `WARN`, `DOWNGRADE`, `ESCALATE` alebo `BLOCK`.
3. **Coder / Builder** — vykoná iba schválený rozsah a len na pracovnej vetve.
4. **Independent Verifier** — kontroluje diff a spúšťa relevantné testy; nesmie len zopakovať tvrdenia implementátora.
5. **Reviewer / Red Team** — hľadá obídenie limitov, tiché fallbacky, nesúlad s BUS a nebezpečné side effects.
6. **Founder Gate** — vyžiada schválenie iba pre rozhodnutia, ktoré skutočne vyžadujú človeka; nikdy ho neimituje.

Ak runtime neposkytuje nezávislé roly, označ fázy ako sekvenčné self-review a túto limitáciu uveď v reporte.

## 5. REVOLIS API COST GOVERNOR v1.0 — kontrakt

### 5.1 Rozhodnutia

Governor musí vrátiť jedno z:

- `ALLOW` — úloha je autorizovaná a rozpočet je v limite;
- `WARN` — úloha môže pokračovať iba v rámci už schváleného limitu, ale spotreba sa blíži k prahu;
- `DOWNGRADE` — navrhni lacnejší model, ktorý spĺňa požadovanú kvalitu;
- `ESCALATE` — vyžiadaj explicitné ľudské rozhodnutie;
- `BLOCK` — nevolaj poskytovateľa.

Rozhodnutie musí obsahovať `task_id`, dôvod, rozpočet, odhad ceny, model/provider, dostupný spend budget, policy version a auditný timestamp.

### 5.2 Povinný Task Contract

Pred platenou úlohou vyžaduj:

- `task_id` / correlation ID;
- účel a typ úlohy;
- requester/agent identity;
- risk class a capabilities;
- povolený provider/model alebo triedu modelov;
- odhad input/output tokenov a ceny;
- `max_cost_usd` pre úlohu;
- zostávajúci denný a mesačný budget;
- očakávaný výstup a akceptačné kritériá;
- povolené nástroje a externé side effects;
- požadovanú approval gate;
- timeout, max retries a stop conditions.

Ak povinné pole chýba, výsledok je `BLOCK` alebo `ESCALATE`, nie neobmedzený odhad.

### 5.3 Rozpočtové vrstvy

Implementuj samostatné limity:

1. `per_task_usd`;
2. `daily_usd`;
3. `monthly_usd`;
4. voliteľne `provider_usd` a `model_usd`, iba ak ich možno vynútiť deterministicky.

Konkrétne čísla musia byť konfigurovateľné a zdokumentované. Nepovažuj automaticky celý bonus 100 USD v Claude Console za rozpočet, ktorý možno minúť. Oddeľ:
- promotional credit;
- zakúpené kredity;
- provider billing/spend limit;
- interný Governor budget.

Ak sa zdroj kreditu alebo dostupný zostatok nedá programovo spoľahlivo zistiť, uveď ho ako externý stav a používaj konzervatívny interný limit. Neodvodzuj dostupný budget iba z tokenov.

### 5.4 Odhad a skutočné náklady

Každý záznam musí odlíšiť:

- `estimated_cost_usd`;
- `actual_cost_usd` (iba z dôveryhodnej usage/billing odpovede);
- `cost_source` a `cost_confidence`;
- `input_tokens`, `output_tokens`, cache tokens, ak ich provider vracia;
- `provider`, presný `model_id`, dátum a pricing version/source;
- `latency_ms`, success/failure, retry count;
- task type, task ID, result/evaluation status.

Nikdy neukladaj odhad ako skutočný náklad. Ak provider nevráti cenu, zaznamenaj `actual_cost_usd = null` a dôvod. Ak usage metriky chýbajú, označ záznam ako incomplete; nepoužívaj nulu ako predstieraný dôkaz nulovej ceny.

### 5.5 Model routing

- Najprv klasifikuj typ a náročnosť úlohy.
- Vyber najlacnejší model, ktorý spĺňa kvalitatívne a bezpečnostné kritériá podľa doloženej politiky.
- Neuvádzaj ceny modelov z pamäti. Over aktuálny cenník dodávateľa v deň implementácie alebo používaj jasne označený konfigurovaný cenník s dátumom.
- Nepovoľuj automatický prechod na drahší model po chybe bez rozpočtovej rezervy a explicitného routing pravidla.
- Model fallback nesmie obísť `max_cost_usd`.
- Model Router je v1 iba tenká politika; žiadny nový DAG orchestrátor ani agent factory.

### 5.6 Stop conditions

Okamžite zastav nové platené volania, keď:

- task/day/month limit dosiahne hranicu;
- cena alebo identita modelu nie je známa a policy neumožňuje bezpečný odhad;
- došlo k neočakávanému model/provider fallbacku;
- zlyhá cost ledger alebo policy config;
- task žiada nepovolenú capability alebo externý side effect;
- príde `STOP`, kill switch alebo `GO REQUIRED`;
- počet retry prekročí schválený limit.

Už rozbehnuté volanie nemusí byť možné zrušiť. Uveď to v dokumentácii a testuj, že po jeho dokončení sa nezačne ďalšie volanie.

## 6. Implementačný plán v etapách

### Fáza 0 — preflight a scope

- over HEAD, branch, worktree a otvorené PR;
- načítaj governance, inventár, backlog, CI a test scripts;
- nájdi všetky call sites, ktoré by mali prechádzať cez Governor;
- zisti, či je úloha len dokumentácia, testovací prototyp alebo skutočná integrácia;
- urč explicitne čo sa do tejto vlny nezmestí;
- priprav Task Contract a predbežný rozpočet.

**Exit:** audit s odkazmi na konkrétne súbory a návrh minimálneho diffu. Žiadne zmeny runtime pred týmto bodom.

### Fáza 1 — Governor v1 minimálna implementácia

- vytvor/rozšír pure policy module pre `ALLOW/WARN/DOWNGRADE/ESCALATE/BLOCK`;
- rozšír existujúci execution cap o USD budget alebo pridaj tenkú vrstvu vedľa neho; nevytváraj paralelný runner;
- konfigurácia musí mať validáciu, bezpečné defaulty a explicitnú verziu;
- napoj najmenší bezpečný call path, ktorý možno otestovať bez produkčných secrets;
- pridaj ledger s jasným rozdielom medzi odhadom a actual usage;
- v prípade chyby ledgeru alebo policy fail-closed.

**Exit:** policy funguje deterministicky v unit testoch a chráni aspoň jeden jasne definovaný call path; nevyhlasuj systém za globálne aktívny, ak ostatné call sites nie sú pokryté.

### Fáza 2 — Testy a red-team

Minimálne testuj:

1. task pod limitom → `ALLOW`;
2. blížiaci sa limit → `WARN`;
3. drahší model možno nahradiť vhodným lacnejším → `DOWNGRADE`;
4. chýbajúci budget alebo neznáma cena → `BLOCK`/`ESCALATE`;
5. prekročený task/day/month limit → `BLOCK`;
6. model fallback nesmie prekročiť budget;
7. paralelné úlohy nevedia súčasne minúť rovnaký zvyšný rozpočet nad limit;
8. ledger nedostupný → fail-closed;
9. odhad ceny sa nikdy neukladá ako actual;
10. retry limit a timeout;
11. `GO REQUIRED` prežije ack a handoff;
12. `STOP` a kill switch blokujú ďalšie volania;
13. nepovolené capabilities a produkčné side effects sú odmietnuté;
14. config má neplatný formát alebo chýbajúcu verziu;
15. žiadny test nevyžaduje reálne platené API volanie.

Spusti relevantné unit tests, typecheck, lint a príslušné CI checks podľa repo kontraktu. Zaznamenaj príkazy aj exit codes. Neuvádzaj PASS, ak test nebol spustený.

### Fáza 3 — nezávislá kontrola

Verifier musí preskúmať:

- či existuje cesta k platenému volaniu mimo Governor;
- či sú limity kontrolované atomicky/bez race condition;
- či sa budget resetuje v správnej časovej zóne;
- či sa nula nepoužíva namiesto chýbajúcich údajov;
- či model fallback neobchádza limity;
- či sa secrets alebo citlivé payloady nezapisujú do ledgeru;
- či sa existujúce BUS a Control Contract pravidlá nemenia;
- či dokumentácia nezamieňa implementované a iba navrhnuté komponenty.

Najviac dva opravné cykly. Ak sa po dvoch cykloch stále nedá dosiahnuť acceptance, `STOP` a report.

### Fáza 4 — výber ďalšej najdôležitejšej úlohy Revolisu

Po Governor testoch znovu vyhodnoť aktuálny backlog a aktuálne produkčné dôkazy. Zoraď kandidátov podľa:

1. blocker brániaci získaniu príjmu alebo zákazníkovi;
2. bezpečnosť, strata dát alebo compliance;
3. produkčná funkčnosť a spoľahlivosť;
4. kritická testovateľnosť / chýbajúce observability;
5. úspora nákladov, až keď existujú merania;
6. nové funkcie a optimalizácie.

Každému kandidátovi priraď:
- business impact;
- naliehavosť;
- confidence v dôkazoch;
- závislosti;
- riziko a rollback;
- odhad práce a API budget;
- akceptačné kritériá;
- či potrebuje Founder GO.

**Predbežný kandidát na opätovné overenie:** `CHECKOUT-ENV-01` – produkčný seat checkout bol v `memory/open-tasks.md` evidovaný ako blokovaný chýbajúcimi Stripe price IDs. Ak je to stále aktuálne, príprava má byť read-only: overiť report/skript a pripraviť presný founder checklist. Agent nesmie vytvárať Stripe ceny, hádať price IDs ani meniť produkčné env. Ak je blocker už vyriešený, vyber ďalšiu úlohu podľa aktuálnych dôkazov.

Ďalšia kandidátna závislosť: CRM cost telemetry a jej produkčné migrácie boli historicky označené ako neoverené. Migrácie do produkcie sa nesmú aplikovať bez samostatného explicitného GO.

### Fáza 5 — PR/evidence a stop

- vytvor zmeny iba na samostatnej pracovnej vetve;
- prilož test report, diff summary, riziká, budget telemetry a presné acceptance results;
- PR môže byť otvorený iba ak to aktuálne oprávnenia a repo pravidlá umožňujú;
- nikdy nemerguj, nenasadzuj ani nespúšťaj produkčné migrácie bez samostatného Founder GO;
- ak GitHub/CI/runtime prístup zlyhá, zaznamenaj presnú chybu a pokračuj iba s bezpečnými lokálnymi artefaktmi;
- nikdy netvrď, že súbor, commit, branch, PR, test alebo deploy existuje, ak to nie je overené.

## 7. Akceptačné kritériá v1.0

Governor môže byť označený ako **CODE-IMPLEMENTED / TEST-PASS** iba vtedy, ak:

- [ ] Task Contract sa validuje pred plateným volaním.
- [ ] Task/day/month limity sa vynucujú deterministicky.
- [ ] Unknown cost/budget a policy failure vedú k fail-closed.
- [ ] Routing/fallback nemôže obísť rozpočet.
- [ ] Estimate a actual cost sú oddelené.
- [ ] Ledger obsahuje task ID, model/provider, usage, cost source, výsledok a timestamp.
- [ ] Kritické guardrails majú unit tests vrátane paralelnej spotreby.
- [ ] Existujúce BUS gates a capabilities zostali zachované.
- [ ] Nezávislý reviewer skontroloval diff.
- [ ] Testy boli reálne spustené a report obsahuje príkazy a výsledky.
- [ ] Dokumentácia jasne vymedzuje call paths, ktoré ešte Governor nepokrýva.
- [ ] Žiadny production side effect neprebehol bez samostatného schválenia.

Nepoužívaj formuláciu „Governor je aktívny v celom Revolise“, kým nie sú preukázané všetky relevantné call paths.

---

# 8. JEDEN META-PROMPT NA SPUSTENIE CELÉHO WORKFLOWU

Skopíruj celý text medzi značky do Claude Code/Cursor alebo do existujúceho Revolis agentického vstupného bodu:

```text
REVOLIS META-PROMPT — API COST GOVERNOR v1.0 + NEXT BEST ENGINEERING TASK

AUTHORITY
Founder GO: aktivovať a implementovať úzky REVOLIS API COST GOVERNOR v1.0 a po jeho overení vybrať a vykonať jednu najvyššie prioritnú ďalšiu engineering úlohu Revolisu. Toto GO NIE JE povolenie na merge, deploy, produkčné migrácie, zmeny produkčných secrets/env, nákup kreditov, auto-reload ani externé platobné operácie.

PRIMARY OBJECTIVE
Dosiahni najmenšiu bezpečnú, otestovanú a auditovateľnú implementáciu Governor, ktorá pred plateným AI volaním vynucuje autorizáciu, per-task/day/month budget, model policy a hard stops. Potom na základe aktuálnych dôkazov vykonaj jednu ďalšiu prioritnú úlohu v architektúre/testovaní/buildingu Revolis.AI.

MANDATORY PREFLIGHT
1. Over repo, HEAD, branch, dirty worktree, otvorené PR, CI, existujúce zmeny a blockers.
2. Prečítaj CLAUDE.md, relevantné .cursor/rules, .ai/bus/AGENT_PROTOCOL.md, .ai/bus/message.schema.md, docs/architecture/agentic-system-inventory.md, docs/architecture/l99-parked-concepts.md, docs/reports/2026-09-30-rau-w0-reality-audit.md, packages/bus-core/src/execution-cap.ts, scripts/bus/consume.ts, relevantné cost telemetry súbory a memory/open-tasks.md.
3. Znovu over aktuálny stav každého historického blockeru. Starý dokument nie je dôkazom aktuálnej produkcie.
4. Zastav sa pred zmenou, ak by si prepísal cudzie necommitnuté zmeny, nevieš určiť bezpečný scope alebo chýba oprávnenie.

ARCHITECTURE RULES
- Rozšír existujúci BUS/Runner/Control Contract; nevytváraj paralelný orchestrátor.
- Zachovaj AUTO-SAFE, READ_ONLY, capability allowlist, GO REQUIRED, STOP a kill switch.
- Governor musí rozhodovať ALLOW/WARN/DOWNGRADE/ESCALATE/BLOCK.
- Každá platená úloha má validovaný Task Contract s task_id, requester, purpose, risk, model/provider, estimated cost, max_cost_usd, daily/monthly remaining budget, acceptance criteria a approval gate.
- Oddel estimated_cost_usd od actual_cost_usd; nikdy nezapisuj odhad ako skutočnú spotrebu.
- Neznámy budget/cena, zlyhanie policy/ledger alebo prekročenie limitu => FAIL CLOSED.
- Žiadny silent model escalation, žiadne autonómne zvýšenie budgetu, žiadny auto-reload ani nákup kreditov.
- Nepovažuj bonus 100 USD v Claude Console za schválený spend target; udrž interné limity explicitné a konfigurovateľné.
- Nepoužívaj neoverené/stale ceny modelov ako pravdivý cenník.
- Ak nevieš bezpečne kontrolovať všetky call paths, implementuj len úzky preukázateľný scope a označ nepokryté cesty.

WORK SEQUENCE
A. Architect: vytvor read-only mapu call paths, rizík, závislostí, navrhovaného diffu a Task Contractu.
B. Governor: schváľ alebo zablokuj samotnú implementačnú úlohu podľa budget policy. Odhadni cost; ak nie je spoľahlivý, použi konzervatívny strop a nevolaj nekontrolovaný platený model.
C. Builder: implementuj najmenší bezpečný Governor v pracovnej vetve; žiadne produkčné side effects.
D. Verifier: spusti relevantné unit tests, typecheck, lint a repo-mandated checks. Over všetky failure/limit/fallback/parallel-race scenáre bez platených live API calls.
E. Red Team: nezávisle skontroluj bypass, concurrency, reset intervaly, secret leakage, stale pricing, nepravdivé actual-cost hodnoty a porušenie BUS gate.
F. Oprav maximálne dva razy. Ak kritický test zlyhá alebo scope nie je bezpečný, STOP s presným dôkazom.
G. Po PASS znovu načítaj backlog a aktuálne dôkazy. Vyber JEDNU najvyššie prioritnú ďalšiu úlohu podľa business blocker > security/data integrity > production reliability > observability > measured cost optimization > new features.
H. Historický CHECKOUT-ENV-01 musí byť najprv overený. Ak stále blokuje seat checkout, priprav bezpečný read-only founder checklist; nevytváraj Stripe price IDs a nemen produkčné env. Ak je vyriešený, vyber ďalší kandidát na základe aktuálnych dôkazov. Produkčné migrácie alebo secrets vyžadujú samostatné Founder GO.
I. Vykonaj iba tú jednu vybranú úlohu v rámci bezpečných oprávnení; ak vyžaduje Founder rozhodnutie, priprav rozhodovací balík a STOP.

OUTPUTS REQUIRED
1. Preflight report s HEAD/branch/worktree a aktuálnymi blockers.
2. Task Contract a schválený budget.
3. Zoznam zmenených súborov a architektonický dôvod.
4. Test report s presnými príkazmi, exit codes a PASS/FAIL/SKIPPED.
5. Cost ledger sample/test fixtures s estimated vs actual jasne oddelenými.
6. Red-team findings a ich uzavretie.
7. Vyhodnotenie kandidátov na ďalšiu úlohu a dôvod výberu jednej.
8. Acceptance matrix.
9. Zvyšné riziká, nepokryté call paths a potrebné Founder approvals.
10. Presný status: DOCS-ONLY / CODE-IMPLEMENTED / TEST-PASS / PR-OPEN / MERGED / DEPLOYED / PRODUCTION-VERIFIED. Označ iba stav podložený dôkazom.

STOP RULES
- STOP pri neznámom oprávnení, budgete alebo produkčnom stave.
- STOP pri požiadavke na merge/deploy/produkčnú migráciu bez samostatného GO.
- STOP pri Stripe, platobných, billing alebo secret zmenách, ktoré vyžadujú Foundera.
- STOP pri kritickom test failure po dvoch opravách.
- STOP ak jediný spôsob pokračovania obchádza Governor alebo existujúce governance.
- Nikdy netvrď, že branch/commit/PR/test/deploy existuje, pokiaľ to nebolo skutočne overené.

Začni teraz preflight auditom. Nežiadaj Foundera o údaje, ktoré vieš bezpečne zistiť z repozitára. Pýtaj sa iba na rozhodnutie, ktoré je skutočne nevyhnutné a nemá doloženú odpoveď. Najprv dokonči Governor, potom jednu prioritnú úlohu, potom odovzdaj dôkazy a zastav sa na hranici oprávnení.
```

---

## 9. Odporúčaný spôsob uloženia a spustenia

1. Ulož tento dokument do `docs/prompts/agentic/revolis-api-cost-governor-stack-v1.0.md`.
2. Spusť celý blok **META-PROMPT** v pracovnom prostredí, ktoré má prístup k repozitáru Revolis.
3. Uisti sa, že agent pracuje na vlastnej vetve a že má prístup iba k oprávneniam potrebným pre schválenú úlohu.
4. Po prvom behu vyžaduj dôkazy: diff, test report, ledger fixtures, Red Team review a presný status. Samotné vyhlásenie „hotovo“ nestačí.

**Aktuálne obmedzenie:** GitHub integrácia v tejto konverzácii odmietla vytvorenie vetvy odpoveďou `403 Resource not accessible by integration`. Preto tento dokument nie je commitnutý ani otvorený ako PR.
