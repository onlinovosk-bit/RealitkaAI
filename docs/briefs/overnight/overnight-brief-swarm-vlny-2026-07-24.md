# OVERNIGHT MASTER BRIEF: Swarm vlny + Obsidian Vault (2026-07-24 → 25)

**Cieľová cesta:** `docs/briefs/overnight/overnight-brief-swarm-vlny-2026-07-24.md`
**Režim:** Ruflo Swarm — Orchestrátor + Agenti na izolovaných vetvách.
**Pravidlá:** každý balík vlastný branch+PR+CI · Vlna N+1 až po merge Vlny N ·
pochybnosť = sekvenčne · žiadna migrácia (túto noc nulové DB zmeny) ·
ZAKÁZANÉ AKCIE a .cursor/rules platia pre každého agenta.

## FOUNDER PRE-GO (potvrdiť pri kickoffe, inak vlny čakajú na ráno)
- [ ] Docs-only PR (1a, 1c, 1d) so zelenou CI sa smú mergnúť automaticky
      v rámci noci. Kód-touching PR (1b, W2) čakajú na founder merge.
- Ak nepotvrdené: všetky PR STOP po zelenej CI, Vlna 2 sa spustí ráno
      po ručných merge.

## PHASE 0 — write-probe (Orchestrátor, pred spustením vĺn)
`git status` čistý (necommitnuté zmeny → samostatný commit PRED vlnami) ·
probe zápis+delete v každej cieľovej ceste · overenie, že cesty balíkov
sú disjunktné voči aktuálnemu stavu repa (ls, nie odhad). Konflikt → balík
presunúť do Vlny 2 (sekvenčne).

## VLNA 1 — 4 paralelné PR + Track O (dôkaz neprekrytia: cesty nižšie)

### PR-1a: n8n exporty (docs-only)
Cesty: `automation/n8n/*` VÝHRADNE.
Ulož: `w1-follow-up-strazca.json` (32 firiem, aktualizovaný),
`w2-heartbeat-watchdog.json`, `w3-odpoved-detektor.json` + aktualizuj
`automation/n8n/README.md` (tabuľka W1/W2/W3, healthz poznámka, stav
importov). Over CI grep guard (žiadne secrets). Acceptance: guard zelený.

### PR-1b: e2e dotiahnutie (kód — founder merge)
Cesty: `apps/crm/tests/e2e/valuation-widget.spec.ts`,
`apps/crm/playwright*.config.*` (nightly projekt),
`docs/briefs/overnight/overnight-brief-sandbox-gdpr.md` VÝHRADNE.
(1) DB asserty demo submitu: `sandbox_submissions` +1, `leads` +0 (vzor
countRows). (2) Flaky „public page renders property step first on mobile"
— diagnostikuj: nestabilný test → stabilizuj; nestabilná stránka → LEN
nahlás, žiadna oprava bez GO. (3) `valuation-widget` do nightly behu.
(4) Text briefu bodu 2 zosúlaď s realitou (notifikácia = Vitest
integration). Acceptance: 3× po sebe zelený beh spec-u bez retry.

### PR-1c: sales & governance docs (docs-only)
Cesty: `docs/sales/*`, `docs/templates/*`, `docs/premortems/*`,
`docs/prompts/*` VÝHRADNE (BEZ .cursor/rules — tie ide Vlna 2!).
Ulož: `listing-video-playbook.md`, `demo-prep-megarealitka.md`,
`call-list-2026-07-w30.md` (ak chýba), `premortem.md` → docs/templates/,
`2026-07-23-ads-smolko-ab.md` → docs/premortems/,
`veos-voice-compiler.md` + `cursor-status-check-sandbox-gdpr.md` +
`cursor-graph-audit-phase1.md` → docs/prompts/,
`veos-integration.md` → docs/architecture/.
Acceptance: všetky súbory na cestách, linky vo vnútri platné.

### PR-1d: Graph Audit Fáza 1 (read-only)
Cesty: JEDINÝ nový súbor `docs/architecture/graph-audit-2026-07.md`.
Vykonaj presne podľa `cursor-graph-audit-phase1.md` (klasifikácia uzlov
SEQUENTIAL-NUTNÉ/ZBYTOČNÉ/PARALLEL/SIDE-EFFECT s dôkazmi, baseline p50/p95
alebo `unavailable` + logging návrh, 2 quick win plány s 429/backoff
testami, kill kritérium ≥30 % p95). ŽIADEN refaktor.

### Track O: Obsidian Vault (paralelne — iný adresár, nulový prienik)
Cesty: `C:\RealitkaAI-Memory\` VÝHRADNE (žiadny zápis do RealitkaAI repa).
**Anti-duplikačné pravidlo (záväzné):** repo = pravda (governance,
rozhodnutia, šablóny žijú v repe/brain). Vault = founderov myšlienkový
priestor + dashboardy. Vault NIKDY nekopíruje obsah repa — odkazuje naň.
Vytvor:
1. `00-Dashboard/Founder-Cockpit.md` — Dataview: nadchádzajúce termíny
   (27.07 Ads štart + prípadné Harasim demo 8:00, 29.07 brain review,
   30.07 Molnár), otvorené #todo naprieč vaultom, horúce leady.
2. `10-Sales/Pipeline.md` — 4 kľúčové vlákna (Smolko/Kamzík/Harasim/Molnár)
   so stavom a next-step; poznámka: autoritatívny tracker je xlsx v repe.
3. `20-Journal/` + `90-Templates/` — šablóny Daily note, Call-log,
   Lesson-draft, Premortem-draft (draft = odkaz na repo šablónu + polia
   na rýchly zápis; finál ide do repa).
4. `VAULT-SETUP.md` — manuálne kroky pre foundera: zapnúť community
   plugins Obsidian Git (autocommit 30 min), Dataview, Templater —
   inštaláciu pluginov agent nerobí, len zapíše postup.
Acceptance: štruktúra existuje, Dashboard sa otvorí bez Dataview chýb
(queries syntakticky валídne), žiadny duplikovaný obsah z repa.

## VLNA 2 — brain PR (sekvenčne, AŽ PO merge celej Vlny 1)
Dôvod sekvencie: `brain:ingest` skenuje docs/ — výstup registry závisí od
stavu repa po Vlne 1 (dátová závislosť, nie cestný konflikt).
Cesty: `brain/identity/*`, `brain/lessons/*`, `brain/src/audit-core.ts`,
`.cursor/rules/architecture.mdc`, `.cursor/rules/workflow.mdc`,
`brain/registry/*` (regen), `brain/decisions/*` (prípadné nové záznamy).
Obsah: (1) FOUNDER.md + COMPANY.md → brain/identity/. (2) lessons/README
+ 3 lessony → brain/lessons/. (3) audit-core: advisory „lesson s
prevenciaOverena:false starší než 30 dní". (4) architecture.mdc: VEOS veta.
(5) workflow.mdc: premortem povinnosť pre Strategic Bet/Core Platform.
(6) Registrácia nových docs (identity, lessons, VEOS, premortem šablóna
s review dátumom Ads premortemu 2026-09-07) + regen views v tom istom PR.
Acceptance: `brain:check` zelený, nový advisory typ má test.

## VLNA 3 — test, oprava, sumár (Orchestrátor)
1. Po všetkých merge: plný beh `npm test` + typecheck + lint + e2e smoke
   + `brain:check` + `brain:audit` na main.
2. Červené → oprava LEN v scope vlastného balíka, max 2 iterácie na PR;
   stále červené → zapíš ako ODCHÝLKA, neforsíruj.
3. **Sumár** → `docs/reports/overnight-summary-2026-07-25.md` + krátka
   verzia pre foundera: ČO SA ZMENILO (per PR, commit ID) · DÔKAZ (CI run
   linky, brain:audit delta) · TRACEABILITY (každý balík → acceptance
   splnené/nie) · ODCHÝLKY · ČO ČAKÁ NA FOUNDERA (merge 1b+W2 ak bez
   pre-GO, D-1 testy Ads stav!, Harasim termín, zmluva Vitko odoslaná?).

## MIMO SCOPE tejto noci (nezačínať)
Migrácie a DB zmeny · quick-win refaktory z Graph Auditu · Listing video
(Higgsfield/Kling) · parser memory/decisions.md (položka 6) · čokoľvek
z odložených brán v COMPANY.md.

## Otázky (max 3, s odporúčaním)
1. Pre-GO auto-merge docs-only? → ÁNO (šetrí jedno ranné kolo).
2. Ak Harasim medzitým vybral pondelok 8:00 → do sumáru pridať prípravu
   demo checklistu? → ÁNO, len checklist, žiadny tenant insert bez GO.
3. Ak PHASE 0 nájde špinavý git status → commitnúť ako `chore: pre-swarm
   snapshot`? → ÁNO.
