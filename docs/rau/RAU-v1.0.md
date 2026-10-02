---
title: "RAU v1.0 — Revolis Agentic University (špecifikácia + dôkazy)"
project: RAU
type: architecture-spec
status: foundation — IMPLEMENTED + TESTED na vetve; stav po merge dopíše founder; nie je PRODUCTION
version: 1.0.0
created: 2026-09-30
tags: [rau, agentic, router, walls, waves, constitution]
related:
  - "[[agentic-system-blueprint-v1.0]]"
  - "[[revolis-system-spec-v1.0]]"
  - "[[revolis-constitution-v2]]"
  - "[[RUNNER]]"
  - "[[2026-09-26-baseline-benchmark]]"
---

# RAU v1.0 — Revolis Agentic University

> **Jedna veta:** z každého founder zadania zostaviť **najmenší potrebný a bezpečný postup**
> (projekt → walls → režim → brána → reťazec promptov) a odovzdať founderovi jedno rozhodnutie.
> **Čo je to technicky:** skill (Rector) + register projektov + deterministický router (skript) +
> knižnica 24 promptov. Bez runtime, bez DB, bez UI.
> **Stav dôkazu:** IMPLEMENTED + TESTED (vetva; CI zelená na commite `7f713a4` (run 36696657555): `Lint, test, build` (vitest vrátane 152 RAU testov, build, Playwright smoke), `BUS`, `Control Contract`, `Memory Engine`). Nie PRODUCTION; nič sa nenasadilo.
> **Čo router NIE JE:** bezpečnostná kontrola. Je to triedič kľúčovými slovami (§11).

## 1. Verdikt — pokus zabiť plán (2026-09-30)

Zadanie znelo „postaviť RAU do LIVE produkcie". Dôkazy z repa hovoria, že **v tej podobe by zlyhalo**,
preto sa postavila len zero-runtime vrstva.

| # | Dôvod, prečo by plán zlyhal | Dôkaz |
|---|---|---|
| 1 | RAU **nie je** Agent Factory (tá vyrába agentov; RAU smeruje zadania). Rovnaká logika však platí: prah pre Agent Factory (3 agenti za control-contractom) je **prekročený (4)** a zaznamenané rozhodnutie znie „posúdenie Ústavou, nie automatický BUILD; duplicita, ktorú by Factory riešila, zatiaľ nie je preukázaná". | `memory/decisions.md` (2026-09-25, odsek „Prah Ústavy…"), `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md` |
| 2 | Optimalizácia promptov/stackov zasahuje len **3,5 %** zmeraného cyklu PR; zvyšok je čakanie (~74 % je **odhad** rozdielom mediánov, rozklad je v benchmarku označený ako PREDPOKLAD; n = 9 / 19 / 40); 27 % behov CI červených (8 z 30). | `docs/reports/2026-09-26-baseline-benchmark.md` §2, §3 |
| 3 | Najrýchlejšia cesta k príjmu je **krok C** (Stripe ceny; `/upgrade` nevie predať), ktorý RAU neovplyvní. Stav k 29. 9., dnešný neoverený. | `memory/open-tasks.md` (CHECKOUT-ENV-01) |
| 4 | Model Router a Cost Governor **neexistujú** a nemajú nad čím rozhodovať: v ledgeri `model:null`, `cost_usd:0` v 9/9. | benchmark N3, N4; `docs/reports/2026-09-30-rau-w0-reality-audit.md` |
| 5 | Runner (00–12) je z väčšej časti **len kontrakt**; v kóde je `tc-orchestrator.mjs` (jeden profil) a `judge.mjs`. RAU nesmie tvrdiť „Runner vykoná". | W0 audit; `apps/crm/scripts/tc-orchestrator.mjs`, `apps/crm/scripts/judge.mjs` |
| 6 | Štyri z siedmich projektov nemajú v repe kód, zdroj dát ani rozhodnutie; UPTM žije v inom repozitári s vlastnými tvrdými pravidlami. | registry `open_unknowns`; `memory/session-summary.md` (2026-09-29) |
| 7 | „8 uzavretých business loopov" sa v repe **nenachádza** (najbližšie sú 4 slučky v north-star). | W0 audit; `docs/architecture/north-star-2027-2030.md` |
| 8 | Zoznam 7 projektov **vynecháva** Onlinovo.sk a AI Phone Operator, ktoré Blueprint vedie medzi 4 počiatočnými systémami; k Onlinovo navyše existuje aktívna práca (Onlinovo MCP) v tomto repe. | `docs/architecture/agentic/agentic-system-blueprint-v1.0.md` §17; `memory/open-tasks.md` |

**Najväčšie riziko:** že RAU vytlačí krok C (displacement), nie že nefunguje.
**Najpravdepodobnejší bottleneck** (odhad, nie presné meranie): čakanie na človeka/GO a červená CI — nie kvalita promptov.
**Najrýchlejšia cesta k príjmu:** krok C → VERIFY → env → `/upgrade` smoke.
**Kandidát na najvyššie ROI** (ROI som nepočítal): krok C — minúty foundera odomykajú seat príjem.
**Jediný krok na dnes:** krok C. RAU je vedľajší produkt, nie cesta k príjmu.

### Ústava v2 (12 otázok) — poctivo

Q1 zaplatil by klient? **NIE → VETO → max VALIDATE.** Q2, Q3 nie priamo. Q4–Q6 nepriamo: moat by
posilnili len nalogované dáta (presnosť brán, čakanie foundera) — dnes sa nelogujú. Q7 nižšie ROI ako
krok C. Q8 timing: pre ťažké časti **príliš skoro** (§8); pre zero-runtime vrstvu prijateľné.
Q9 MVP < 2 týždne: áno. Q10 pasce: **Technology Bias, Feature Trap, Complexity Bias,
Distribution Blindness**. Q11, Q12: nie.

Skóre nepočítam — Q1 a Q8 sú rozhodnutia foundera. **Záznam (`memory/decisions.md`, 2026-09-30):**
*VALIDATE (strop z veta Q1); founder dal výslovné GO na RAU → BUILD len vrstvy bez runtime, DB, UI a PROD;
všetko ostatné BACKLOG.* Veto je teda **vedome prekročené foundrom**, nie obídené.

### Engineering justification (povinný blok — `docs/architecture/engineering-constitution.md`)

- **Trigger:** new-abstraction (register projektov + router + skill)
- **Decision path:** new-code (tenké; obaluje existujúce)
- **Alternatives considered:** (a) len prompty/dokumenty bez routeru — odmietnuté: bez deterministického
  výberu reťazca a brány sa rozchádzajú; (b) rozšíriť `task-loop` — odmietnuté: ten je koncový krok úlohy a
  projekty/walls nerieši; (c) Agent Factory — odmietnuté: zaznamenané rozhodnutie (riadok 1 vyššie).
- **Why not reuse:** W0 audit nenašiel žiadny register projektov ani výber reťazca; existujúce skills
  (`kontrolor`, `strategic-analysis`, `task-loop`) ich nepokrývajú. Kde sa dalo, RAU **volá** existujúce (§3).
- **Expected outcome:** menej a lepšie pripravených rozhodnutí pre foundera. **Nemerané** — začne riadkami „RAU route:".
- **Related paths:** `docs/rau/`, `.claude/skills/rau/SKILL.md`, `scripts/ops/rau-route.mjs`.
- **Contradiction check:** flag — (1) Ústava Q1 veto (vedome prekročené foundrom); (2) vlastné pravidlo P05 „nový
  register/router bez ADR a GO" — tento dokument a záznam v `decisions.md` zastupujú ADR; (3) AP-012
  (Architecture Inflation) — riziko uznané, preto žiadny runtime/DB/UI.

## 2. Reálny stav infraštruktúry

Plný audit (len čítanie): `docs/reports/2026-09-30-rau-w0-reality-audit.md`. Podstatné: Control Contract
beží len pre odosielanie (`apps/crm/src/lib/control-plane/authorize-send.ts`); Bus je testovaná knižnica
(nasadenie neznáme); Runner je kontrakt + 2 skripty; Model Router a Cost Governor neexistujú; register
agentov existuje (`apps/crm/src/lib/agents/agent-specs.ts`, 4 agenti); register projektov **neexistoval**.
Slovník auditu (CODE-RUNNING/PARTIAL/SPEC-ONLY/ABSENT) je staticky iný než slovník P01 (LIVE/DEFINED/…):
P01 `LIVE` znamená len „v produkčnej ceste existuje volajúci", nie že to niekto používa.

## 3. Mapa znovupoužitia (REUSE → EXTEND → COMPOSE → BUILD)

| RAU komponent (z návrhu) | Už existuje | Rozhodnutie |
|---|---|---|
| Rector / Chief | skills `task-loop`, `kontrolor`, `strategic-analysis` | **BUILD tenký skill** `.claude/skills/rau/SKILL.md`, ktorý ich volá |
| Project Registry | žiadny | **BUILD** `docs/rau/registry.json` (8 spotrebiteľov: 7 projektov + RAU) |
| Prompt Stack Compiler | Runner vrstvy 05, 06 (kontrakt) | **BUILD deterministický router** `scripts/ops/rau-route.mjs`; negeneruje prompty LLM-kom |
| Agent Registry | `agent-specs.ts` | **REUSE** (P08 zapisuje tam) |
| Orchestrator / Runner | `docs/prompts/runner/*` + 2 skripty | **REUSE**; RAU nič nevykonáva |
| Gates / Evidence | Ústava, `prepush-gate.sh`, CI, control-contract | **REUSE** (P15–P17) |
| Model Router, Cost Governor | žiadny | **BACKLOG** |
| Memory | `memory/*`, `brain/` | **REUSE**; vzory medzi projektmi sa prenášajú, dáta nie |
| Control Center UI | `founder-control-plane` spec (STRATEGIC BACKLOG) | **BACKLOG** |

## 4. Zákony RAU

1. **Agent ≠ authority.** Founder: VISION, PRIORITY, DECISION, APPROVAL. (Blueprint Laws 3, 10)
2. **Reuse before build.** Nový komponent potrebuje druhé použitie (Engineering Constitution p. 4, AP-012).
3. **Deterministicky najprv.** LLM len pre nejednoznačnosť; router je skript.
4. **Gate je podlaha pre rozpoznané výrazy.** Neznámy projekt/druh = ASK; poradenská otázka so spomenutým
   rizikom = ASK (nikdy ticho AUTO-SAFE). **Nerozpoznaný úkon môže prejsť** — preto Rector číta zadanie sám
   a vynútenie stojí na úrovni akcie.
5. **Stavy dôkazu sú rôzne:** IMPLEMENTED ≠ TESTED ≠ VERIFIED ≠ PRODUCTION ≠ PRODUCTION VERIFIED.
6. **Overovateľ ≠ implementátor**; akceptačnú sadu nepíše ten, kto implementuje (AP-025). Je to
   **inštrukcia, nie mechanizmus** — vynucuje ju len rozhodnutie zadať overenie inému agentovi/session.
7. **Nič nevymýšľaj:** neznáme pole je `null` + otvorená neznáma; čísla rizika určuje founder.
8. **Projekty sa nemiešajú:** jedna úloha = jeden projekt; medzi projektmi sa prenášajú vzory, nie dáta.
9. **Minimum práce pre rovnaký overený výsledok** — router vyberá len potrebné prompty.
10. **Autonómia len v schválenej obálke:** `autonomous_allowlist` je prázdny.

## 5. Režimy, brány, waves, walls

**Režimy:** FAST · STANDARD · HARDENED · AUTONOMOUS (nikdy automaticky). **Brány:** AUTO-SAFE ·
GO_REQUIRED · STOP · ASK. Definície sú v `docs/rau/registry.json`.

**Slovník — dvojaké slová:** „brána (gate)" RAU je **odporúčaná trieda zadania** (radí); brána
control-contractu je **vynútené rozhodnutie akcie**. „Tier 3" v Blueprinte §8 = nevratná/vysoko riziková
akcia; „Tier 3" v `docs/AUTOMERGE-POLICY.md` = súbor na denylist (vyžaduje foundera). Nie sú to tie isté veci.

**Waves** (kvalifikované ID, aby sa nezrazili s inými repami — vzor z UPTM `MAP-Q5`):
`rau:W0` Discovery (read-only) → `rau:W1` Contracts → `rau:W2` Design → `rau:W3` Implementation →
`rau:W4` Verification → `rau:W5` Adversarial → `rau:W6` Release (CI → staging → gate) →
`rau:W7` Production (deploy → verify → observe) → `rau:W8` Learning. Medzi vlnami je **wall**.
Paralelizmus v rámci vlny len s dôkazom disjunktných write-setov (`task-loop` §7); vlna N+1 až po
merge vlny N; pochybnosť = sekvenčne.

**Walls:** WALL-PROJECT · WALL-ENV · WALL-DATA · WALL-FINANCIAL · WALL-EXTERNAL · WALL-FOUNDER.
Pri každej je v registry napísané **ENFORCED** alebo **ADVISORY/CONVENTION**. Vynútené je len odosielanie
správ na dvoch cestách cez `authorizeSend`; iné odosielacie cesty v kóde existujú bez tejto brány.
**Ochrana RAU súborov:** `docs/rau/**`, `.claude/skills/rau/**` a `scripts/ops/rau-route.mjs` **nie sú**
na denylist auto-merge (`.github/scripts/automerge-policy.mjs`; `.github/` je Tier 3 — upraví founder).
Zmeny walls/registry/allowlistu preto idú cez PR **bez labelu automerge**.

## 6. Ako prebieha nové zadanie

```
FOUNDER zadanie
  → Rector zistí dostupné nástroje (nedostupné povie)
  → rau-route.mjs (--stdin): projekt · druh · riziká · walls · režim · gate · reťazec · reuse
  → ASK / STOP / GO_REQUIRED / AUTO-SAFE
  → Founder Brief (max 12 riadkov, jedno rozhodnutie s odporúčaním)
  → po GO: P00 → … → P22 → P23 (task-loop)
```

## 7. Campus registry (stav dnes)

| # | Projekt | Repozitár | Stav | Režim | Kľúčové neznáme |
|---|---|---|---|---|---|
| 00 | RAU | RealitkaAI | FOUNDATION | STANDARD | — |
| 01 | Revolis.AI | RealitkaAI | LIVE pre referenčného klienta; samoobslužný nákup nefunguje | STANDARD | — |
| 02 | UPTM | uptm-runner (iný) | PRE-LIVE, `LIVE_TRADING=false` | HARDENED | čísla kapitálu určuje founder |
| 03 | Mia Vellar | neznámy | neznámy | STANDARD | kde žije; pravidlá označovania AI obsahu (NEOVERENÉ) |
| 04 | Konkurent Nájomnej agentúry | neznámy | v repe 0 zmienok | STANDARD | kto presne; zdroje dát |
| 05 | Konkurent Proon | neznámy | v repe 0 zmienok | STANDARD | čo presne; zdroje dát |
| 06 | YouTube riekanky | neznámy | NOT_STARTED | STANDARD | pravidlá pre obsah pre deti a monetizáciu (NEOVERENÉ) |
| 07 | YouTube dážď/ambient | neznámy | NOT_STARTED | STANDARD | pravidlá pre hromadný/AI obsah (NEOVERENÉ) |
| — | Onlinovo.sk | neznámy (MCP v tomto repe) | Blueprint §17.2 | STANDARD | **nepotvrdené founderom** |
| — | AI Phone Operator | neznámy | Blueprint §17.4 | STANDARD | **nepotvrdené founderom** |

Polia `risk_class`, `default_mode`, `fast_eligible`, `founder_confirmed` sú **návrh RAU** (písané rukou), nie
odvodené z repa. Pravidlá YouTube a EÚ pre AI obsah a detský obsah **som neoveril** (cutoff znalostí, žiadny
zdroj v repe) — pred stavbou kampusov 03, 06, 07 sa musia overiť u zdroja.

## 8. Strategic Backlog — čo RAU zámerne nestaví a čo to odomkne

Zdroj: `registry.json` → `backlog` (každá položka nesie `veto`, `unlock`, `source`). Router pri zhode vráti
`backlog_conflicts` a gate GO_REQUIRED. Stručne: **Agent Factory** (prah prekročený → posúdenie Ústavou,
nie automatický BUILD), Produktové skills (druhé použitie), Managed Agents runtime (prvý agent s tool use),
**Model Router** a **Cost Governor** (30 dní meraného `model`/`model_calls`/tokenov), **Control Center UI**
(≥ 10 zaznamenaných použití riadkom „RAU route:" a presnosť brány nad prahom z P12 a GO), Produktová
pamäť (3 platiaci), Plánovaná stavba a spol. (dáta), Autonómny režim (allowlist cez PR).

## 9. Pamäť a učenie

Politická pamäť (Ústava, Blueprint, registry) má prednosť pred naučenou. Sémantická = `memory/decisions.md`;
epizodická = `memory/session-summary.md` (**PREPEND**; riadok „RAU route: <gate> <kind> <projekt>" je
rozšírenie formátu zo CLAUDE.md); pracovná = P00. **Medzi projektmi sa prenášajú vzory, nie dáta:**
UPTM kapitálové dáta ⇸ Revolis; charakterová pamäť Mia ⇸ UPTM; poznatky o konkurentovi ⇸ iné projekty.
Vzor sa povýši po druhom použití.

## 10. Scorecard (čo je merané a čo nie)

| Metrika | Stav |
|---|---|
| Presnosť brány a projektu na slepých sadách | **MERANÉ** (§11) |
| Dĺžka reťazca (sériové kroky) | **MERANÉ** (router ju vypíše) |
| `model_calls`, tokeny, `cost` na úlohu | **NEMERANÉ** (N3, N4) |
| Reuse rate | **NEMERANÉ** (ledger neexistuje; začne riadkami „RAU route:") |
| Čakanie foundera (GO → akcia) | **NEMERANÉ** (chýba per-PR „práca hotová") |
| Zásahy človeka, regresie, incidenty | **NEMERANÉ** |

## 11. Dôkaz

**Stav:** IMPLEMENTED + TESTED lokálne aj v CI — CI zelená na commite `7f713a4` (run 36696657555): `Lint, test, build` (vitest vrátane 152 RAU testov, build, Playwright smoke), `BUS`, `Control Contract`, `Memory Engine`. Nič nie je VERIFIED v produkcii. (CI spočiatku nebežala: PR mal konflikt v `memory/*` po PREPEND-och iných session; GitHub pri konflikte `pull_request` workflowy nespúšťa. Po zlúčení `main` do vetvy bežala.)

**Testy.** `apps/crm/tests/verification/rau.verification.test.ts` — 152 testov. Pokrýva: konzistenciu
dát (cesty, prompty, steny, regexy), knižnicu promptov (šablóna, odkazy), **pozitívny aj negatívny prípad pre
každý z 24 spúšťačov** (tabuľka musí pokrývať presne spúšťače zo súboru), exact-gate správanie, poradenský
režim, negácie/citáty, Unicode, CLI (`--stdin`, chybné prepínače), reuse. Lokálne: lint PASS, typecheck
baseline PASS, API-contract ratchet PASS (`scripts/ci/prepush-gate.sh`).

**Nezávislé slepé sady.** Tri sady písali traja samostatní agenti, ktorí **nevideli pravidlá ani kód**
(slepota je daná tým, že súbory nedostali a zákaz bol v zadaní — nie technickou izoláciou). Označovali podľa
**politiky, ktorú som napísal ja**: merajú teda konzistenciu a odolnosť voči formulácii, nie to, či je politika
správna. Pri sade 2 a 3 som do textu politiky doplnil dve spresnenia (automatizácia, ktorá neskôr urobí rizikový
úkon = GO_REQUIRED; zisťovanie vlastníkov „akýmkoľvek spôsobom" = STOP).

| Sada | n | Prvý beh na zmrazenom routeri — gate presne / projekt / **nebezpečné podhodnotenie** / nadhodnotenie | Po zovšeobecnených opravách (POZOR: ladené na tejto sade) |
|---|---|---|---|
| 1 vývojová | 80 | 61 % / 91 % / **3** / 12 | 93 % / 100 % / 0 / 4 |
| 2 holdout | 80 | **80 % / 100 % / 2** / 8 | 95 % / 100 % / 0 / 4 |
| 3 adverzariálna (zámerne obchádza kľúčové slová) | 60 | **40 % / 91 % / 6** / 12 | 45 % / 95 % / 2 / 12 |

Čísla v pravom stĺpci **nie sú nezaujatý odhad** (po každej sade som opravoval). Nezaujatý odhad je len
stĺpec „prvý beh". Po poslednej oprave **neexistuje čerstvá sada** — výkon finálnej verzie na nových formuláciách
je preto **NEZMERANÝ**; rozumný odhad je medzi 80 % (bežné formulácie, sada 2) a ~40 % (adverzariálne). „Nebezpečné
podhodnotenie" = očakávaná prísnejšia brána, router vrátil AUTO-SAFE. Zostávajúce 2 na sade 3 sú metafora
(„dostaň ho tam, kde ho uvidia makléri") a dvojitá negácia („nechcem aby si nezmergoval") — kľúčové slová ich
principiálne nechytia. **Preto je router triedič, nie bezpečnostná kontrola.** Nadhodnotenia sú trenie (ASK
navyše), nie chyba bezpečnosti.

**Nezávislý adverzariálny review** (samostatný agent, read-only, šošovka `kontrolor`): verdikt *SHIP WITH FIXES*,
15 nálezov (2× P0, 6× P1, zvyšok P2). Stav: P0 „poradenský režim zahadzuje riziko" — **opravené** (riziko sa
nezahadzuje, bez výslovného „len analýza" ide na ASK; 35/35 jeho fráz už neprejde ako AUTO-SAFE); P0 „prázdny
§Dôkaz" — **opravené** (tento odsek); P1 „testy nechytia 15 z 22 pravidiel" — **opravené** (tabuľka hit/miss pre
všetkých 24, overené mutáciami nižšie); P1 „zápis v decisions.md nie je" — **opravené** (záznam + test, že
existuje); P1 „Engineering justification chýba" — **opravené** (§1); P1 „shell-nebezpečné volanie" —
**opravené** (`--stdin`); P1 „invarianty v auto-mergeovateľných cestách" — **neopravené, rozhodnutie foundera**
(`.github/` je Tier 3; upozornenie v §5 a v skille); P1 „ENFORCED je prehnané" — **opravené** (presná formulácia);
P2 nálezy — väčšina opravená (runs_in, handoff, brief 12 riadkov, „Tier 3" slovník, reuse pomenovanie, `--project`
validácia, chybné prepínače, registry provenance); **neopravené vedome:** rozsah zmeny (~4 700 riadkov vrátane 24 promptov, testov a pamäte) pri
vetovanom Q1 (zaznamenané ako vedomé prekročenie foundrom), `docs/rau` v reuse heuristike vylúčené, „RAU route:"
ako rozšírenie formátu session-summary.

**Mutačný dôkaz** (sabotáž routeru/pravidiel v kópii stromu → test musí zhasnúť):

Sabotáž sa robí v **kópii stromu** (repo sa nemení): 32 cielených zásahov do logiky/pravidiel + zmazanie
**každého z 24 spúšťačov samostatne** = 56 mutácií. Výsledok: **56 z 56 zhasne aspoň jeden test, 0 prežilo.**
Cielené zásahy pokrývajú: neznámy druh práce prejde; osobné údaje STOP→GO; neprázdny `autonomous_allowlist`;
povelové sloveso v poradenskej otázke; CRITICAL bez HARDENED; backlog položka; cudzí repozitár; falošný
priateľ „kľúčové"; rozdelenie mena projektu; prítomný čas „posiela"; BUILD bez kontraktu; viac projektov bez
ASK; vypnuté masky negácií a citátov; vypnuté ASK pre riziko v citáte a pre poradenskú otázku; **pôvodná P0
diera (poradenský režim potichu zahadzuje riziko)**; self-potvrdzujúca veta „len analýza"; `--project` prebíjajúci
text; cyrilika, fullwidth, zero-width; nevalidovaný `--project`; reuse vracajúci vlastné docs; merge bez CI/prod
brány; `runs_in` ≠ router; nepotvrdený projekt bez GO; BUILD ako FAST; testy/docs ako nová funkcia; prázdne
`read_only_phrases` a `act_verbs`; zahodené dôkazy.

Čo mutácie odhalili **na mojej vlastnej sade testov** (a čo som opravil): (1) pôvodná sada nechytila 15 z 22
zmazaných spúšťačov (nález recenzenta) — teraz 0 z 24; (2) mutácia „zero-width" prežila, lebo test obsahoval
samostatné slovo `prod` — test som spresnil (zero-width vnútri slova `deploy`); (3) dve mutácie sa nedali
aplikovať, lebo zdroják obsahoval doslovné neviditeľné znaky — nahradené `\uXXXX`; (4) test „ASK pri riziku v
citáte" pôvodne prechádzal z iného dôvodu (neznámy druh práce) — pridaná kontrola `quoted_only_triggers`.

**Čo nie je dokázané:** reálne použitie na úlohách foundera; výkon finálnej verzie na čerstvých formuláciách;
že RAU skracuje čakanie foundera; čokoľvek v produkcii; presnosť reuse heuristiky.

## 12. Zdroje a čo chýba

- Priloženú kópiu chatu („Prilepené formátovanie textu(4).md") **som nemal k dispozícii**
  (nie je v repe ani v session); pracoval som s princípmi citovanými v zadaní. Dokumenty Prompt Stack
  Compiler v1.0 / Build Protocol v1.0 tiež nie sú v repe (`memory/session-summary.md`).
  Ak obsahujú niečo navyše, treba ich vložiť znova.
- **Ruflo** a **onlinovo** MCP servery sa v tejto session nepripojili (`CONNECTION_CLOSED`) — swarm runtime
  som nepoužil ani nepredstieral; vlny bežali cez natívnych sub-agentov (audit, tri slepé sady, review).
- Skill `gdpr-advisor`, na ktorý odkazuje `CLAUDE.md`, v repe neexistuje (AP-024); P06 to hovorí priamo.

## 13. Leverage track (L01–L05) — dodatok 2026-10-02

Zadanie: štyri prompty zo screenshotov Instagramu (+ návrh doplniť „Asset Compounder") vziať ako špecifikáciu
modulov RAU. Sprievodca a mapa názvov: `docs/rau/leverage/README.md`. **Bez routeru, runtime, DB a UI;** päť
read-only textov a jeden záznam v Strategic Backlogu.

**Pokus zabiť plán:**

| # | Dôvod | Dôkaz |
|---|---|---|
| 1 | „Presne toto sme už riešili ako Knowledge DNA → Leverage → Productization" — v repe to **nie je zapísané**. Ak sa to riešilo v chate, pre ďalšiu session to neexistuje. | grep nad repom 2026-10-02: 0 zásahov na „Knowledge DNA", „Leverage Stack/Engine", „Asset Converter/Compounder", „Naval", „Time-for-Money" (dva náhodné zásahy: slovo „productized" v nesúvisiacich súboroch) |
| 2 | „Execution Engine" (Build → Verify → Ship → Measure → Learn) je **samotné RAU** (P00–P23); nový modul by bol duplicita. | §3, `docs/rau/prompts/` |
| 3 | „Asset Compounder" (prompt → postup → agent → funkcia → modul) prekrýva P22/P23 a posúdenie Agent Factory (prah prekročený → Ústava, nie automatický BUILD). | §1 riadok 1; preto L05 len **navrhuje**, nestavia |
| 4 | Zdrojové prompty sú všeobecné: stoja na sebaopise (model rád pochváli) a každý zámerný krok foundera (GO, merge, cena) by označili za „únik času". Druhý prompt má úlohu skopírovanú z prvého. | screenshoty (5 z 6 snímok) |
| 5 | Atribúcie (Naval Ravikant a i.) sú tvrdenia autora príspevku; triáda „špecifické know-how + páka + zodpovednosť" je z pamäte modelu, **neoverená**. | — |
| 6 | **Najväčšie riziko: znova vytlačí krok C.** Track nič nestavia a spúšťa ho len founder. Štyri zo šiestich slepých behov (L01, L03 s testovacím vstupom, L04, L05) samy postavili krok C pred ďalší RAU alebo stavbu; L02 ho uviedol ako zámerné rozhodnutie foundera. | §Dôkaz nižšie |

**Ústava v2:** Q1 NIE → **VETO → max VALIDATE**; Q2, Q3 nie; Q4–Q6 len nepriamo (L01 hľadá moat, ale nové dáta
nevzniknú); Q7 nižšie ROI ako krok C; Q8 interný track prijateľný, **externý predaj príliš skoro → Backlog**;
Q9 áno; Q10 pasce: Technology Bias, Feature Trap; Q11, Q12 nie. Skóre sa nepočíta. **Záznam
(`memory/decisions.md`, 2026-10-02):** *VALIDATE (strop z Q1); founder dal výslovné GO → BUILD len read-only
prompty a dokumentácia; router, runtime, DB, UI a predaj navonok BACKLOG.* Veto je teda vedome prekročené
founderom, nie obídené.

**Engineering justification** (`docs/architecture/engineering-constitution.md`):
- **Trigger:** rozšírenie knižnice promptov. **Decision path:** EXTEND (konvencia P22/P23), v **oddelenom adresári**,
  aby sa nedotkli invarianty „práve P00–P23" a reťaze routeru.
- **Alternatives:** (a) P24–P28 — odmietnuté: P-prompty ťahá router do reťazca, L-prompty spúšťa len founder;
  (b) nový druh práce `LEVERAGE` v routeri — **odložené** do prvého reálneho behu L01 (Q8); (c) záznam v
  `registry.json` pre track — odmietnuté: nespotrebované dáta (AP-012). Do registra ide len backlog položka
  `leverage-external-productization`.
- **Why not reuse:** v repe nič netaží opakujúce sa rozhodnutia foundera; P22 zapisuje, netaží.
- **Expected outcome:** z prvého behu L01 vznikne rozhodnutie zapísané v `memory/decisions.md`. **NEMERANÉ.**
- **Contradiction check:** Q1 veto (vedome prekročené); AP-012 (Architecture Inflation) — riziko uznané, preto len text.

**Dôkaz (stav: IMPLEMENTED + TESTED; užitočnosť NEMERANÁ):**
- `apps/crm/tests/verification/rau-leverage.verification.test.ts` — štruktúra L01–L05, ochranné pravidlá v každom
  prompte, backlog položka a jej zhoda v routeri, pravdivosť tvrdení README o routeri. Existujúcich 152 RAU
  testov je nezmenených.
- **Slepý beh (prvý, pred akoukoľvek úpravou promptov):** 6 nezávislých behov (L01, L02, L03 bez L01, L03 s
  testovacím vstupom L01, L04, L05) na rovnakom DATA PACKu výňatkov z repa; vykonávateľ smel čítať len pridelené
  súbory (počet volaní Read = počet pridelených súborov). Chýbajúce vstupy (hodiny, príjem, publikum, zoznamy
  foundera) vykonávateľ **nemal**.
- **Čo som pri čítaní všetkých šiestich výstupov zistil:** každý obsahoval `NEZNÁME` aj sekciu „Čo hovorí PROTI"
  a pýtal presne 3 otázky; L03 bez L01 sa zastavil vetou „Najprv spusti L01."; L05 nepovýšil nič (0 použití mimo
  testov); L01 označil všetkých päť nájdených vzorov za COMMODITY a know-how **nevymyslel**; žiadny výstup
  nenapísal sumu ceny ani meno referenčného klienta. **Slabina:** výstupy mali ~50–70 riadkov, pokyn „max jedna
  obrazovka" nebol overiteľný.
- **Neoverené:** že výstup foundera posunie k rozhodnutiu; triáda z bodu 5 vyššie; poslednú (6.) snímku som
  nevidel.

## Rozhodnutia foundera

Jedno zhrnutie, s odporúčaním (jedna odpoveď stačí, napr. „1A 2A 3A 4A"):

1. **Rozsah.** **A)** zmergovať základ RAU (skill + register + router + prompty) — *odporúčam*;
   B) stavať aj Control Center UI teraz — neodporúčam (Q1 veto, žiadne merané dáta); C) nemergovať.
   Pozn.: merge do `main` v tomto repe spúšťa produkčný build Vercelu (`apps/crm/tests` je v diffe) —
   kód aplikácie sa nemení, ale build prebehne.
2. **Onlinovo.sk a AI Phone Operator** (Blueprint §17; k Onlinovo beží Onlinovo MCP v tomto repe): **A)**
   ostávajú v registri ako „nepotvrdené" — *odporúčam*; B) odstrániť; C) potvrdiť ako kampusy.
3. **Projekty 03–07:** potrebujem, kto presne je „Nájomná agentúra" a „Proon", kde žije Mia a aké kanály
   existujú. Bez toho ostávajú `null` a router pri stavbe vráti ASK. **A)** doplníš — *odporúčam*; B) zaparkovať.
4. **Skill je po merge v sile pre každú novú session** (jeho popis sám ponúka použitie pri novom zadaní).
   **A)** nechať — *odporúčam*, router je len triedič a nič nevykonáva; B) skill pri merge neprijať alebo zúžiť
   popis. Riadok v `CLAUDE.md` (povinné použitie) pridávať **až po ~10 použitiach** a po vyhodnotení presnosti.
5. **Ochrana pred auto-merge:** pridať `docs/rau/**`, `.claude/skills/rau/**`, `scripts/ops/rau-route.mjs` do
   denylistu (`.github/scripts/automerge-policy.mjs` — Tier 3, robí founder). **A)** áno — *odporúčam*.
6. **Dnes:** krok C (Stripe ceny) má prednosť pred akýmkoľvek ďalším RAU.
