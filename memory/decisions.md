# Critical Decisions Log

## [2026-09-23] — W1 hotová: identita kancelárie sa odovzdáva, nedopočítava

**Zmena správania, nie oprava kozmetiky:** automatická odpoveď už neodíde na adresu
klienta. Doteraz mohla — lead z 2026-09-22 05:47 má ako kontaktný e-mail adresu
jedného z maklérov (overené: presná zhoda s `profiles.email`).

- **Stráž nestojí na doméne príjemcu.** Stará podmienka `domain === recipientDomain`
  fungovala, kým ingest bežal na doméne kancelárie. Odkedy beží na `revolis.ai`, je
  doména príjemcu vždy `revolis.ai` a doména klienta sa s ňou nikdy nezhoduje.
  Identita kancelárie sa teraz načíta v route a odovzdá parseru.
- **Zdroj je nameraný, nie vymyslený:** `profiles.email` (12 riadkov na doméne klienta),
  `agencies.email` (v produkcii prázdne) a `inbound_mailboxes.email`. Žiadny nový stĺpec,
  žiadna migrácia, žiadny zápis do produkčnej DB — eskalácia D sa nekonala.
- **Verejné domény sa z identity vyhadzujú.** Medzi profilmi sú aj gmail adresy. Bez
  tohto filtra by maklér s osobným gmailom zahodil každého záujemcu z gmailu. Jeho
  konkrétna adresa sa aj tak vylúči presnou zhodou — presnosť bez vedľajších škôd.
- **Fallback na vylúčenú adresu padá, len keď lead má telefón.** Bez telefónu by lead
  ostal úplne bez kontaktu, čo je horšie. **Zostávajúca diera:** lead bez telefónu, kde
  jediná adresa je adresa klienta, stále dostane tú adresu. Vedomé, nie prehliadnuté.
- **Dopyt na identitu je fail-soft.** Keby zhodil request, stratili by sme dopyt kvôli
  oprave, ktorá ho má chrániť. Pri chybe sa vráti prázdna identita a parser sa správa
  ako predtým.
- **`to_missing` vs `to_unmatched`.** Dva úplne odlišné dôvody nepriradenia vyzerali
  v dátach rovnako (žiadny heartbeat). Teraz sa dajú rozlíšiť — a to je rozdiel medzi
  „oprav Worker" a „domapuj adresu".

Dôkaz: 55/55 testov v acquire oblasti, z toho dvojica, kde ten istý vstup bez identity
vráti adresu makléra (reprodukcia produkčnej chyby) a s identitou `null`. `tsc` 51 chýb
pred aj po (nula pridaných), `next build` čistý.
## [2026-09-23] — FUNNEL-PRICING-01 vykonaný: `/porovnanie-programov` už nesľubuje nákup programu

`DEC-20260921-001` rozhodol, že kanonický je **seat model** (79 / 71 / 63 € na makléra)
a že programy 49/99/199/449 € nesmú ostať aktívnym predajným funnelom. Rozhodnutie
stálo dva dni bez vykonania. #647 (`fc381004`) ho vykonalo v UI.

**Stav pred:** štyri CTA „Vybrať" / „★ Aktivovať" viedli na `/billing`, teda k seat
checkoutu. Zákazník klikol na jeden cenník a skončil v druhom — pričom **vlastný banner
stránky** (`:167`) už hovoril, že tie moduly sú na roadmape a nie v self-serve checkoute.
Stránka si teda protirečila sama so sebou, nielen s cenníkom.

**Zvolená cesta:** z dvoch schválených možností (stiahnuť stránku **alebo** prerobiť na
informačnú) padla voľba na druhú. Menej deštruktívna a cenník ostáva ako čestná informácia
o roadmape, nie ako predajný sľub.

- Štyri plan-CTA prestali byť odkazmi → statický badge **„Na roadmape"**, zhodný
  s bannerom. V kóde je komentár s dôvodom, aby to niekto nevrátil ako „chýbajúce CTA".
- Spodné CTA mieri na `/upgrade`: **„Kúpiť seaty — 79 / 71 / 63 € na makléra →"**.
- **Nedotknuté zámerne:** cenník ako roadmapa, banner `:167`, veta o garancii a
  onboardingu — to je copy/legal rozhodnutie, nie funnel.

**Overené na mergnutom `main`, nie na vetve:** `href="/billing"` má v súbore nula
výskytov; „Na roadmape" je `:237` (vnútri mapy cez všetky štyri plány); `/upgrade` CTA
je `:302-306`; `git diff d57eac1c origin/main` na tomto súbore je prázdny.

**Čo to NEODOMYKÁ.** `/upgrade` stále nevedie do Stripe. `CHECKOUT-ENV-01` je
nedotknutý — seat `price_…` ID v produkcii chýbajú a Krok A (Stripe VERIFY,
`sk_live_…`, founder lokálne) sa zatiaľ nespustil. Toto odstránilo **falošný sľub**,
nie blokádu príjmu. Kto dnes klikne na „Kúpiť seaty", dostane sa na `/upgrade`, kde
`seatCheckoutAvailable` je `false`.

---

### Sprievodné nálezy z tej istej session

**1. Ratchet `Zmluva kódu` je štrukturálne deravý.** `code-contract-guard.yml:14-18`
beží **iba na `pull_request`** s path filtrom `apps/crm/src/**` — na push do `main`
nebeží vôbec. Dlh teda neplatí ten, kto ho vyrobil; zaplatí ho prvý ďalší CRM PR.
Dnes 9 nových porušení z #581 a #579 sedí na `main`. Detail, tranžovanie a STOP
podmienky: `memory/open-tasks.md` → `RATCHET-API-CONTRACT-01`.

Kľúčový nález: tranža `usage-metrics` (4 z 9) sa **nedá opraviť bez rozhodnutia
o billingu**. `UsageMetricName` je uzavretý union šiestich hodnôt a ani jedna nesedí
na concierge ani onboarding. Splniť ratchet tam znamená pridať nové názvy metrík do
`increment_usage_metric` RPC — tabuľky, z ktorej sa odvodzuje spotreba a reporting.
Lint si teda pýta zmenu obchodného modelu.

**2. Moja chyba z #621 stála dva PR-y.** Skript pri prepise `TASK-BUS-RUNNER-2D.md`
zapísal `head + '\n---\n' + body`, kde `head` už na `---` končil. Výsledok:
`EF BB BF 2D 2D 2D 0A 2D 2D 2D 0A` — BOM plus zdvojený otvárací oddeľovač. `bus:validate`
padal na `main`, nie len na PR. Opravili to **dvaja agenti paralelne**: #648 (`988edf6b`)
a #647 (`fc381004`). Výsledné súbory sú byte-identické, takže `main` je v poriadku a nič
sa nestratilo — ale jedna moja chyba minula dva review cykly a dva Vercel deploye
na vyčerpanej hobby kvóte. Samostatne otvorené a nevysvetlené: **prečo #621 prešlo CI
zelené s rozbitým frontmatterom.**

**3. Vercel burn je merateľný.** Pri jednej kontrole boli v queue tri deploye z troch
rôznych agentných vetiev (`cursor/fix-assignment-rules-tenant-gate`,
`claude/zealous-albattani-2h32y5`, `codex/smolko-public-chatbot`) plus dva z tejto
práce. `ignoreCommand` v oboch `vercel.json` je empiricky inertný. Ignored Build Step
v dashboarde ostáva neprečítaný — founder-only krok.

## [2026-09-23] — /blueprint zrušený: predával sme metodiku nesprávnemu kupcovi

Founder sa spýtal, čo tou stránkou hovoríme, a navrhol ju zrušiť. Po prečítaní kódu
a zdrojových dokumentov som so zrušením súhlasil. Tri dôvody, všetky overiteľné:

- **Cieľová skupina si protirečí s vlastným zdrojom.** `docs/blueprint-kit/ARTIFACT-SCOREBOARD.md`
  o tom istom triu artefaktov píše „Toto trio môže **AI founder** začať používať hneď."
  Stránka to predávala majiteľovi realitnej kancelárie. Iný človek, iný problém.
- **Argumentovala proti nášmu vlastnému predaju.** Titulok znel „Majiteľ kancelárie
  potrebuje brzdu. Nie ďalší systém." Revolis je ďalší systém — a odkaz na stránku sedel
  v hlavnej navigácii landing page, teda si bral pozornosť tam, kde predávame Revolis.
- **Lievik končil v prázdne.** Všetky tri CTA viedli na `https://revolis.lemonsqueezy.com`,
  teda na holý storefront **bez cesty ku konkrétnemu produktu**. Či produkt v obchode je,
  som neoveril (odchádzajúci `curl` bol v tomto prostredí zamietnutý) a netvrdím to.

Proti PRIME DIRECTIVE: nezvyšovala pravdepodobnosť ďalšieho platiaceho klienta Revolisu
ani retenciu existujúceho. Confidence artefaktu je navyše „Medium — 1 projekt (Revolis)",
čiže sme odvetviu predávali metodiku, ktorá v tom odvetví overená nebola.

**Čo NIE je zrušené:** obsah. `docs/blueprint-kit/` ostáva nedotknutý — je to naša interná
metodika a používame ju. Zrušená je len jeho **platená verejná stránka**.

**Otvorené, zámerne nestavané:** šesť veto otázok ako **bezplatný** lead magnet napojený na
Segment A/B/C outreach je reálna možnosť. Je to však nová stena s vlastnou bránou, nie
záchrana tejto stránky — a dnes by brala čas atribúcii leadov, ktorá má sľub u klienta.

## [2026-09-22] — Wall queue W1/W2: dve steny BUILD, drift schémy BACKLOG

Rozhodovacia brána podľa `revolis-constitution-v2.md` (12-otázkový Reality Check),
záznam podľa CLAUDE.md §7. Obálky: `docs/briefs/2026-09-22-wall-queue-w1-w2.md`.

- **W1 — INGEST-CONTACT-INTEGRITY: 10/12 → BUILD.** Mechanizmus zárobku je konkrétny:
  lead, ktorého kontaktný e-mail je adresa samotného klienta, sa nedá kontaktovať
  e-mailom a automatická odpoveď odíde nesprávnemu človeku. Každý taký lead je
  zahodená provízia. Timing je vynútený zvonka — e-mail deviatim maklérom odišiel dnes.
  Moat nepridáva (otázka 4 = NIE) a nové unikátne dáta neprináša (otázka 6 = NIE);
  to skóre neťahá hore a netvárim sa, že áno.
- **W2 — INGEST-LIVENESS: 9/12 → BUILD, ale viazané na stav.** Hodnota je retencia:
  ticho v integrácii je nerozlíšiteľné od funkčného ticha a klient stratí dôveru skôr,
  než my stratíme dáta. **Nezačína, kým nepadne envelope test.** Ak Worker posiela
  hlavičku `To:`, heartbeat pri preposlanej pošte nikdy nenaskočí a pohľad by ukazoval
  deviatich mŕtvych maklérov, hoci dopyty chodia — falošný poplach, ktorý sa tvári ako
  meranie, je horší než žiadny pohľad. `on_state_change: abort`.
- **Stráž nad driftom schémy: 7/12 → BACKLOG.** Štyri legalizácie za jeden deň sú reálny
  systémový problém a stráž neexistuje. Ale na otázku 1 (zaplatil by za to dnešný klient)
  je odpoveď NIE a na otázku 3 (skracuje Lead → Provízia) tiež NIE. Chráni nás, nezískava
  ani neudržuje klienta. Parkujem to vedome, nie zabudnutím.

Obe steny majú zakázané: merge, push do `main`, zápis do produkčnej DB, zmenu
`.github/workflows` a akýkoľvek zásah do Cloudflare Workera — ten je mimo repozitára,
takže ak oprava patrí tam, stena končí nálezom, nie zásahom.
## [2026-09-22] — Working agreement: whole walls, not screws

Founder, verbatim: *„Posielaj mi na schválenie celé steny a nie skrutky."*
Originál bol prirovnanie k montovanému domu — stena sa montuje celá, nie po
jednej skrutke. Dnes požiadal, aby to bolo uložené do pamäte, nie len dodržiavané
v jednej session.

**Čo to znamená prakticky.** Jeden hotový blok na jedno GO. Žiadne desiatky
mikro-updatov („beží ~7 min", „Vercel, bez akcie"). Keď je blok hotový, príde
naraz aj s dôkazom. Keď treba rozhodnutie, príde raz — s možnosťami a
odporúčaním — nie ako séria priebežných otázok uprostred úlohy.

**Prečo to vzniklo.** Predchádzajúce session rozsypávali stav do desiatok správ a
founder musel z nich skladať obraz sám. To je presne opak toho, načo je agent.

**Kam to bolo zapísané.**
- `CLAUDE.md` Core Directives, položka 0 — číta sa pri štarte každej session.
- `uptm-runner/CLAUDE.md` — ten repozitár nemal žiadny `CLAUDE.md` ani `memory/`,
  takže session štartujúca tam nečítala žiadne direktívy. Rovnaké pravidlo je
  tam prvé.

## [2026-09-22] — Broker ingest: atribúcia musí existovať skôr, než ju sľúbim

- **Reverzia vlastného NO-GO.** Odporučil som ustúpiť od preposielania dopytov z
  maklérskych schránok; founder to odmietol s tým, že to klient navrhol sám a sľub už
  padol. Zadanie sa zmenilo z „má sa to robiť?" na „ako to spraviť tak, aby to fungovalo".
  Riešenie: **filter na zdroji** — preposiela sa len to, čo vyzerá ako dopyt z portálu,
  nie celá schránka. To zároveň ruší moju GDPR námietku o minimalizácii, ktorú som stiahol.
- **Chyba, ktorá to takmer zabila:** v čase písania e-mailu bol `assigned_profile_id`
  v `/api/acquire/email` natvrdo `null`. Mailom by sme deviatim ľuďom sľúbili priradenie,
  ktoré kód nevedel splniť. **Pravidlo:** funkcia sa komunikuje až keď existuje v kóde
  a je overená v produkcii, nie keď je naplánovaná.
- **Dedup je kontrolný bod atribúcie, nie len úspory.** Kľúč je
  `sha1(listingPortalId | contactEmail-or-phone | receivedAt)`. Keď dve doručenia toho
  istého dopytu prídu cez rôzne schránky, prehrávajúca kópia si so sebou berie signál
  vlastníctva. Preto `backfillLeadOwner` dopĺňa vlastníka aj do už existujúceho leadu —
  ale len ak je `assigned_profile_id` NULL, takže ručné priradenie nikdy neprepíše.
- **`last_received_at` je heartbeat, nie dátum prvého leadu.** Pôvodne sa zapisoval len
  pri vzniku leadu — ticho mŕtva schránka a ticho funkčná schránka vyzerali rovnako.
  Teraz sa zapisuje pri každom doručení vrátane `NOT_A_LEAD`.
- **Zostáva neoverené:** `email.to` predpokladáme ako envelope recipient. Pre skutočne
  preposlanú poštu to nikto nepreukázal. Ak je to hlavička, atribúcia sa ticho posunie.
- Dôkaz: #633 → `1723969a`, `owner_backfilled` v produkčných logoch, 8 z 9 adries namapovaných.

## [2026-09-22] — Čistá DB z migrácií ≠ produkčná DB (štvrtá legalizácia za jeden deň)

- CI padla na `relation "public.inbound_mailboxes" does not exist`. Tabuľka existovala
  **len v produkcii** — vznikla mimo migračnej sady. Rovnaký vzor ako `platform_events`
  (#619, #625), `ai_jobs` (#619) a `leads.agency_id` (#628): **štyri legalizácie za deň.**
- **Systémový záver, nie štyri incidenty.** `supabase db reset` z `apps/crm/supabase/migrations/`
  nestavia produkciu — stavia *inú* databázu, ktorá sa na ňu podobá. Každý test, ktorý
  na tom stojí, meria túto inú databázu. Zelená CI preto nehovorí nič o schéme v prode.
- **Legalizácia sa píše z nameraného stavu, nie z toho, ako mala tabuľka vyzerať.**
  `agency_id NOT NULL` **bez** FK na `agencies`, lebo tak to v produkcii je. Kde sa
  nedalo merať (RLS politiky), migrácia je **prísnejšia** než prod (RLS zapnuté, nula
  politík = deny-all) — rozdiel v tomto smere CI nerozbije, opačný by ju uspal.
- **Čo z toho ešte nie je vyriešené:** neexistuje stráž, ktorá by drift zachytila skôr
  než náhodné CI zlyhanie. Štyrikrát za deň sme sa to dozvedeli od červenej, nie od kontroly.

## [2026-09-22] — `main` je z veľkej časti neoverený: 8 z 12 posledných CI behov bolo zrušených

- Namerané: z dvanástich posledných behov `Lint, test, build` na `main` bolo **osem
  cancelled**. Príčina je `concurrency: cancel-in-progress: true` skópované na
  `workflow + ref` — na `main` každý ďalší merge zabije beh predchádzajúceho.
- **Dôsledok:** „na main je zelená CI" je pri väčšine commitov neoveriteľné tvrdenie.
  Zrušený beh nie je zlyhanie, ale ani dôkaz.
- **Navrhnutá, NEIMPLEMENTOVANÁ oprava:**
  `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}` — na vetvách šetrí minúty,
  na `main` nechá každý commit dobehnúť. `.github/workflows` je tvrdá hranica: **bez GO nie.**
- Druhý kandidát na to isté GO: pripnúť verziu `supabase/setup-cli` — beh na #635 padol na
  `Failed to resolve latest Supabase CLI release: rate limit exceeded`. Že to bolo
  infraštruktúrne a nie naše, dokázal #636, ktorý o štyri minúty neskôr prešiel.

## [2026-09-22] — Landing page: dve chyby, ktoré čítanie kódu nenašlo

- **H1 bol neviditeľný** — `globals.css:66` má holý selektor `h1{color:var(--dark)}`;
  špecificita (0,0,1) bije dedenie, takže nadpis dostal tmavú farbu na tmavom pozadí.
- **Mobilná media query sa nikdy neaplikovala** — pravidlá vnútri boli neskópované
  (`.pains`, 0,1,0), zatiaľ čo mimo nej platí `.landing-v2 .pains` (0,2,0). Výsledok:
  623 px obsahu v 390 px viewporte. Obe chyby boli v repozitári **pred** týmto blokom.
- **Nenašiel ich review, našlo ich vyrenderovanie stránky** (Playwright,
  `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`) a zmeranie šírky. Pre vizuálne
  zmeny je „prečítal som diff" slabší dôkaz než screenshot a nameraná hodnota.
- **Ceny v marketingovej kópii nesmú byť literály.** Zmätok, ktorý founder hlásil pri
  cockpite, nevznikol zo zlého čísla, ale z toho, že kanonický zdroj cockpitu
  **nedefinuje žiadne features** a čitateľ si zobral odrážky seat tieru nad ním.
  Prepis berie každé číslo z `COCKPIT_PRODUCTS` / `COCKPIT_LITE_MIN_SEATS` /
  `ownerCockpitPriceEur()` — v diffe nie je ani jedno napísané číslo.
- Farebný token pre upozornenia (`noticeGradient`) doplnený do kontraktu témy vrátane
  testu, ktorý drží 4.5:1 na každom stope. Padajúci test na zozname kľúčov bol správny —
  je to zámerná stráž kontraktu, nie prekážka, ktorú treba obísť.

## [2026-09-21] — BUS: id date bug + authority boundary as an executable invariant

- **Bug (not a fixture):** `scripts/bus/cli.ts` built the message id from `new Date()`
  while the envelope kept the draft's `created_at` → a message stored as
  `MSG-20260921-*` whose body said 2026-09-18. In a git-backed store the filename is
  the primary index, so id ≠ content is an integrity defect. `http.ts` had the same
  divergence. Both now use `idDateFor(created_at, fallback)` — one rule, one place.
- **The failing test was right.** It asserted `MSG-20260918-*` for a draft declaring
  that date; it was not touched and now passes. It had been red since 2026-09-18
  because it only fails on days other than the one it was written on.
- **Authority boundary is now a test, not a runbook sentence:**
  *the entire effect of any bus message is one file under its box directory.*
  Stronger than a blacklist of forbidden actions, which can always miss one.
  Response shape pinned to `{ok, box, id, path, digest}` so it cannot grow a field
  that reads as a grant.
- **Learned from the test, not from design:** `outbox` is write-protected over HTTP.
  A remote caller writing there could forge a message as if it came from this side.
- **107/107 bus tests.** Commits `cb1e7d8`, `47b243d`.
- **NOT deployed.** Canonical GitHub PR, production endpoint, ChatGPT Action and the
  synthetic handshake are all still open. `BUS-DEPLOY-L1` = VERIFIED LOCALLY, not DONE.
- **Blocker:** Claude GitHub App is not installed on `onlinovosk-bit/RealitkaAI`;
  push returns 403. Both commits exist only in an ephemeral container + as patches.

## [2026-09-21] — Bus was designed twice: P1 violation caught by reading the repo

- An architecture round proposed building an inter-agent bus. It already existed:
  `adr-2026-09-18-inter-agent-bus-transport-v1.md`, status IMPLEMENTED / NOT DEPLOYED,
  with the identical diagnosis and diagram, waiting three days on a founder GO.
- **Cost finding for the day:** 2757 lines produced in `uptm-runner`, of which 1488 were
  documents and 507 production code. Every design change that mattered came from
  `git clone`, `grep` and CI logs — none from relaying text between two models.
  Two LLMs agreeing is one model run twice.
- **Adopted:** standing authorization for docs/tests/new-file PRs that leave
  `rules.json` byte-identical; GO reserved for CP semantics, LIVE, credentials,
  foreign repos.

## [2026-09-18] — /upgrade checkout: fix consumer, not okResponse

- **Bug:** `okResponse` spreads payload (`{ ok, result }`); `/upgrade` čítal `data.data?.result?.url` → Stripe redirect nikdy.
- **Fix (#369 → main `30a1ba906`):** oprav konzumenta; **ne**meniť `okResponse` (kontrakt ~všetkých routov).
- **Residual:** E2E Stripe click = HUMAN (prod session). Anon 307 `/login` nie je dôkaz PASS.
- **Evidence:** `docs/reports/2026-09-18-upgrade-checkout-okresponse-fix.md`, `…-upgrade-prod-smoke.md` (#586).

## [2026-09-03] — Mapped field correctness (za „riadky existujú“)

- **Počet riadkov dokazuje existenciu, nie správnosť.** Pole z mapovania externého zdroja sa overuje proti **nezávislému signálu** z toho istého záznamu (tu: `title` vs `type` / `transaction_type`).
- **P0:** `mapCategory` **a** `mapTransaction` v `processQueue.ts` — neúplné aj **nesprávne** (13/14→Dom na bytoch; 123→Predaj pri prenájme v titule). Oprava až po oficiálnom číselníku Realvia; nie z titulov do kódu.
- **Zrušené:** „Smolko má 0 prenájmov“ / „0 predajov v realite“ ako biznis fakt z mapped stĺpcov. `status=Predaná` = 0, ale 11× `***PREDANÉ***` v title.
- **Launch Pack:** `GO IMPLEMENT` až po číselníku + mapper P0. Dôkaz: `docs/reports/2026-09-03-realvia-mapper-depth-amendment.md`.
## [2026-09-15] — North-star: split leads real/seed + config_changes attribution BUILD

- **GO:** Founder `north-star-backfill-nalezy.md` (install + amend measurement design).
- **Decision:** Treat `portal:*` as real inbound; non-portal (incl. null) as seed.
  Add human `docs/ops/config-changelog.md` as source of `config_changes_that_day`
  (Vercel env invisible to `merged_prs_that_day`). Do not invent per-day source
  counts beyond founder aggregate (24 seed / 4 real in 2026-08-17..09-16).
- **Why:** +28 leads looked like growth; 24 were seed in 23–30 Aug window. Only
  measurable prod effect in window was FOUNDER_EMAILS (unread 165→1) — no PR.
- **Artifact:** `docs/reports/2026-09-15-north-star-backfill-nalezy.md`, SQL split,
  config-changelog, START-HERE schema. PR #558.
- **Revisit:** after founder re-batch of `queries-to-run.sql` fills jsonl columns.

## [2026-09-06] — REVOLIS Inter-Agent Bus v1.0: Phase 1 copy-paste protocol BUILD

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
  app route. Alternatives considered: (a) one super-prompt — rejected because it
  hides boundaries; (b) build automated autonomous agents now — rejected as
  premature and higher-risk; (c) leave protocol only in chat — rejected because
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

## [2026-09-06] — SUPERSEDED: Smolko chatbot: internal CRM assistant BUILD, public Concierge still gated

- **GO:** Founder "Go Chatbot pre Smolka."
- **Decision:** Build only a safe internal CRM assistant slice in `/revolis-ai`,
  not the public Website Concierge.
- **Why:** Constitution value exists if it answers "komu volať a čo zachrániť
  dnes" from own CRM data. Public chatbot still has existing blockers SMO-B04
  through SMO-B09 in `docs/reports/2026-09-06-smolko-chatbot-status.md`.
- **Data source:** Master Data Sourcing Map Zhluk 1 — own CRM data (`leads`,
  `tasks`). No new external source.
- **GDPR boundary:** No OpenAI/Claude/embedding call for chat questions; no new
  external processor for Smolko CRM content in this slice. Public Concierge still
  needs SMO-B05 before launch.
- **Engineering justification:** Trigger: new API route, component, lib and
  tests. Decision path: reuse — existing `/revolis-ai` surface, `listLeads`,
  `listTasks`, `api-response`, `api-validate`, `incrementUsageMetric`,
  `createClient`, Slate Horizon tokens. Alternatives considered: public
  Concierge now (rejected — SMO-B04–B09 blocked), LLM chat over CRM PII
  (rejected — GDPR/provider gate), new DB tables (rejected — not needed).
  Contract telemetry uses `usage_metrics_daily` metric `ai_chatbot_queries`.
  Contradiction check: none; public chatbot remains explicitly blocked.
- **Artifact:** `docs/reports/2026-09-06-smolko-crm-chatbot-mvp.md`.

> Tento záznam je historický a nahrádza ho nasledujúce rozhodnutie po spresnení zákazníka. Uvedený report bol odstránený; jeho obsah zostáva dostupný v Git histórii.

## [2026-09-06] — Reality Smolko chatbot: internal CRM panel REVERT, Voiceflow guide BUILD

- **Trigger:** zákazník výslovne opravil zadanie: chatbot patrí na verejný web Reality Smolko a má sa pýtať na druh nehnuteľnosti, zámer a lokalitu.
- **Evidence:** `https://www.realitysmolko.sk/` už má vložený Voiceflow projekt s launcherom „Poraďte sa!“; Creator v aktuálnom prostredí vyžaduje prihlásenie.
- **Decision:** odstrániť interný `/revolis-ai` panel, API a CRM engine. Použiť existujúci Voiceflow projekt, nie nový Revolis chatbot. Prvý tok je bez PII, CRM zápisu, bookingu a neovereného filtračného endpointu.
- **Artifact:** `docs/briefs/BO-smolko-voiceflow-correction.md`, `docs/voiceflow/reality-smolko-property-guide-v1.md`, `docs/reports/2026-09-06-smolko-voiceflow-audit.md`.
- **External gate:** zmenu canvasu a publikovanie vykoná vlastník po sprístupnení Voiceflow projektu; skript na webe sa nemení.



## [2026-09-05] — Strážca prítoku BUILD (Brief 18 V2)

- **GO:** Founder „Strážca GO.“
- **Scope:** doručenie unread `routine_notifications` + Realvia 48h/7d prahy (nie customer-health L2).
- **Brief:** `task-strazca-pritoku.md` v Downloads chýbal → kanon = Brief 18 V2.
- **Artefakt:** vetva `feat/b18-notification-delivery`, report `docs/reports/2026-09-05-strazca-pritoku.md`.
- **STOP:** merge / PROD smoke / secrets = founder.

## [2026-09-03] — GO P0 HONEST UNKNOWN MAPPING

- Neznámy Realvia kód → **`Neznáme`**, nie fog do `Ostatné` / `Predaj`.
- Sporné známe: **13/14** a **123** → `Neznáme` (neodvodzovať Byt/Prenájom z titulov).
- Guardian: `unverified_property_type` / `unverified_transaction_type` blokuje pass.
- Backfill 132 = samostatné GO. Číselník od Realvie stále treba.
- Dôkaz: `docs/reports/2026-09-03-realvia-honest-unknown-mapping.md`.

## [2026-09-03] — Property Launch Pack V0 = VALIDATE/spec (no code yet)

- **Verdikt:** zjednotiť KF1 `listing-content` + Wave 1 `vertical-pack-demo` cez jeden kanonický vstup a jeden Quality Guardian gate; export bez publish; **bez novej DB**; bez chatbota.
- **Prod limity v IR:** `properties` 132 Smolko; Ostatné **65,2 %**; `ai_generations` na prod **chýba**; mapped type/txn **nespoľahlivé**.
- **Implementácia:** STOP do číselníka Realvia + mapper P0, potom `GO IMPLEMENT PROPERTY LAUNCH PACK V0`.
- **Artefakty:** `docs/briefs/BO-property-launch-pack-v0.md`, `docs/reports/2026-09-03-property-launch-pack-integration.md`.

## [2026-09-03] — Audit kódu nie je audit dát

Ku každému tvrdeniu „toto už máme“ sa dokladá **počet riadkov v produkcii**, nie existencia súboru. Platí pre briefy, roadmapy aj Integration Reporty. **Doplnok:** riadky ≠ správnosť mapped polí (pozri záznam Mapped field correctness vyššie).

**Doplnok:** počet riadkov ≠ správnosť. Mapped polia overovať proti nezávislému signálu (`title`). Neznámy kód → `Neznáme` (P0 honest unknown), nie fog do legitímnej kategórie.

## [2026-09-03] — customer-health PROD smoke PASS

- `GET https://app.revolis.ai/api/cron/customer-health` + Production `CRON_SECRET`: 401 without/wrong bearer, 200 with secret.
- Smolko `11111111-…-111` **red**, paying, `LEAD_SILENCE` 37 dní + `NEVER_LOGGED_IN_SHARE` 92 %. Persist 4 rows. Dôkaz: `docs/reports/2026-09-03-customer-health-smoke.md`.

## [2026-09-03] — customer-health tabuľka na PROD + cron na main

- **#507** merged `203829403` (Vercel cron `0 7 * * *` → `/api/cron/customer-health`).
- **PROD** `ypgajkhqtbriqqmyawyv`: `public.customer_health_daily` už stála (RLS on, 0 policies, 0 rows). GO SQL = zapísaný `supabase_migrations.schema_migrations` `20260903070000` / `customer_health_daily`.
- **Dôkaz:** `docs/reports/2026-09-03-customer-health-sql-applied.md`.
- Live Bearer smoke (Smolko red) = ďalší GO.

## [2026-09-02] — PROD `profiles` UPDATE: vždy service_role + RETURNING

- **Opakovaný incident (3×):** `profiles_guard_*` triggery (`role`/`agency_id`, `account_tier`/`ui_role`, `is_platform_admin`) **ticho vrátia** zmenu, ak UPDATE nebeží ako `service_role`. Dashboard SQL bez `SET LOCAL` vyzerá úspešne, ale `RETURNING` ukáže starú hodnotu — alebo sa zmena vôbec neprejaví.
- **Pravidlo (povinné):** Každý PROD `UPDATE` na `public.profiles` sa robí v transakcii so `SET LOCAL request.jwt.claim.role = 'service_role'` a s `RETURNING`. Bez výnimky.
  ```sql
  BEGIN;
  SET LOCAL request.jwt.claim.role = 'service_role';
  UPDATE public.profiles SET … WHERE … RETURNING id, email, …;
  COMMIT;
  ```
- **Overenie:** `RETURNING` musí ukázať očakávanú hodnotu. Ak nie — trigger zasiahol; STOP, nie „asi OK“.
- **Kontext #496:** `profiles.id` ≠ `auth.uid()` na PROD → platform-admin gate musí lookupovať cez `.or(auth_user_id.eq.{uid},id.eq.{uid})` (vzor `/trh`, #469).
- **Dotknuté:** `fetchProfilePlatformAdminFlag`, `canAccessOperatorDashboard`, grant `is_platform_admin` po migrácii `20260728140000`.

---

## [2026-08-25] — ONL-MCP-001: BUILD gateway, DON'T BUY Premium-for-MCP

- **Rozhodnutie (agent recommendation, founder ešte nepodpísal):** stavať vlastný vendor-neutral Onlinovo MCP Gateway; **nekupovať** Shoptet Premium výhradne kvôli oficiálnemu MCP (floor 12 000 Kč/měs.). Implementácia **STOP** do `GO ONL-MCP-002`.
- **Timing:** founder override — audit **dnes v noci** 25. 8. 2026, nie 26.→27. 8.
- **Fakty:** Onlinovo.sk = Shoptet (verejný fingerprint). Tarif Premium vs standard = **NEZNÁME**. REST API len cez marketplace addon; Shoptet nepíše cestu „API pre jeden e-shop“.
- **Artefakt:** `docs/onlinovo/ONL-MCP-FEASIBILITY.md`, `docs/reports/2026-08-25-onl-mcp-001-feasibility.md`, TASK-0005 done.
- **Mimo:** `apps/crm`, prod Shoptet write, ONL-MCP-002/003/004.

---

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

## D-2026-08-18-02 — GPT Sol ↔ Opus 5 komunikácia: kontrakt pred runtime

**Rozhodnutie:** Autonómna komunikácia medzi GPT Sol a Opus 5 sa nespúšťa ako
runtime automatizácia. Najprv vzniká repo-mediated kontrakt:
`docs/architecture/gpt-sol-opus5-autonomous-communication.md`.

**Verdikt Ústavy:** VALIDATE / CONTRACT ONLY. Priamy model-to-model runtime je
príliš skoro, kým neprebehne jeden manuálny Sol↔Opus trial s repo artefaktmi,
bez scope driftu a bez neodobrených akcií.

**Hranice:** žiadne PROD write, merge, secrets, externé odoslanie ani provider API
loop bez samostatného founder GO. Max 3 model turns pred founder rozhodnutím.

**Engineering justification:** Trigger: new-file. Decision path: reuse —
kontrakt rozširuje existujúce vzory Ruflo orchestration, LLM Gateway routing,
AI Security, task-loop a repo-as-communication-channel. Alternatives considered:
direct model API loop (zamietnuté — hidden state/tool abuse), Ruflo runtime hneď
(zamietnuté — bez trialu príliš skoro), chat-only memory (zamietnuté — nie je
SSOT). Contradiction check: none; dokument zužuje, nie rozširuje oprávnenia.

## D-2026-09-06-01 — GPT Sol ↔ Opus 5 trial: manuálny formát PASS, runtime STOP

**Rozhodnutie:** Prvý manuálny Sol↔Opus trial prešiel iba ako formát
repo-mediated komunikácie. Runtime/provider-to-provider automation zostáva STOP.

**Dôkaz:** `docs/ai-comms/2026-09-06-trial/` obsahuje brief, Sol draft, Opus
review, Sol revision a final verdict. Opus našiel konkrétne FLAGy; Sol scope
zúžil; verdict drží merge/PROD/secrets/external send/runtime automation za
founder GO.

**Hranica použitia:** Sol↔Opus manuálny protokol používať len pre high-risk
architecture, implementation planning, PR review, security/auth/billing/RLS,
migrations a data/legal source gates. Nepoužívať na rutinný status alebo malé
copy/code zmeny.

**Neznáme:** Pôvodný externý Notebook nebol obnovený; trial vytvára repo-native
náhradu, nie import pôvodnej diskusie.
## D-2026-08-18-01 — Acquire email idempotency: deterministic lead id

**Rozhodnutie:** Follow-up k #439 nepoužije novú tabuľku ani PROD migráciu. `POST /api/acquire/email`
odvodzuje `leads.id` deterministicky z `acquire_dedup_keys.key`; retry po neznámom
Supabase commit stave teda narazí na rovnaký primary key a vráti existujúci lead
namiesto vytvorenia duplikátu.

**Prečo:** Samotné zmazanie dedup claimu po `leads.insert` errore rieši permanentnú
stratu pri skutočnom fail-e, ale pri HTTP timeoute/aborte nevie, či insert v DB
nakoniec commitol. Deterministický primary key robí retry idempotentným bez schémy.

**Engineering justification:** Trigger: critical bug follow-up. Decision path: reuse
existujúci `leads.id text primary key` + `acquire_dedup_keys.key`; žiadna nová
dependency, tabuľka ani RPC. Alternatives considered: nový inbound event stĺpec
(zamietnuté — migrácia/PROD apply pre úzky hotfix), ponechať #439 rollback bez
ďalšej brzdy (zamietnuté — duplikát pri unknown commit), transakčný RPC
(zamietnuté — väčší DB surface). Contradiction check: none; dopĺňa #439 bez
zmeny Stage 1/Acquisition scope.

**Súbory:** `apps/crm/src/app/api/acquire/email/route.ts`,
`apps/crm/src/app/api/acquire/email/__tests__/route.test.ts`,
`apps/crm/tests/verification/acquire-email-gateway.verification.test.ts`,
`docs/reports/2026-08-18-acquire-email-idempotency-followup.md`.
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

## [2026-08-24] — Action Center V0 + Pricing v2: spec check-in, implementácia NIE

- **Rozhodnutie:** Dva oddelené BO v repe. Runtime, Stripe, migrácia, merge produktového kódu **nezačínajú**. Autorizácia neskôr len frázami `GO IMPLEMENT ACTION CENTER V0` a `GO IMPLEMENT PRICING V2` (každá zvlášť).
- **Baseline:** `origin/main` `47ec485275166f00671945ed3fd928fac5271508` (fresh fetch pred zápisom). Zhodné s `platné_voči` v zdrojovom BO.
- **Dôvod 349 € (draft do implementačného PR):** seat = používanie maklérom; Cockpit = riadenie firmy; jeden zachránený obchod > mesiace predplatného; oddelenie ARPA. Číslo v `pricing-v1.md:24` ostáva; tento odsek je zárodok decision recordu, nie zmena ceny.
- **Artefakty:** `docs/briefs/BO-action-center-v0.md`, `docs/briefs/BO-pricing-migration-v2.md`, `docs/reports/2026-08-24-bo-action-center-pricing-review.md`
- **Veto:** `feat/bridge-harness` sa na túto prácu nepoužíva.

## [2026-08-24] — GO FÁZA A: filter vs hľadanie (copy), paging ako samostatný GO

- **Rozhodnutie:** Topbar + LeadFilters pomenovať ako filter nad zobrazenými. Semantic box ostáva jediné „Hľadať“. Z placeholderu von „províziu“ (filter hľadá 8 polí, provízia medzi nimi nie je). Stránkovaciu dieru **neopravovať** v tejto fáze.
- **Prečo:** Po #461 ožil klamlivý placeholder; client-side `q` nad stránkou 50 pri ~480 leadoch vráti „nenájdené“ pri existujúcom leade. Lepší text „Hľadať“ by dieru prekryl.
- **Dôsledok:** #463 nesie audit + copy. Oprava inventory/`q` na serveri čaká `GO SEARCH-PAGING` (vrátane `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`: globálna lišta pomenovaná ako lokálny filter).
- **Artefakt:** `docs/reports/2026-08-24-workdesk-search-architecture-audit.md` (nálezy `SEARCH-PAGING-CLIENT-FILTER`, `SEARCH-TOPBAR-GLOBAL-VS-LOCAL`)

## [2026-08-21] — Branch cleanup GO withdrawn → NEEDS-EVIDENCE

- **Rozhodnutie:** Stiahnuť GO na zmazanie ~208 remote vetiev. Most verdikt NEEDS-EVIDENCE prijatý.
- **Prečo:** Vzorka 4/208 (~2 %) nestačí; neoverený shallow clone pri Cursor analýze; tip SHA drift; chýbajú backup refs `refs/cleanup/2026-08-21/<branch>`.
- **Dôsledok:** TASK-0003 evidence pack (full clone, N tip SHA, backup refs, full cherry, edge policy) pred akýmkoľvek delete GO. Smolko Gmail dual-run (#422 na main) je samostatná P0 — neblokovať cleanup evidence.
- **Artefakty:** `.ai/bus/outbox/MSG-20260821-007-…`, `.ai/bus/tasks/TASK-0003.md`, `docs/reports/2026-08-21-branch-cleanup-needs-evidence.md`

## [2026-06-27] — Smolko leads: verify, clean, capture (prenesené z decisions.md, 2026-09-04)

- Context: Hotfix ensured lead write path now uses scoped Supabase client and server-derived `agency_id`.
- Action taken: removed temporary diagnostic log from `apps/crm/src/app/api/leads/route.ts`, added SQL script `infra/sql/cleanup-test-leads.sql` to inspect/delete test leads, and recorded this decision.
- Lesson / Scar: Always remove debug logging from hot-path before merge; prefer manual compile verification after merges and avoid automated merge tools without review.

## [2026-09-16] — Sales funnel platform-admin gate BUILD

- **Decision:** Gate `/sales-funnel` + `POST /api/sales-funnel/update-status` to `is_platform_admin`.
- **Why:** HIGH — any tenant session could mutate/view Revolis SaaS prospect pipeline (open saas_leads RLS + no app gate).
- **Artifact:** `docs/reports/2026-09-16-critical-bug-sales-funnel-platform-admin.md`
- **Revisit:** RLS migration to deny non-admin on saas_leads (residual DB path).
## 2026-09-14 — ADR Soft Factory V1 Minimum (NÁVRH, nie GO)
- Ingest: `docs/architecture/adr-2026-09-11b-software-factory-v1-minimum.md`
- Odporúčanie: deterministická kostra (Contract/Judge-runner/Ledger/hard limits) pred AI vrstvami; pilot na BUS, nie coding loop.
- Čaká founder na #1 a #4. Report: `docs/reports/2026-09-14-adr-software-factory-v1-minimum.md`.

## [2026-09-18] — GTM Playbook: reframe z „CRM/AI" na „zdroj predávajúcich" — NÁVRH

- **Artefakt:** `docs/sales/gtm-playbook-2026-09-18.md` (8 stratégií + 80/20 majiteľa RK + 8 akvizičných nápadov + 30/60/90).
- **Kľúčový dôkaz (už v repe, nie nový výskum):** trh trikrát nezávisle odmietol AI/CRM ponuku,
  lebo *„nikto im nedodá klientov, ktorí chcú predať"* (`decisions.md:501`, Molnár 7/2026,
  Suchý 5.8.2026, ARCHEUS). Zákazník sám pomenoval wedge: „CRM nie, vyhľadávanie predávajúcich áno".
- **Cenová kotva trhu:** 300 €/tip (REALITY KAMZÍK, `docs/sales/call-list-2026-07-w30.md`) —
  jediná overená kotva v repe; silnejšia referencia než interná úvaha o 349 €/mes.
- **Stav loopu:** 31 dní `matches=intents=outreach=viewings=closed_won=0`, `activities=3`
  (`docs/reports/2026-09-15-north-star-backfill.md`). Diagnóza: problém NIE je akvizícia leadov,
  ale **packaging → dôkaz → aktivácia → distribúcia** v tomto poradí.
- **Revízia predpokladu (dôležité):** VETO na valuačný widget z 2026-07-19 znelo „chýba licencovaný
  reprodukovateľný zdroj cenových dát". **Tento predpoklad už neplatí v pôvodnom rozsahu** — NBS dalo
  písomné povolenie 2026-08-10 na komerčné použitie verejných krajských radov €/m² s povinnou
  atribúciou (`docs/legal/nbs-povolenie-2026-08-10.md`). Chýba už len koeficient realizačná/ponuková
  (`blocked_unpaired`, `docs/reports/2026-08-15-nbs-kraj-rady-v0.2.md`) = **presnosť, nie legalita**.
- **Rozhodnutie:** žiadne. Dokument je NÁVRH. Ďalší krok = founder GO na rozsah tvrdenia widgetu (S2).
- **Explicitne NEodporúčané:** nový acquisition stack, kúpené databázy, scraping vlastníkov/osobných
  údajov, akadémia/komunita/certifikácie (cargo cult pri 1 zákazníkovi), claim „layer nad všetkými CRM"
  (zaslúžený je dnes iba voči Realvii).
- **GDPR gate otvorený:** A1 (RPO outreach zoznam) a S4 (audit cudzieho exportu) vyžadujú beh
  `gdpr-advisor` + balancing test 6(1)(f) + čl. 14 pred prvým reálnym použitím.

## [2026-09-18] — Founder GO: S1, S3, S8, A4, A8 (0 € engineering) + S2 s rozporom

- **GO udelený** na paralelný beh úloh bez engineeringu. Artefakty:
  - S1 → `docs/sales/positioning-v1-zdroj-predavajucich.md` (kategória „zdroj predávajúcich", zakázaný slovník, smieme/nesmieme tvrdiť)
  - S3 + A8 → `docs/sales/segmentacia-a-b-c-outreach.md` (segment podľa CRM: A=Realvia, B=iný, C=Excel; poradie A→C→B; tracker polia riešia D5-7; sezónne okno)
  - S8 → `docs/ops/founder-time-protocol.md` (triage 54 otvorených PR)
  - A4 → `docs/sales/realitna-unia-druhy-kontakt-draft.md` (NEODOSLANÉ)
- **Oprava vlastného odporúčania (S8):** auto-merge lane NEtreba definovať — `docs/AUTOMERGE-POLICY.md`
  v1.0 + workflow + script už existujú a Tier 1 pokrýva `docs/**`. Moje pôvodné znenie bolo nepresné.
- **Nález S8-A:** 24 z 54 otvorených PR (44 %) je **draft** → nedajú sa zmergovať z definície.
  12 z 18 PR v kope „blokuje zákazníka" je draft. Diagnóza nie je „nestíham merge", ale „nikto neklikol Ready".
- **Nález S8-B:** `#189/#191/#192` nesú label `automerge` od 2026-06-11 a sú stále otvorené.
  Príčina NEOVERENÁ (robot / stale s main / červené CI) — netvrdí sa ktorá.
- **Nález S8-C:** `#437` (`leads.last_contact_at`) blokuje S6 (ranný zoznam) aj Zhluk 1. Tier 3 (migrácia).
- **S2 — ROZPOR, neimplementuje sa:** founder odpovedal „GO S2", ale na Q1 („zobrazuje widget ponukovú
  úroveň NBS s explicitným označením?") odpovedal **nie**, pričom Q3 (schváliť znenie atribúcie NBS)
  odpovedal **áno**. Q1=nie a Q3=áno sú nezlučiteľné — bez zobrazenej NBS úrovne nie je čo atribuovať.
  **Žiadny kód sa nepíše, kým sa Q1 neujasní.** Dôvod prísnosti: precedens +40 % chyby kalkulačky
  (`decisions.md:584`) — publikovanie cenového údaja bez explicitného zámeru foundera je AP-001 riziko.
- **Q2 potvrdené:** koeficient realizačná/ponuková ostáva `null` a nepublikovaný, kým sa nespáruje jednotka.
- **Poznámka k tooling:** `gdpr-advisor` skill, ktorý CLAUDE.md vyžaduje pre A1/S4, **nie je v tejto
  session dostupný** (nie je v zozname skills). GDPR brána pre A1/S4 preto ostáva formálne nesplnená.
## [2026-09-18] — Inter-Agent Bus: transportná vrstva v1 BUILD (deploy = samostatný GO)

- **Rozhodnutie:** BUILD. Bus prestáva byť len protokol/governance vrstva a dostáva
  skutočný transport: `packages/bus-core` (v1 envelope, validácia, digest, file +
  GitHub store, HTTP handler), `scripts/bus/cli.ts`, `scripts/bus/serve.ts`,
  OpenAPI schéma pre ChatGPT Custom GPT Action. Nula nových runtime závislostí.
- **Prečo:** Founder bol API medzi ChatGPT a Claude Code. Náklad: latencia na každom
  handoffe, strata kompresie (3 000 slov namiesto 15-riadkového digestu) a správy,
  ktoré nikdy nedopadli do repa. Constitution otázka 1 = NIE (nikto za to nezaplatí),
  ale 7/8/9/11 = ÁNO — berie sa ako execution leverage, nie feature; preto sa drží
  malý (žiadna DB, žiadne UI, žiadny orchestrátor).
- **Dôsledok:** Git zostáva single source of truth — správa = commitnutý súbor.
  `v: 1` správy sú validované a blokujú `bus:validate`; 35 pre-v1 správ sa
  **neprepisuje**, hlásia sa ako warning. Gate sa nemení: bus prenáša, nevykonáva
  a neschvaľuje; `GO REQUIRED`/`STOP` naďalej patria founderovi.
- **Otvorené (founder GO):** D1 kde beží HTTP transport (tunel / samostatný host /
  mount v `apps/crm` — odporúčam tunel, potom samostatný host) + vydanie
  `REVOLIS_BUS_TOKEN`; D2 `bus:validate` ako CI krok; D3 migrácia pre-v1 správ
  (odporúčam nie). Bez D1 ChatGPT na bus nedosiahne a copy-paste trvá ďalej.
- **Dôkaz:** `npm run bus:test` 61/61; `npm run bus:validate` 41 súborov, 0 errors.
- **Artefakty:** `docs/architecture/adr-2026-09-18-inter-agent-bus-transport-v1.md`,
  `docs/prompts/revolis-bus-openapi.yaml`, `.ai/bus/outbox/MSG-20260918-001-bus-transport-v1.md`

## [2026-09-18] — Founder Acquisition Research Loop: rámec prijatý, tri nálezy ho menia

- **Prijaté:** founderov rámec `Pain → Diagnostic → Proof → Pilot → Outcome → Subscription`
  nahrádza trojdelenie (problém / owner / akvizícia). Artefakt: `docs/sales/founder-acquisition-loop-2026-09-18.md`.
- **Nález 1 (najdôležitejší):** „Revenue Leakage Audit" / product-led diagnostic **už existuje** —
  `/proof` je SHIPPED od 2026-07-06 (#275) vrátane leak enginu `apps/crm/src/lib/proof/`
  (`responsePenalty`, `lostShare`, `avgRevenuePerDeal`). Za 3 mesiace **0 reálnych prospectov**
  (`saas_leads`=14, z toho 11× `source=proof`, všetko smoke/test — D5-1/D5-6).
  **Úzke hrdlo nie je nástroj, ale návštevnosť.** 30-dňový plán váži 80 % úsilia na dopravu.
- **Nález 2:** citované NAR čísla (CRM 23 % vs. social 39 %; 66 % čas; 64 % CX; 63 % obava o presnosť AI)
  sú **US trh**, z tejto session neoverené → PREDPOKLAD, nie dôkaz o SK majiteľovi RK.
  Navyše CRM 23 % < social 39 % argumentuje *proti* vedeniu komunikácie cez CRM.
  Pri konflikte s 3 priamymi SK rozhovormi (`decisions.md:501`) vyhráva lokálny dôkaz.
- **Nález 3:** Founder Dashboard je **data-blocked** — `activities`=3/31 dní, `matches_new`=0,
  `leads.last_contact_at` visí v nezmergovanom `#437`. Postaviť ho dnes = nuly alebo AP-001.
  Q8 „príliš skoro"; odomkne sa po S6 (ranný zoznam).
- **Ústredný konflikt zaznamenaný:** H1 „nedostatok predávajúcich" (priamy SK dôkaz) vs.
  H2 „únik na existujúcich leadoch" (founder rámec + US prieskum). Nezlučiteľné v jednej prvej vete.
  **Experiment E0** (split otváracej vety, 20/20, rozhodovacie pravidlo stanovené vopred) je prvá úloha.
- **Stratégia C „Shadow CRM" (14 dní, read-only)** vyhodnotená ako najsilnejší nový prvok —
  jediná ponuka, ktorá od majiteľa nechce žiadnu zmenu správania. BUILD po GDPR bráne.
- **Stratégia E (benchmark)** → Strategic Backlog, timing veto (1 zákazník). Odomkne sa pri ≥ 8 RK s 30 dňami dát.
- **Engine 3 (founder-to-founder, „hľadám 5 RK")** sa zhoduje s nezávisle odvodeným S7 →
  dve nezávislé odvodenia, priorita. Engine 4 (case study) blokovaný chýbajúcim súhlasom s menovaním.
- **Otvorené brány:** G1 GDPR B2B outreach · G2 GDPR cudzí export · G3 S2 rozsah (nezodpovedané) ·
  G4 `#437` do PROD · G5 súhlas s menovaním.
## [2026-09-18] — D1 = GO: Cloudflare Tunnel ako dogfood transport BUS (nie produkčná infra)

- **Rozhodnutie:** D1 = **GO**. Prvý dogfood ChatGPT ↔ Claude ide cez Cloudflare Tunnel.
  Tunel je **výslovne validačný/dogfood transport, nie finálna produkčná infraštruktúra
  BUS.** Jeho úloha je zodpovedať jednu otázku za 30 minút: funguje
  `ChatGPT → BUS → Claude → BUS → ChatGPT` bez foundera? Permanentný endpoint
  (stabilný host/VPS) a robustnejšia vrstva (observability, MCP, cost governor,
  orchestrator) sú samostatné rozhodnutia — dnes sa neriešia.
- **Backend nie je detail:** slučku `ChatGPT → BUS → Claude` zatvára **len github backend**
  (`REVOLIS_BUS_GITHUB_TOKEN` + `REVOLIS_BUS_REPO` + vetva `bus/main`). Pri default
  **file** backende skončia správy v lokálnom checkoute a founder ich musí `commit && push` —
  handshake by „prešiel", ale poštár by zostal, len s viac krokmi.
- **Otvorený risk:** `GitHubBusStore` je **neoverený proti reálnemu GitHub API**
  (unit testy bežia proti fake fetchu). Pokus o živé overenie z cloud kontajnera vrátil `401`;
  **401 nie je dôkaz funkčnosti ani chyby** — token v tom prostredí nie je GitHub API
  credential a príčinu sa nepodarilo doložiť. Prvý reálny POST je zároveň prvým testom
  tejto cesty; zlyhá hlasno (`GitHub write failed (4xx)`).
- **Bezpečnosť:** `REVOLIS_BUS_TOKEN` (ani PAT) sa **nikdy** neposiela cez chat, nekomituje
  do repa, nedáva do `.md`, do OpenAPI YAML, do GitHub issue/PR, do promptu pre agenta
  ani do BUS správy. Výhradne environment variable. OpenAPI popisuje mechanizmus
  autentifikácie, nikdy tajomstvo.
- **Ďalší krok:** founder-side runbook (`docs/ops/bus-handshake-runbook.md`), kroky 1–7:
  token → PAT → `bus/main` → `bus:serve` → overiť `store: github` → `cloudflared` →
  `npm run bus:handshake -- --url <tunel>`.
- **Stav míľnika — bez prikrášlenia:** BUS transport + harness = hotové (#589, #590 na `main`).
  **Founder-free agent-to-agent komunikácia = ešte nedokázaná.** Až handshake proti živému
  endpointu je prvý skutočný dôkaz, že founder už neprenáša správy medzi SOL a Claudom —
  a je to významnejší míľnik než samotný merge.

## [2026-09-18] — Ekonomika majiteľa RK → akvizičný systém (master prompt deliverable)

- **Artefakt:** `docs/sales/owner-economics-acquisition-system-2026-09-18.md` — ekonomický model
  majiteľa, strachy, spúšťače nákupu, mapa námietok, cenová psychológia, štruktúra pilotu,
  rebrík dôkazov, experimenty E1–E6. Zámerne NEopakuje 80/20, 8 stratégií ani 30-dňový OS (#588).
- **Kľúčový rozklad (§1.2):** Revolis siaha len na páku (A) objem dopytov a (B) miera dovolania sa
  včas. Na (C) exkluzivitu, (D) schopnosť predať a (E) províznu sadzbu **nesiaha**. Sľubovať ich
  = nevymáhateľná záruka a stratený zákazník v 90. deň.
- **Dôsledok pre pilot:** pilot sa **nemeria počtom uzavretých obchodov**, ale časom do prvého
  kontaktu, počtom dopytov z kalkulačky a % kontaktovaných v SLA. Záruka ohraničená cenou pilotu.
- **Nový cieľový segment T5:** RK, ktorá platí Ads na „ocenenie nehnuteľnosti" a nestíha reagovať —
  jediný spúšťač detekovateľný z verejných zdrojov; najlepší dnes zostaviteľný zoznam.
- **Uzatváracie námietky O3 („makléri to nebudú používať") a O7 („čie sú naše dáta")** — bez
  pripravenej písomnej odpovede sa stráca obchod, ktorý už bol vyhraný.
- **Korekcia founderovho vstupu:** #588 **nie je merged** (GitHub API: `state=open, merged=false`;
  žiadny zo 6 dokumentov nie je na `main`). Merged bol **#437** — migrácia
  `20260817220000_p0_schema_alters_leads_profiles.sql` s `last_contact_at`.
- **Brána G4 čiastočne zavretá:** migrácia je na `main`, ale **aplikácia v PROD neoverená**
  (pravidlo „audit kódu nie je audit dát"). Ranný zoznam ostáva blokovaný do PROD overenia.
- **349 € Cockpit** označené ako DRAFT, nie cena — nepoužívať ako fakt do podpisu.
## [2026-09-18] — Founder Control Plane: substrát BUILD / plocha BACKLOG

- **Vstup:** founder téza „FOUNDER CONTROL CENTER / BUSINESS CONTROL PLANE — Architecture Discovery & North Star v1.0" (§0–§29).
- **Ústava (2 verdikty, nie 1):**
  - Control Plane ako **produktová plocha** (§21 navigácia, 6 fáz): **4/12 + veto Q8 (príliš skoro) + veto Q1 (klient nezaplatí) → STRATEGIC BACKLOG.** Odomkne: 5 platiacich zákazníkov podľa ADR-004 (`decisions.md`, 2026-08-03). Dnes 1 (Smolko).
  - Control Plane **substrát** (§3 events, §5 decisions, §6 authority, §12 cost): **BUILD**, 4 rezané kusy (P0-CP-1..4), každý ≤2 týždne a samostatne užitočný.
- **Dôvod rozdelenia:** `brain/ENGINE.md` §2 má „vytvoriť founder dashboard" v zozname toho, čo GO neznamená; §3 varuje pred customer avoidance. Substrát však nie je Center — je to dlh blokujúci už postavený `/operator`.
- **Päť nálezov z konfrontácie:** (1) osem event tabuliek, `public.events` bez `agency_id`/`correlation_id` → cross-tenant agregácia nemožná; (2) decision memory rozseknutá founder-markdown vs `public.decisions`; (3) `lib/capabilities/_shared/human-approval.ts` drží approvals v in-memory `Map` — na serverless nedurable; (4) cost→outcome je jeden view, nie fáza (`ai_action_audit.lead_id` už existuje); (5) kontrakt §27 je jediný komponent, čo sa nedá dorobiť neskôr bez refaktoru agentov.
- **Zámena pojmov (AP-006):** `lib/research-agent/` = lead dossier builder, NIE Research Engine zo §14. Premenovať pred spec.
- **GDPR brána:** `events` nesie `ip_hash`/`user_agent`; cross-tenant čítanie founderom vyžaduje `gdpr-advisor` + 6(1)(f) balancing test pred P0-CP-1.
- **Súbory:** `docs/architecture/founder-control-plane-v1-repo-confrontation.md`
- **GO brány:** `GO CP-EVIDENCE` (read-only PROD meranie) · `GO CP-SPEC` (spec len pre 4 kusy) · `GO CP-P0-1..4` · `GO CP-FULL-SPEC` (v rozpore s ADR-004, vyžaduje zapísanú odchýlku).
- **Otvorená otázka na foundera:** platí prah „Center: 5 platiacich", alebo sa prepisuje? ADR-004 odchýlku povoľuje so zapísaným dôvodom a dátumom revízie.

## [2026-09-18] — CP-EVIDENCE: PROD audit vyvrátil tri tvrdenia konfrontácie

- **Brána:** `GO CP-EVIDENCE` (founder). Read-only, iba SELECT, PROD `ypgajkhqtbriqqmyawyv`, merané 08:58–09:05 UTC.
- **Report:** `docs/reports/2026-09-18-CP-EVIDENCE-REPORT.md`
- **Opravy predchádzajúceho dokumentu (FAKT):**
  1. `ai_action_audit` **nemá** `cost_eur`/`model`/`latency_ms`/`credits_spent` na PROD — tvrdenie bolo z kódu, nie zo schémy.
  2. cost→outcome **nie je jeden view**: 0/146 riadkov má cost, 0/146 má `lead_id` (`persist-cost-telemetry.ts:66` píše `null` natvrdo), `lead_conversions` na PROD neexistuje, `deal_outcomes` = 1 riadok.
  3. `public.events` = **0 riadkov** — nikdy nezapísala. Reálny spine je `platform_events`: 1 417 riadkov, 2026-04-12→2026-09-15, **100 % s `agency_id`**.
- **Najzávažnejší nález:** `lead_events` = 0 riadkov → `/operator` `reaction24hPct` bude `unavailable` pre všetkých; Guardian v1.1 STALE pravidlo sa nikdy nespustí (závisí od `lead_events`).
- **Uzatvorené P0 zo 17. 8.:** `leads.last_contact_at` **NEEXISTUJE** — na PROD len `last_contact` (text, NOT NULL). `lib/operator/gather.ts` ho číta → 42703 → Kontakty 7 d + Trend 14 d spadnú. Zapnutie `OPERATOR_DASHBOARD_ENABLED` nie je pripravené, a blokér nie je flag.
- **Migrácia `20260728140000`:** history row **chýba**, ale `profiles.is_platform_admin` **existuje** a **1 profil má grant**. `schema_migrations` = 49 vs 102 súborov v repe (15. 8. bolo 47 vs 94 — medzera rastie). Ďalšie drifty: `scheduled_events`, `lead_conversions`, `ai_generations` na PROD neexistujú.
- **Slučka učenia nikdy neuzavretá:** `decisions` = 240 riadkov, všetky `status='open'`, všetky `followup_agent`, najnovší 2026-06-25; `exclusivity_outcomes` = 0. Expected outcome zapísaný 240×, actual outcome 0×.
- **Dopad na poradie:** CP-P0-4 (Contract) GO možné — zatvára presne tú dieru. CP-P0-1 (Spine) GO možné, ale **rozsah sa presúva z `events` na `platform_events`**, čistý DDL bez backfillu. CP-P0-2 (Approvals) GO možné, žiadne dáta na migráciu. **CP-P0-3 (Cost→Outcome) ZASTAVENÉ** — nahradiť `CP-P0-3a` (inštrumentácia cost cesty), view až po ~30 dňoch zberu.
- **Zostáva NEZNÁME:** prečo sa `lead_events` nezapisuje (U1); retention policy (U2); GDPR základ pre `platform_events.payload` (U6) — `gdpr-advisor` musí bežať pred CP-P0-1.
- **Nevykonané:** CP-SPEC neotvorený, P0-CP neimplementované, žiadny merge, žiadny deployment.

## [2026-09-18] — U1: root cause `lead_events` = 0 — PROVEN (nenapojená write path)

- **Brána:** `GO U1`. Read-only (repo read + grep + PROD SELECT), PROD `ypgajkhqtbriqqmyawyv`, 09:12–09:20 UTC.
- **Report:** `docs/reports/2026-09-18-U1-lead-events-write-path-report.md`
- **PROVEN ROOT CAUSE:** `lead_events` má v celej aplikácii **jedinú** write path — `POST /api/ai/lead-events` (`route.ts:65`). Tá má **0 volajúcich** a zároveň je za `isEnterpriseSalesIntelligenceEnabled()` → 403. **Žiadna zo 6 agentúr na PROD nemá plán `enterprise`.** Nie je to chyba, je to nenapojená funkcia.
- **Vylúčené ako príčina (každá samostatným meraním):** RLS (`lead_events_tenant`, `with_check` insert povoľuje) · schema (PROD stĺpce == migrácia `20260418`, žiadny drift) · tiché zlyhanie (route vracia 400/403, nič nepotláča) · zápis inam.
- **Nezávislé potvrdenie:** celý Enterprise klaster prázdny — `lead_events`, `lead_scores`, `client_dna`, `deal_moments`, `ai_recommendations` = **0 riadkov** každá.
- **Skutočný event path je DB trigger mimo repa:** `trg_leads_platform_events` (AFTER INSERT OR UPDATE na `public.leads`, SECURITY DEFINER) → `emit_platform_event()` → `platform_events`. **Nie je v žiadnej migrácii** — repo to priznáva v `20260509000000_rls_lead_scores.sql:9`. `emitPlatformEventServer()` volá aplikácia jediný raz (`matching-engine.ts:35`); zvyšok z 1 417 riadkov robí databáza.
- **GDPR — mení predchádzajúci záver:** trigger zapisuje do payloadu `'name', new.name`. **`platform_events.payload` obsahuje osobné údaje.** `gdpr-advisor` pred CP-P0-1 je nutnosť, nie formalita.
- **Dopad:** `/operator` — `hasGlobalLeadEvents=false` → `reaction24hPct` null pre všetkých + systematických −4 na health score. Guardian — `guardian_findings` má **0 STALE** riadkov (NO_OWNER 15, NO_PHONE 10/0 open, HOT_IGNORED 8); STALE sa nespustí, kým je tabuľka prázdna. `NO_PHONE` v1.2 má rovnakú závislosť → 0 otvorených od 27. 7.
- **Dopad na CP-P0-1:** potvrdzuje presun spine na `platform_events`; spine musí navyše pokryť triedu „reakcia makléra" (`call`/`reply`/`email_open`), ktorá dnes nie je nikde — bez nej nebudú mať vstup reaction24h, STALE ani cost/qualified lead.
- **UNKNOWN:** zámer autorov (žiadny ADR k `lead_events`); ktorá z 3 enterprise migrácií chýba v `schema_migrations`.
- **Ďalšie brány (neudelené):** `GO CP-SPEC` · `GO EVT-TRIGGER-CAPTURE` (zachytiť trigger do migrácie — dnes jediný funkčný event path žije len na PROD) · `GO OPERATOR-HONESTY`. **Neodporúčam** opraviť write path samostatne — bola by to implementácia pred kontraktom.
- **Nevykonané:** žiadna oprava, CP-SPEC neotvorený, žiadny merge, žiadny deployment.

## [2026-09-18] — CP-SPEC v1: Control Contract + Events Spine v2 (ŠPECIFIKÁCIA, nie GO na implementáciu)

- **Brána:** `GO CP-SPEC`, scope LOCK na `CP-P0-4` + `CP-P0-1`. Žiadna implementácia, migrácia, oprava `lead_events`, UI.
- **Dokument:** `docs/architecture/founder-control-plane-cp-spec-v1.md` (1023 r.)
- **Doplnené PROD merania (09:32–09:38 UTC, read-only):** `platform_events` má len 5 stĺpcov (`id, agency_id NULLABLE, event_type, payload, created_at`) — chýba 7 z 13 polí kontraktu · RLS má **jedinú SELECT policy** s vetvou `agency_id IS NULL` (dnes 0 takých riadkov = latentná cross-tenant diera) a používa inline resolver namiesto `profile_agencies_for_auth()` · `activities` má 186/188 riadkov bez `lead_id`, 188/188 bez `profile_id`, **nemá `agency_id`** a má 4 policy vrátane dvoch prekrývajúcich sa párov (AP-002).
- **Kľúčové rozhodnutia (D-01..D-10):** spine = **rozšírené `platform_events` in-place**, aditívne, žiadna nová tabuľka (D-01) · `occurred_at` oddelené od `created_at` (D-02) · dvojúrovňová taxonómia `category` uzavretá / `event_type` otvorená — neopakovať CHECK chybu `public.events` (D-03) · **reaction events (`call`/`reply`/`email_open`/`click`/`note`) sú prvotriedne eventy na spine, nie tretia tabuľka; `lead_events` deprecated, nie zmazané** (D-04) · `correlation_id` generuje producent (D-05) · `agency_id` → NOT NULL v dvoch krokoch so sentinelom namiesto NULL (D-06) · RLS cez `profile_agencies_for_auth()` (D-07) · founder cross-tenant výhradne cez `service_role` za gate + `SECURITY_EVENT` audit, **nie** cez rozšírenú policy (D-08) · **payload nesie odkazy, nie obsah — trigger prestane emitovať `name`** (D-09) · zachytenie triggera **až po** spec, v cieľovom v2 tvare, plus drift-detection CI (D-10).
- **Kontrakt:** `OBSERVE → DECIDE → AUTHORIZE → ACT → REPORT OUTCOME → LEARN`; authority je čistá funkcia nad kontextom, nie vlastnosť agenta; `FORBIDDEN` nie je prekonateľné approvalom; `act()` implementuje platforma, nie agent. Navrhované umiestnenie `packages/control-contract`.
- **Lead→Value trasa čestne:** z 15 článkov 5 `[EXISTING]`, 3 `[UNKNOWN]`, 7 `[TARGET]`; **reťaz prerušená na článkoch 10–12** (RESPONSE, APPOINTMENT, OPPORTUNITY).
- **27 adversariálnych testov.** Tri aktívne riziká „vysoké": #14 PII v 1 417 historických riadkoch · #20 in-memory approvals · #26 neuzavretá slučka (dnešných 240/0).
- **GO/NO-GO:** `CP-P0-4` **GO možné** · `CP-P0-1` **NO-GO** (blokujú P0 neznáme U-A GDPR základ, U-B retencia, U-C RLS resolver; kroky 1–3 sa dajú oddeliť) · `EVT-TRIGGER-CAPTURE` **NO-GO teraz** (D-10) · `CP-P0-2 Durable Approvals` **GO možné** · `COST→OUTCOME` **NO-GO**, predchodca `CP-P0-3a` GO možné · `PII-SCRUB-BACKFILL` **NO-GO** (nezvratné) · Strategic Backlog **NO-GO** (ADR-004).
- **8 otvorených rozhodnutí pre foundera (OD-1..OD-8)** a **9 UNKNOWN (U-A..U-I)**, z toho tri P0.
- **Ďalší krok:** adversariálny architektonický review tohto dokumentu. **Nie kód.**

## [2026-09-18] — CP-SPEC-HARDEN: v1.1, dve chyby v1 opravené, tri nové neznáme

- **Brána:** `GO CP-SPEC-HARDEN`. Scope nezmenený, žiadna implementácia/migrácia/DB/UI/GDPR rozhodnutie.
- **Dokument:** `docs/architecture/founder-control-plane-cp-spec-v1.md` v1.0.0 → **v1.1.0** (`status: hardened-draft`), 1023 → 1299 riadkov. Changelog v §0.
- **Zachované podľa zadania:** D-01, D-04, D-09, kontrakt OBSERVE→…→LEARN, dynamický authority model, durable approval, anti-halucinačné nálepky, explicitné UNKNOWN, migrovaný agent ako dôkaz.
- **Dve reálne chyby v1 opravené:**
  1. **P0-4 / OD-9:** pravidlo `irreversible → FORBIDDEN` **zabíjalo produkt** — `FORBIDDEN` znamená „ani so schválením", odoslanie e-mailu je nezvratné ⇒ agent by nikdy nesmel odoslať e-mail, čo ruší RÝCHLY KONTAKT aj RADAR MAKLÉRA. Oprava: nezvratnosť je **podlaha** (`APPROVAL_REQUIRED`, policy ju nesmie znížiť), `FORBIDDEN` je len explicitný DENY_LIST. Príčina chyby: zlúčenie *nezvratnosti* (vlastnosť akcie) s *neprípustnosťou* (rozhodnutie vlastníka).
  2. **P0-2:** spec tvrdil „ADD COLUMN × 8", cieľová schéma mala 11 stĺpcov. Nová **§4.2.1 kanonická schéma** — jediný záväzný zoznam: v1 = 5, v2 pridáva **12** (11 + `scope`), spolu 17. `provenance` prestáva byť stĺpec, je to `payload._provenance`.
- **D-06 prepísané (P0-3):** sentinel agentúra **zrušená** — je zameniteľná so zákazníckym tenantom a odlišuje ju len `parseOperatorAgencyExcludeList()`; jedna chyba v exclusion liste a platformové eventy sa počítajú ako zákaznícke. Nahradené `scope` diskriminátorom + CHECK (`tenant` ⇒ `agency_id NOT NULL`, `platform` ⇒ NULL). RLS vetva `agency_id IS NULL` zaniká aj s latentnou dierou.
- **Nová §3.8 transakčná hranica (P0-1, P0-5, P1-3):** štyri vrstvy T1 → externý efekt → T2 → T3. **Fail-closed je vynútiteľné len vnútri jednej DB transakcie; za sieťovou hranicou neexistuje.** Exactly-once externý side effect vyhlásený za **nedosiahnuteľný**, najlepšie možné je effectively-once. Overené v repe (nie predpokladané): atomický multi-row zápis ide cez `supabase.rpc()` + plpgsql — 12+ call sites, 27 migrácií; Supabase JS klient multi-statement transakciu neposkytuje. Idempotency precedens už existuje: `credit_ledger.idempotency_key` s unique-violation-ako-úspech (`starter-pack/redemption.ts:148`).
- **P0-6:** `OutcomeStatus` rozšírené na 7 hodnôt (`success|failure|partial|cancelled|rejected|expired|unknown`) + `reason`. Bez `rejected`/`expired`/`cancelled` by slučka po zamietnutom approvale ostala navždy otvorená.
- **P0-7:** pridaný `run_id` (retry = nový run, rovnaká korelácia — bez neho sa nedá odlíšiť „skúsil 3×" od „spravil 3×"). **`workflow_id` zámerne vynechaný** — neexistuje orchestrátor, ktorý by ho vydával (ADR-001: orchestrátor až pri 5. uzle); stĺpec by bol 100 % NULL, presne vzor `lead_events`.
- **P0-8 / §11.5:** „koexistujú natrvalo" nahradené politikou: A čitateľnosť histórie (trvalá) · B v2 je jediný kanonický kontrakt od cutoveru · C horizont konzumenta. Vynútenie detekčným dotazom (I-014), nie CHECK-om. Historické riadky **nedostanú** dopočítané `correlation_id`/`actor` — bola by to fabrikácia (AP-001).
- **§9.1 FINAL INVARIANT REGISTER I-001..I-015** s OWNER/ENFORCEMENT/DETECTION/TEST/FAILURE MODE. **Tri invarianty sú dnes porušené:** I-006 (240 decisions / 0 outcomes), I-008 (approvals v `new Map()`), I-011 (1 417 riadkov s menami). I-003 (korelácia cez tenantov) nie je porušený, ale **nie je ani vynútený**.
- **§15.1 dvojosová GO matica (P1-2, P1-6):** ARCHITECTURALLY READY vs IMPLEMENTATION READY. **GO možné dnes:** `CP-P0-4`, `CP-P0-2`, `CP-P0-3a`, `CP-P0-1 kroky 1–3` (ak sa brána rozdelí), I-003 guard. **BLOCKED:** `CP-P0-1 kroky 4–6`, `EVT-TRIGGER-CAPTURE`, `PII-SCRUB-BACKFILL`, `COST→OUTCOME`.
- **P1-1:** tvrdenie o `activities` zmiernené na rozsah dôkazu („nie je použiteľné ako kanonický zdroj reaction events pri nameranej schéme a dátach").
- **Tri nové neznáme, neprikryté návrhom:** **U-J (P0)** či `resend@^6.12.2` a `twilio@^5.13.1` podporujú idempotency kľúč — bez toho hrozí dvojitý e-mail klientovi; overiť z dokumentácie, **nie z pamäte** (AP-005). **U-K (P0)** či T1 reálne prejde ako jedna transakcia cez RPC idióm — ak nie, fail-closed padá a s ním I-004/I-005. **U-L (P1)** zdroj `reversible` príznaku pre `resolveAuthority`.
- **Nové otvorené rozhodnutia:** OD-9 (nezvratnosť ako podlaha) a OD-10 (per-tenant override `externallyVisible`). Implementácia môže začať s bezpečnými defaultmi — CP-P0-4 tým nie je zablokované.
- **Ďalší krok:** founder rozhodnutie o OD-1..OD-10 a o rozdelení brány CP-P0-1. **Nie kód.**

## [2026-09-18] — Founder verdikty OD-1..OD-10 + rozdelenie CP-P0-1 na A/B/C

- **CP-SPEC v1.1:** ACCEPT ako hardened draft.
- **OD-1 Data truth:** ACCEPT — doménové systémy zostávajú autoritatívne pre entity; `platform_events` je historická/eventová vrstva, **nie druhá databáza pravdy**.
- **OD-2 Research scope:** ACCEPT — internal + external evidence, ale tvrdá hranica: **external evidence ≠ system truth**; výskum tvorí hypotézu, nemení produkciu automaticky.
- **OD-3 Authority:** ACCEPT — capability (OBSERVE/ANALYZE/RECOMMEND) × authority (AUTONOMOUS/APPROVAL_REQUIRED/FORBIDDEN), dynamicky z kontextu.
- **OD-4 Tenant boundary:** ACCEPT — `scope='tenant'` ⇒ `agency_id` REQUIRED, `scope='platform'` ⇒ NULL. **Žiadny sentinel tenant.**
- **OD-5 Trigger capture:** ACCEPT, ale **samostatná brána až po** GDPR/RLS verifikácii.
- **OD-6 `lead_events`:** ACCEPT deprecation — read-compatible počas migrácie, žiadna nová business logika, retirement samostatným rozhodnutím. **Nie okamžitý DROP** (6 konzumentov).
- **OD-7 Cost→Outcome:** **DEFER** — reťaz cost → lead_id → conversion → deal nie je dôveryhodná; najprv `CP-P0-3a` inštrumentácia.
- **OD-8 Prvý migrovaný agent:** ACCEPT ako Definition of Done pre Control Contract. `lib/agents/followup` je kandidát, **nie definitívny** — implementačná úloha musí urobiť read-only suitability check.
- **OD-9 Nezvratnosť:** ACCEPT — `irreversible` → **minimum authority floor = APPROVAL_REQUIRED**; `FORBIDDEN` je výhradne explicitný deny-list. Ruší paradox „founder schváli e-mail → engine ho zakáže".
- **OD-10:** **CONDITIONAL** na U-J/U-K/U-L.
- **CP-P0-1 rozdelené na tri architektonicky nezávislé brány:**
  - **CP-P0-1A Safe Spine Foundation** — A1 kanonická v2 schéma · A2 `scope` diskriminátor · A3 tenant isolation model · A4 correlation/causation/run sémantika · A5 idempotency model · A6 schema versioning · A7 invariant enforcement model · A8 migration/version-control ownership. **Žiadny produkčný PII backfill.**
  - **CP-P0-1B Event Production** — DB trigger → kanonický emitter → reaction-event producers → event contracts. Vyžaduje GDPR, retenciu, PII minimization, RLS, producer ownership.
  - **CP-P0-1C Historical / Legacy Migration** — kompatibilita, migrácia, PII treatment, legacy konzumenti, retirement. Sem patrí `PII-SCRUB-BACKFILL` ako samostatná brána.
- **NO-GO (potvrdené):** oprava `lead_events` · reaction event producers pred kontraktom · PII scrub · Cost→Outcome · Founder UI · hromadná oprava 240 decisions (samostatný outcome-recovery problém).
- **Poradie:** U-J/U-K/U-L → CP-P0-4 → CP-P0-2 → CP-P0-1A. GDPR evidence gate paralelne, bez implementácie PII časti.
- **PR #585:** nechať ako architecture evidence record; `behind` ≠ konflikt, žiadny commit len kvôli tomu; nemiešať architektúru + research + implementáciu do jedného PR.

## [2026-09-18] — U-J / U-K / U-L evidence: dve uzavreté, jedna čiastočne

- **Brány:** `GO PROVIDER-IDEMPOTENCY-EVIDENCE` · `GO RPC-TRANSACTION-EVIDENCE` · `GO REVERSIBILITY-EVIDENCE`. Read-only, 10:05–10:50 UTC.
- **Report:** `docs/reports/2026-09-18-U-JKL-evidence-report.md`
- **Obmedzenie prostredia (FAKT):** egress proxy blokuje `resend.com`, `www.twilio.com`, `cdn.jsdelivr.net`, `docs.postgrest.org`. Fungovalo iba vyhľadávanie. `node_modules` nie je nainštalované. Preto pri U-J **nevyhlasujem RESOLVED** — AP-005 rozlišuje „vyhľadávač cituje dokumentáciu" od „prečítal som dokumentáciu".
- **U-J Resend — PROBABLE:** hlavička `Idempotency-Key`, ≤256 znakov, **retencia 24 h**, `POST /emails` aj `/emails/batch`, chyby 400 `invalid_idempotency_key` / 409 `invalid_idempotent_request` / 409 `concurrent_idempotent_requests`. **Nový architektonický vstup:** 24 h retencia je **kratšia** než životnosť nášho deterministického `idempotencyKey` → retry po 24 h nebude u providera deduplikovaný; chytí to len platformová idempotencia (I-009) + reconciler.
- **U-J Twilio — UNKNOWN:** `Idempotency-Key` je doložená pre Conversations Orchestrator a Monitor Alarms, **nie pre Messages create**, ktoré Revolis reálne volá (`client.messages.create` v `multi-channel-sender.ts:75,:97`, `l99/alert-dispatch.ts:35`). Netvrdím, že to Twilio nemá — tvrdím, že to **nie je doložené**. Dovtedy SMS/WhatsApp = **at-least-once**.
- **U-K — RESOLVED produkčným precedensom:** `public.spend_credits` (plpgsql, SECURITY DEFINER, volaná cez `supabase.rpc()`) robí v jednom volaní EXISTS-idempotency check → `SELECT ... FOR UPDATE` → 2× INSERT do `credit_ledger` → UPDATE `agencies`. **Spravuje peniaze**; keby nebola atomická, účtovanie by systematicky nesedelo. Ďalšie precedensy: `compute_bri_score_v2` (3× INSERT, 2× UPDATE), `compute_motivation_score`, `rate_limit_increment`, `increment_usage_metric`. **Navrhované T1 nie je nový vzor — je to vzor, na ktorom už stojí účtovanie kreditov.** Bonus: `FOR UPDATE` je hotová odpoveď na adversariálne testy #4 a #23. Zvyšok: empirický rollback test si vyžaduje zápis → samostatná mikro-brána (P2).
- **U-L — RESOLVED ako neexistujúci:** grep na `reversible|irreversible|nezvratn|undoable|can_undo` naprieč `apps/crm/src` = **0 zásahov v kóde**; 5 zásahov len v prozaických vetách v docs. Najbližší action registry je `AiCreditAction` (12 akcií, čisto auditový) a `CREDIT_RATE_CODES` (4 kódy, cost metadata). **`resolveAuthority` nemá odkiaľ zobrať `reversible` → podlaha z OD-9 sa dnes nedá aplikovať.** Návrh: `ActionMetadata` registry v `packages/control-contract` s poľami `capability`, `reversible`, `externallyVisible`, `risk`, `externalProvider`, `providerIdempotency`, `denied`; akcia bez metadát sa nesmie vykonať. Pole `providerIdempotency` je miesto, kam sa zapíše výsledok U-J — **neznáma sa tým stane vynútiteľným pravidlom, nie poznámkou**.
- **Dopad na GO:** `CP-P0-4` **GO možné, potvrdené** (U-K resolved, U-L resolved a `ActionMetadata` je jeho súčasťou). `CP-P0-2` GO možné. `CP-P0-1A` GO možné. **OD-10 zostáva CONDITIONAL** — U-J Twilio UNKNOWN blokuje len override cestu, nie default `APPROVAL_REQUIRED`.
- **Zostáva:** U-J1 Resend primárny zdroj (P1) · U-J2 Twilio Messages (P1) · U-K1 empirický rollback (P2) · U-A/U-B/U-C/U-D GDPR+RLS (P0, blokujú CP-P0-1B, nie CP-P0-4).

## 2026-09-18 — assign-lead same-agency gate (critical-bug automation)
- BUILD: `assignLeadToProfile` must verify target profile `agency_id` and scope lead UPDATE; no fake ok without client.
- PR: https://github.com/onlinovosk-bit/RealitkaAI/pull/596
- Evidence: vitest 10/10; report `docs/reports/2026-09-18-assign-lead-cross-tenant.md`

## [2026-09-19] — CP-P0-4 Control Contract: implementované, prvý agent migrovaný

- **Brána:** `GO CP-P0-4`. Prvá implementačná brána Control Plane. Žiadna migrácia, žiadny zápis do PROD, žiadna zmena správania existujúcich agentov.
- **Nový balík `packages/control-contract`** (13 súborov, 0 dependencies, vynútené CI guardom). Mimo `apps/crm` zámerne — cron, `.ai/bus` a budúce služby musia vedieť importovať kontrakt bez CRM.
- **`ActionMetadata` registry — U-L uzavreté.** 9 akcií. Dve pravidlá z neho robia nosný prvok, nie dokumentáciu: (1) akcia bez záznamu sa **nedá** autorizovať (fail-closed → `FORBIDDEN`), (2) **registry, nie volajúci, je pravda** pre `capability/reversible/externallyVisible/risk`. Nezhoda kontextu s registry = `FORBIDDEN` (`context_registry_mismatch`). Bez tohto by agent mohol nezvratný send vyhlásiť za zvratný a prejsť popod OD-9 podlahu — to bola reálna diera v pôvodnom návrhu §3.4.
- **U-J zapísané ako vynútiteľné pole, nie poznámka:** `followup.email.send` → Resend `probable` + `retentionHours: 24`; `followup.sms.send` → Twilio `unknown` ⇒ `deliveryGuarantee = at_least_once`. `probable` **nie je** to isté ako `supported` (AP-005).
- **OD-9 implementované ako podlaha:** `irreversible` → `APPROVAL_REQUIRED`, nikdy `FORBIDDEN`. Test dokazuje, že founder approval nezvratný e-mail odomkne — paradox v1.0 je preč. Test tiež dokazuje, že policy podlahu **nevie znížiť**.
- **OD-10 CONDITIONAL rešpektované:** `externallyVisibleOverride` existuje ako typ (§3.4.2 to žiada ako návrhovú požiadavku), ale cesta nie je implementovaná — pri `enabled: true` engine ponechá `APPROVAL_REQUIRED` a zapíše `od10_override_requested_but_not_implemented`. Žiadne tiché uvoľnenie.
- **I-007 vynútené dvakrát:** `applyApproval` na `FORBIDDEN` verdikt nič nemení; a runner **znovu vyhodnotí autoritu tesne pred ACT** — kill switch prepnutý medzi AUTHORIZE a ACT stále zastaví side effect (test).
- **I-006 vynútené štrukturálne:** runner má 5 terminálnych stavov a každý okrem `no_observations`/`no_decision` vyrobí `OutcomeRecord`. `FORBIDDEN` → `cancelled`. `APPROVAL_REQUIRED` → `approval.requested` + `unknown{too_early}` + `recheckAfter`. Slučka sa nedá nechať ticho otvorenú.
- **Read-only suitability check (OD-8):** `docs/reports/2026-09-19-CP-P0-4-followup-suitability.md`. Verdikt **SUITABLE so štyrmi podmienkami**.
- **Root cause 240/0 dokázaný (1 SELECT na PROD):** 240 decisions / **48 distinct leads** = presne **5 na lead**; **0** z tých 48 leadov nikdy nedosiahlo terminálny status. `resolveOpenDecisionsForLead` sa volá jedine z `PATCH /api/leads/[id]:150` a jedine pri terminálnom statuse. **Outcome writer nie je pokazený — nikdy nebol dosiahnuteľný.** Dva štrukturálne nálezy: agent nemá vlastný terminálny stav (F-1) a nemá idempotenciu (F-2, 5 duplicitných rozhodnutí na lead).
- **Ďalšie nálezy zo suitability checku:** F-3 `estimatePrediction` vracia literály (0.22/0.18, 420/310, 0.62/0.55) — prenesené **nezmenené** s provenance, nie vylepšené. F-4 `POST /api/followup` je jednotenantný konštantou (`FOLLOWUP_AGENCY_ID = DEMO_AGENCY_ID`). F-5 `buildDraftBody` má meno referenčného klienta natvrdo v každom drafte pre každého tenanta (multi-tenancy bug + Stealth Mode). F-6 `capabilities/_shared/audit-log.ts` je druhá in-memory diera po I-008.
- **Migrovaný agent:** `apps/crm/src/lib/agents/followup/controlled.ts` — `RECOMMEND`, jediná akcia `followup.draft`, **nikdy neposiela**. Existujúca cesta `POST /api/followup` je **nedotknutá**. Record ids sa odvodzujú z `correlationId`, nie z `runId` ⇒ retry prepočíta rovnaký idempotency key.
- **Testy:** 56 v balíku (`node --test`, bez inštalácie) + 11 vitest pre migrovaného agenta. Lint ✅, typecheck baseline 48/69 ✅ (0 chýb v novom kóde), `src/lib/agents` + `src/lib/capabilities` 90/90 ✅. Celý `src` suite: 1 zlyhanie (`valuation/submit` integration) — **overené ako pre-existing na čistom `main`**, nie z tejto zmeny.
- **Nová CI job `Control Contract (authority + closed loop)`** — Node 22, bez ephemeral DB, s guardom na nulové dependencies. Autoritný engine je zelený nezávisle od toho, či CRM job vie naštartovať Supabase.
- **Acceptance:** #1 ✅ #2 ✅ #3 ✅ #6 ✅ · **#4 a #5 ⚠️ čiastočne** — uzavretá slučka je dokázaná v procese a v testoch (9 eventov, jeden `correlation_id`), **nie je perzistovaná**. Spine v2 stĺpce na PROD neexistujú (CP-P0-1A). Zápis control eventov do dnešného `platform_events` bez v2 stĺpcov by vyrobil presne ten tichý-v1 stav, na ktorý existuje I-014.
- **Nové UNKNOWN:** U-M (prečo cron spravil presne 5 behov a 25.6. prestal — treba Vercel cron históriu), U-N (či tých 48 leadov malo dosiahnuť terminálny status — interpretácia klientskych dát, mimo architektonickej kontroly).
- **Ďalší krok:** `GO CP-P0-1A` (Safe Spine Foundation) — bez neho sa acceptance #4/#5 nedajú dokončiť. Alternatívne `GO CP-P0-2` (durable approvals), ktoré rieši I-008 a odomkne `APPROVAL_REQUIRED` cestu.

## [2026-09-20] — Akvizičný systém zmergovaný do main (#588 → `aa6e07f`)

- **Stav:** 7 dokumentov na `main`, žiadny kód ani migrácia. Akvizičná stratégia je od teraz
  kanonická, nie návrh.
- **Overenie voči primárnym zdrojom (kontrolór):** founderov výrok „588 je merged" bol 2026-09-18
  nepresný — vtedy bol merged **#437**, nie #588. #588 sa mergol až 2026-09-20. Zaznamenané,
  lebo na tom stálo rozhodnutie, či reštartovať vetvu.
- **Technický nález:** Vercel `ignoreCommand` (#578) **nechráni** pred dennou kvótou
  `api-deployments-free-per-day` — kvóta sa míňa pri vytvorení deploymentu, nie pri builde.
  Šetrí build minúty, nie počet deploymentov. Moje skoršie tvrdenie o opaku bolo nesprávne.
- **Brány po merge:** G1 (GDPR B2B outreach) a G2 (GDPR prístup k dátam klienta) blokujú
  prvú vlnu aj Shadow CRM; `gdpr-advisor` skill nie je v session dostupný. G4 čaká na PROD
  overenie migrácie `20260817220000`. G3 a G5 nezmenené.
- **Ďalší krok (task-loop):** PROD overenie G4 — read-only SELECT. Bez neho nestojí ranný zoznam (S6),
  ktorý je jediná úloha fixujúca `activities=3/31 dní`.

## [2026-09-21] — Smolko ingest: atribúcia BLOCKED, schránky odložené, parser opravený

- **Atribúcia leadu na makléra = BLOCKED, nie TODO.** Dnes všetky dopyty prichádzajú na `office@realitysmolko.sk`; neexistuje signál, z ktorého určiť konkrétneho makléra. `inbound_mailboxes` je per agentúra, nie per maklér. Odblokuje sa **až** napojením individuálnych schránok. Dôkaz: `0/7` živých portálových leadov má `assigned_profile_id`.
- **Napojenie 8 maklérskych schránok: odložené do zmerania objemu.** Dôvod (PRIME DIRECTIVE): od júla prišlo **7 portálových dopytov**, z nich **jeden čisto sparsovaný**. Stavať webex pipeline + GDPR proces na taký objem je neúmerné, **pokiaľ** makléri nedostávajú násobne viac na vlastné adresy. To nikto nezmeral. 21. 9. odoslaný e-mail p. Smolkovi s otázkou na tri konkrétne mená za jeden týždeň.
- **Ak sa k schránkam raz pristúpi: preposielanie, nie IMAP.** IMAP by znamenal uložiť 9 hesiel k celým schránkam vrátane súkromnej pošty maklérov — neobhájiteľné pri čl. 5(1)(c). **Bez allowlistu odosielateľov** — ticho by zahadzoval priame klientske dopyty, čo je u tohto klienta najcitlivejšia možná chyba.
- **Oprava záznamu (dôležité pre interpretáciu metrík):** `Igor Kališ` (5. 7., `igorkaliis21@gmail.com`) **NIE JE testovací lead** — je to jediný reálny čisto sparsovaný produkčný dopyt. Testovací záznam je `demo.zaujemca@example.com` (10. 7.). Všetkých 7 záznamov zdroja `valuation_widget` sú naše smoke testy, ani jeden reálny.
- **Parser (#599, main `2a510ba3`):** HTML v `raw` rozbíjal extrakciu polí. Opravené meno, výber adresy záujemcu, koncová interpunkcia, vylúčenie `noreply`/domény príjemcu. Idempotencia zámerne nedotknutá (`rawHash` z pôvodného `raw`). **Neriešené:** vzory pre `Správa:` u portálov a brána „je to vôbec dopyt?" (`eventKind` je dnes `inquiry` pre všetko okrem unsubscribe).

## [2026-09-21] — RAW STORAGE: identifikovaná medzera, PROPOSAL, bez GO

- **Medzera (FAKT):** `acquire_dedup_keys` drží iba hash. Hash povie „túto správu sme videli", nepovie „takto vyzerala správa, ktorú sme parsovali". Dôsledok doložený pri #599: oprava parsera bola overená na **rekonštruovaných fixtúrach**, nie na pôvodných správach. Chýbajúce vzory pre `Správa:` sa bez originálov napísať nedajú.
- **Návrh 30-dňovej retencie je PROPOSAL, nie rozhodnutie.**
- **Právny základ 6(1)(f) je UNVERIFIED** — vyžaduje samostatné právne posúdenie. Telo e-mailu obsahuje osobné údaje záujemcov; pracovná hypotéza „6(1)(f) + balancing test" **nie je** schválený právny základ.
- **NO GO: žiadne produkčné raw maily sa zatiaľ neukladajú.** Implementácia až po samostatnom GO, a to v poradí právny/retention kontrakt → implementácia.
- **Návrh tvaru (ak GO príde):** `tenant_id + message_id/dedup_key + received_at + retention_until + raw_body`, s tvrdým oddelením **ingest evidence vs. CRM business data**. Raw mail nie je ďalšia CRM tabuľka — je to forenzný zdroj pravdy pre ingest/parser pipeline.

## [2026-09-21] — Branch cleanup `claude/brave-bohr-arikv2`: NO GO, audit EXPIRED

- **Stav:** vetva zostáva na `348d3f59`, nedotknutá. Nesie 2 duplicitné commity (`42f9f432`, `7dbb94e8` — Founder Alert Adapter v0.1), ktorých obsah je už v main cez #572. Force-push **nevykonaný**.
- **Prečo sa cleanup zastavil — dve nezávislé brány, obe zabrali:**
  1. **Remote backup tag sa z Claude session vytvoriť nedal** — `git push origin backup/…` → HTTP 403, zatiaľ čo push branchu prešiel. Plán mal pri tom kroku podmienku „bez tohto to nerobiť". Príčina 403 = **UNKNOWN** (diagnostický endpoint proxy nedostupný), hypotéza „policy rozlišuje druhy refov" je **NOT VERIFIED**.
  2. **`origin/main` sa medzi auditom a GO posunul** `9c6fc4dd → ed45d518` (#369, #586). Tým prestal platiť `proposed new HEAD` z auditu.
- **Pôvodný cleanup audit je EXPIRED, nie pozastavený.** Keď sa vetva stane relevantnou, urobí sa **nový** read-only audit od vtedajšieho `origin/main`; pokračovanie zo starého auditu je porušenie protokolu (viď P1 v0.2 bod g).
- **Nemeniť GitHub oprávnenia kvôli tomuto** — hranica funguje správne, jednorazovú operáciu vykoná človek.
## [2026-09-21] — Zmeraná hranica autonómie BUS-u (notifikácia ≠ autonómia)

- **Kontext:** #589 (transport), #590 (handshake harness), #593 (consumer v1), #594
  (YAML lost-text warning) sú na `main`. Živý dogfood prebehol proti `bus/main` cez
  cloudflared tunel a GitHub backend. Otázka znela, či tým už founder prestal byť
  medzičlánkom medzi SOL a Claudom.
- **Odpoveď: nie, a vieme presne prečo.** Meranie, nie odhad:

  | Smer | Stav |
  |---|---|
  | `sol-gpt → BUS` | ✅ reálne |
  | `BUS → claude-code` | ✅ PASS — správa je dostupná v BUS; spracovanie nastane iba počas spusteného consumer behu |
  | `claude-code → REAL Claude Code` | ✅ reálne (session `108a442a`, reply `BUS ALIVE`) |
  | `Claude Code → BUS` | ✅ reálne |
  | `BUS → sol-gpt` | ✅ PASS **len po explicitnom vyvolaní ChatGPT** — nie autonómny push |
  | `claude-code` automaticky reaguje na nové tasky | ❌ nie |
  | Founder-free celý loop | ❌ nie |

- **Kde presne je hranica:** obe strany vedia na BUS písať aj z neho čítať, ale **ani
  jedna sa nezobudí sama**. ChatGPT nemá bežiaci proces — Custom GPT Action sa zavolá
  len keď founder otvorí ten chat. Consumer v1 je jednorazový beh, bez poll loopu
  (zámerne, viď #593 „Známe medzery" bod 1).
- **Čo sa reálne zmenilo:** founder prestal **prenášať obsah**. Správy sú v gite,
  štruktúrované, s digestom namiesto 3 000 slov. Z poštára sa stal **spúšťač**. To je
  skutočný posun, ale nie autonómia.
- **Rozhodnutie: hodinový monitor sa NEZAPÍNA.** Scheduled check, ktorý upozorní
  foundera na správu pre `sol-gpt`, je operatívny workaround, nie architektúra —
  vyrobil by metriku „autonómie", ktorá je v skutočnosti `cron → ping founder →
  founder otvorí ChatGPT`. Monitor strážiaci správy pre `claude-code` by mal zmysel,
  ale patrí do kroku 2, nie do ad-hoc budíka.
- **Poradie ďalších krokov (žiadny nezačať bez samostatného GO):**
  1. ~~Stabilizovať a mergnúť Consumer V1~~ — hotové, #593 merged 2026-09-18 20:35:43Z (`ab67567`).
  2. Persistentný Claude BUS runner / poll loop. **GO REQUIRED.**
  3. Čo má byť „SOL agent" mimo interaktívneho ChatGPT. Presun strategickej vrstvy na
     API s vlastným cyklom odstráni človeka z tej strany slučky úplne — **governance
     rozhodnutie, nie technické.** Neotvárať spolu s krokom 2.
- **Pravidlo, ktoré z toho plynie:** „live dogfood PASS" neznamená autonómnu slučku.
  Kto číta tento záznam neskôr: PASS riadky vyššie platia s uvedenými podmienkami,
  nie bez nich.

## [2026-09-21] DEC-20260921-001 — Kanonický pricing model = SEAT

- **Rozhodnutie:** Core Revolis je **seat-based subscription** (79 / 71 / 63 €
  na makléra za mesiac). Programy 49 / 99 / 199 / 449 € (Market Vision, Protocol
  Authority a spol.) sú **nadstavby/moduly**, nie alternatívny základný checkout.
- **Prečo teraz:** prihlásený prod smoke `/upgrade` (2026-09-21) = FAIL. Root
  cause: `STRIPE_PRICE_{SOLO,TEAM,OFFICE}_SEAT` v produkcii neexistujú, zatiaľ
  čo prítomné sú `STARTER`/`PRO`/`MARKET_VISION`/`PROTOCOL_AUTH` — produkčný
  Stripe stojí na program modeli, kód na seat modeli. Bez rozhodnutia o modeli
  by „oprava env" potichu zabetónovala ten nesprávny.
- **Poradie vykonania:** A) Stripe VERIFY read-only → B) env patch s reálnymi ID
  → C) ak ceny neexistujú, STOP a samostatné GO na ich vytvorenie → D) deploy +
  prihlásený smoke → E) `/porovnanie-programov` cleanup ako **samostatná** úloha.
- **Veto:** žiadny agent nevytvára Stripe Products/Prices. Vytvorenie ceny =
  vytvorenie obchodného kontraktu, nie oprava konfigurácie. Hodnoty price ID
  pochádzajú zo Stripe live mode a zapisuje ich founder.
- **Hranica (potvrdená):** AI diagnostikuje, pripravuje a overuje. Finálny
  obchodný kontrakt a production payment configuration ostáva pod Founder GO.
- **Artefakty:** `docs/reports/2026-09-21-upgrade-checkout-config-root-cause.md`,
  `memory/open-tasks.md` (`CHECKOUT-ENV-01`, `CHECKOUT-ENV-02`,
  `FUNNEL-PRICING-01`), PR #606.
- **Odvodený nález:** `CHECKOUT-ENV-02` — Owner Cockpit checkbox pripočítava
  cenu v UI, ale line item sa ticho vynechá, ak cockpit price ID chýba (v
  produkcii chýba). Overiť päť price objektov, nie tri.

## [2026-09-21] DEC-20260921-002 — BUS Runner V2, KROK 2D: always-on runner s tvrdým stropom

- **Rozhodnutie:** Runner prechádza z jednorazového behu na dlhobežiaci poll
  loop (60 s) nad GitHub-backed BUS. Tri founder parametre: denný strop
  **100 automatických vykonaní / 24 h rolling window**, blocker deduplikácia
  **bez zatvárania tasku**, samostatný always-on host s vlastnou strojovou
  identitou (PAT nie je osobný credential foundera).
- **Hranica sa nemení.** 2D nepridáva ani jednu capability. Žiadny write,
  žiadny external side effect, žiadna deployment ani merge automation, žiadny
  verejný endpoint, žiadna závislosť na Cloudflare. Policy B sa nerozširuje.
- **Strop je tvrdý:** po 100 vykonaniach runner odmieta s `daily_cap_reached`
  a **nepokračuje** v automatickom vykonávaní. Task ostáva OPEN.
- **Blocker nikdy nezatvára task.** Zatvára ho iba founder. Zmena oproti
  doterajšiemu stavu: `handledTaskIds()` už nezapočítava blockery, takže raz
  odmietnutý task dostane druhú šancu, keď príčina pominie. Proti dvojitému
  vykonaniu naďalej stojí result envelope + durable execution state z 2C.
- **Otvorené pre foundera:** task zaparkovaný stropom ostáva `NEEDS_FOUNDER`
  aj po uvoľnení 24 h okna — implementované doslovne podľa zadania.
  Alternatíva (odmietnutie len na daný cyklus) je pripravená, ak ju zvolí.
- **Dôkaz:** `npm run bus:test` 148/148; `npm run bus:validate` 43 súborov,
  0 errors.
- **Artefakty:** `packages/bus-core/src/execution-cap.ts`,
  `packages/bus-core/src/consumer.ts`, `scripts/bus/consume.ts`, PR #617.
  Architektonický referenčný dokument:
  `docs/architecture/adr-2026-09-21-bus-runner-v2.md`.
- **Nezačaté:** 2E (read-only analytické capabilities pod Policy B) — vlastná
  GO brána. ADR §10 otvorené otázky (identita hosta/tokenu, alerting na
  vyčerpaný retry budget) tiež neriešené.
## 2026-09-21 — BUS-AUTH-IDENTITY: špecifikácia identity volajúceho v transporte (PR #612)

- **Rozhodnutie:** BUS dostane per-agent credentials. `token: string` →
  `credentials: BusCredential[] { id, secret, agent }`. Bearer sa rozlúšti na
  identitu, identita určuje zapisovateľné boxy. **Zatiaľ len ADR, žiadny kód.**
- **Meraný problém (nie predpokladaný), čítané z kódu na `9d933ea`:**
  `http.ts:51` porovnáva iba bearer; `http.ts:26` `DEFAULT_WRITABLE` je globálne,
  nie per caller; **`envelope.from` sa v `http.ts` nekontroluje vôbec** —
  je self-declared. `scripts/bus/consume.ts` používa rovnaký endpoint a rovnaký
  token ako ChatGPT.
- **Dôsledok, ktorý nie je teoretický:** `consume.ts:274` stavia duplicate guard
  z `list("outbox", { from: CONSUMER_AGENT })`. Podvrhnuté `from: claude-code`
  presvedčí consumera, že úloha už bola zodpovedaná → **zápis sa stáva odoprením
  vykonania.** Nie únik dát, ale tiché nevykonanie reálnej úlohy.
- **Jadro ADR:** `envelope.from === identity.agent`, inak 403. Bez tejto väzby
  by per-box pravidlá boli divadlo — kto smie písať do `inbox`, otrávi guard.
- **Degradovaný režim je viditeľný, nie tichý:** zdieľaný token ďalej funguje,
  ale `/health` hlási `auth_mode`, `from_binding: false`,
  `outbox_provenance: "unverified"`. Nasadenie sa dá *opýtať*, či hranica platí.
  (GOVERNANCE C3: ticho nie je povolenie.)
- **Čo ADR výslovne NERIEŠI:** ukradnutý secret stále hovorí ako svoj agent;
  historické `from` ostávajú neoverené (história sa neprepisuje);
  `LIVE_TRADING` a safety envelope sa nedotýka; **git PAT runnera je iná
  vrstva** (`adr-2026-09-21-bus-runner-v2.md` §10.3/§11 — fine-grained PAT sa
  nedá obmedziť na jednu vetvu).
- **Otvorená otázka pre Foundera (ADR §7):** má `shared` režim expirovať?
  Aplikácia P7 („capability, ktorá neexpiruje, je default") na transport.
  **Nerozhodnuté.**
- **Brána:** implementácia = samostatné GO. Merge je akt Foundera.
- **Artefakty:** `docs/architecture/adr-2026-09-21-bus-auth-identity.md`, PR #612.

## 2026-09-21 — BUS-AUTH-IDENTITY implementovaný (PR #612, commit f0a3436)

- **Stav:** DECLARATIVE → **ENFORCED** na transporte. Nie preto, že to hovorí
  ADR, ale preto, že tri mutácie zhasnú presne ten test, ktorý ich pomenúva.
- **Mechanizmus:** `BusCredential { id, secret, agent, writableBoxes?,
  execution? }`. POST vyžaduje `envelope.from === identity.agent`, inak 403.
  `outbox` píše len exekučná identita — POST aj ack. Nejednoznačná konfigurácia
  (dva rovnaké secrety, prázdny secret, oba režimy naraz, žiadny credential)
  odmietne postaviť handler.
- **Zatvorená #601 medzera:** `ack(inbox → outbox)` sa nedala zavrieť globálne,
  lebo consumer ju legitímne používa. Rozlíšiteľná je až identitou.
- **Dôkaz, nie zelené testy:** 126/126 (predtým 108). Mutácie: vypnutá `from`
  väzba → padnú testy 7 a 13; vypnutá ack-target brána → padne test 8; ack
  source spojený späť s POST setom → padne test 7b.
- **Spresnenia oproti schválenej špecifikácii (ADR §6a, nie potichu):**
  (1) `from` väzba platí na vytvorenie správy, nie na ack — `consume.ts:396`
  acknowleduje task, ktorý napísal `sol-gpt`; (2) ack source ≠ POST set, inak by
  právo písať do `outbox` znamenalo aj právo prepisovať to, čo tam už je;
  (3) revokácia = odobratie zo zoznamu, účinná pri reštarte, živý revocation
  list neexistuje; (4) `shared` režim ostáva presne ako bol — spevnený DEGRADED
  by vyzeral ako hranica bez toho, aby ňou bol.
- **Nález mimo scope (BLOKUJÚCI pre ďalší krok):** `packages/bus-core` ani
  `scripts/bus` nebeží v žiadnom CI workflowe. `saas-grade-pipeline.yml:265`
  púšťa `packages/control-contract`, bus nikde. **126 testov dnes nestráži nič** —
  vrátane authority-boundary testu z #601. Mechanizmus, ktorý nikto nespúšťa,
  nie je enforcement.
- **Nespustené, nepredstierané:** typecheck. TypeScript v tomto checkoute nie je
  nainštalovaný a bus nemá typecheck script ani CI krok. Node type-stripping
  znamená, že typová chyba by nepadla ani v testoch.
- **Otvorené (Founder):** ADR §7 — má `shared` režim expirovať? Neimplementované,
  lebo nerozhodnuté. Pridať expiráciu bez zadania = zhasnúť bežiaci tunel k
  dátumu, ktorý nikto nezvolil.

## 2026-09-21 — BUS-CI-WIRE: bus testy sú v CI a je to dokázané, nie tvrdené

- **Rozhodnutie:** nový job `BUS (transport authority boundary)` v
  `saas-grade-pipeline.yml`, vedľa `control-contract`. Beží `npm run bus:test`.
  Bez `npm install` — bus importuje výhradne node builtins (overené grepom cez
  `packages/bus-core` a `scripts/bus`: žiadny non-relatívny import okrem `node:`).
- **Prečo:** 126 testov, ktoré CI nikdy nespúšťa, nie je enforcement. Platilo to
  aj pre authority-boundary test z #601 — bol v repe od 3 dní a nestrážil nič.
- **Dôkaz (nie „zelené testy"), štyri kroky:**
  1. `c2ff3b5` — BUS job **zelený**: `152 tests, 152 pass, 0 fail`, 1.93 s.
     Log overený, nie no-op. 152 a nie 126, lebo CI checkoutuje merge ref, teda
     aj 26 testov z KROK 2C.
  2. `f9e63b6` — dočasná mutácia `from` brány → BUS job **červený**:
     `152 tests, 150 pass, 2 fail`, exit 1. Počet aj pozícia sedia s lokálnou
     reprodukciou (testy 7 a 13).
  3. `33835ba` — mutácia odstránená; `packages/bus-core` a `scripts/bus` sú
     byte-identické s `c2ff3b5` (overené `git diff --stat`, prázdny výstup).
  4. Finálny HEAD musí byť zelený.
- **Nález pri príprave:** main sa medzitým posunul o 5 commitov a KROK 2C zmenil
  `consume.ts` (+377 riadkov). Textovo sa merguje čisto, ale to nič nehovorí o
  sémantike. Overené v izolovanom worktree: **152/152 na zlúčenom stave** —
  identity brány sú kompatibilné s lease/crash recovery.
- **Dôsledok pre PR #612:** CI, ktoré na `75d9835` zosvietilo zeleno, bežalo
  proti merge refu s novým main. `mergeable_state` bol `behind`, nie
  `conflicting`. Main som do vetvy **nemergoval** — pravidlo Foundera zakazuje
  merge main do feature branch len kvôli čerstvému CI.
- **Nezmenené (scope BUS-CI-WIRE):** auth model, `outbox` boundary, ACK
  semantics, shared-mode expiry, `packages/bus-core`, `scripts/bus`.
- **Typecheck ostáva UNKNOWN.** TypeScript v checkoute nie je. `control-contract`
  si ho v CI doinštaluje ad hoc (`npm install --no-save typescript@5.9.3`) —
  rovnaký vzor by sa dal použiť pre bus, ale to je nové rozhodnutie, nie CI
  wiring. Návrh, nie vykonané.

## 2026-09-21 — PR #612 zmergovaný Founderom (`45989e8` na main)

- **Overené obsahom, nie ancestry** (squash merge robí `git merge-base` nespoľahlivým,
  rovnaká pasca ako pri #601):
  - `from_not_authorized` / `ackSourceBoxes` / `BusCredential` — 8 výskytov v
    `packages/bus-core/src/http.ts` na `origin/main`.
  - CI job `BUS (transport authority boundary)` + `npm run bus:test` na riadkoch
    268 a 283 v `saas-grade-pipeline.yml` na `origin/main`.
  - Dočasná mutácia (`false && identity.agent`) na main **nie je** — explicitne
    overené grepom, nie predpokladom.
  - `npm run bus:test` na zmergovanom main: **152/152**.
- **Stav BUS transportu:** identity hranica je ENFORCED a od teraz ju stráži CI
  na každom PR. Prvýkrát platí, že rozbitie `from` väzby zosvieti červenú bez
  toho, aby to niekto musel ručne spustiť.
- **Check-in trigger** `trig_0168hPjxvcQANHq1BD7Q4Bwb` zrušený — PR je uzavretý,
  subscription automaticky odhlásená.
- **Ostáva otvorené:** ADR §7 shared-mode expiry (rozhodnutie Foundera),
  BUS-TYPECHECK (návrh, bez GO).

## 2026-09-21 — bus:typecheck zapojený do CI (PR #620, `b3d20de` na main)

- **Nález, ktorý to spustil:** #617 pridal `packages/bus-core/tsconfig.json` a
  script `bus:typecheck`, ale **nič ich nevolalo** — workflow púšťal len
  `npm run bus:test`. Ten istý vzor ako 126 nespúšťaných testov ráno, o vrstvu
  vyššie. Strážca, ktorého nikto nevolá, nie je strážca.
- **Nebolo to hypotetické:** bus suite beží pod Node type-strippingom, ktorý
  typy zahadzuje, nie kontroluje. **#612 preto pustilo na main tri typové
  chyby** (`(await response!.json()).error`, kde `json()` vracia `unknown`) cez
  zelený Test krok. #617 ich našiel a opravil.
- **Dôkaz, ktorý ukazuje prírastok krytia, nie duplicitu** — oba kroky v tom
  istom jobe na tom istom commite `57fd3e0`:
  - krok 4 **Test → success**
  - krok 6 **Typecheck → failure**
  Test krok prešiel na kóde s reálnou typovou chybou. Lokálne to isté:
  `tsc` → `TS2571`, exit 2; `bus:test` → 166/166, exit 0.
- **Reťazec:** `2a9022a` baseline zelený → `57fd3e0` mutácia červená →
  `9fdadf5` revert, všetky checky zelené (`Lint, test, build` 9:11 vrátane
  Playwright smoke).
- **Overené na main po merge (obsahom, nie ancestry):** Install + Typecheck
  kroky na riadkoch 293/300, `.gitignore` riadok 14, mutácia na main nie je,
  `bus:test` 166/166, `tsc` exit 0.
- **Mimo pôvodný scope, priznané:** (1) `.gitignore` — `/node_modules` je
  ukotvený na root, takže per-package tooling nebol ignorovaný; moja zmena ľudí
  posiela inštalovať do `packages/bus-core`, tak som pascu zavrel.
  (2) mutácia dočasne siahla do `packages/bus-core/tests/`, revertnuté.
- **Zmena pravidla:** tento PR som **mergoval ja**, na výslovný pokyn
  `GO MERGE #620`. Doteraz platilo „merge je akt Foundera" a mám to napísané v
  každom tele PR. Beriem to ako zrušenie pre tento jeden PR, **nie** ako trvalé
  povolenie. Ďalej mergujem len na výslovný pokyn.
- **Pred mergom som čakal na dokončenie CI** — `Lint, test, build` bežal ešte 9
  minút po GO. Mergovať na neúplnom dôkaze by poprelo disciplínu celého dňa.

## 2026-09-21 — Substrate parity: `platform_events`, `ai_jobs` a ich producent legalizované (PR #619, #625, #628)

- **Čo to spustilo:** brána `GO CP-P0-1A` (event spine v2). Pri overovaní
  predpokladov sa ukázalo, že sa nedá splniť bez porušenia práve toho kritéria,
  ktoré rozhodlo P-1 — *„bez porušenia repo/PROD parity"*.
- **Nález:** `platform_events` **nemá `CREATE TABLE` v žiadnej aktívnej
  migrácii** (len v `migrations-archive/`, ktorá sa neaplikuje), `ai_jobs`
  **nikde**. CI stavia ephemeral DB cez `supabase db reset` z `migrations/`,
  takže obe tabuľky v CI chýbali. Aktívna migrácia to sama dokumentuje —
  `20260509000000_rls_lead_scores.sql:9`: *„platform_events — table does not
  exist in any migration"*.
- **Prečo to bol blocker, nie detail:** migrácia A1/A2 by v CI buď spadla
  (`relation does not exist`), alebo by sa musela guardovať cez `IF EXISTS`
  a tým sa stala **falošne zelenou**. To je ten istý vzor ako 126 nespúšťaných
  testov a nevolaný `bus:typecheck` — strážca, ktorý nič nestráži.
- **Rozhodnutie Foundera:** `GO CP-P0-1A-LEGALIZE-FIRST` — najprv legalizovať
  substrát v presnom nameranom PROD tvare, až potom A1–A8. Odmietnutá
  alternatíva `CP-P0-1A-PROD-ONLY` (guardované `IF EXISTS`), lebo robí zelené
  CI nepravdivým.

### Tri brány, každá samostatná PR

| PR | čo legalizuje | fingerprint CI == PROD |
|---|---|---|
| #619 `777149e` | `platform_events` + `ai_jobs` (tabuľky, constrainty, indexy, RLS, policy, realtime) | `3c7b4d60e3a49441aaeff389ade3a5f2` · 31 riadkov |
| #625 `ee8a361` | `emit_platform_event()` + `trg_leads_platform_events` + `trg_activities_platform_events` | `329e2f587007c97ff05efd760d1fddbb` · 5 riadkov |
| #628 `1f6ba69` | `leads.agency_id NOT NULL` | `81bcd45e805f84990b1bbed1be216bcd` · 10 riadkov |

- **Metóda dôkazu:** lokálny PostgreSQL 16, čistý cluster, Supabase-like
  scaffolding (`auth.uid()`, roly, `supabase_realtime`, pgcrypto v `extensions`).
  Prehratý **celý aktívny migration set**: 104/104 → 105/105 → 106/106,
  0 failed. Potom md5 fingerprint nad `pg_catalog` na oboch stranách.
- **Funkčný dôkaz (#625), nie len tvarový:** v CI insert lead → `lead.created`,
  update status → `lead.status_changed`, insert activity → `integration.activity`,
  všetky s nenulovým `agency_id`. Bez toho by CI mala tabuľky bez producenta.
- **Idempotencia:** každá migrácia aplikovaná 3×, fingerprint nezmenený.
  Zachovanie dát overené re-aplikovaním nad naplnenými tabuľkami.

### Princíp, ktorý sa držal celý deň: legalizuj substrate *as-is*

Reprodukovali sme PROD vrátane jeho chýb. Oprava ktorejkoľvek z nich by bola
zmena kontraktu a patrí do vlastnej brány. Zámerne neopravené:

- `platform_events.agency_id` zostáva `NULLABLE` — vyplýva z FK
  `ON DELETE SET NULL`. **Mení to dizajn A2:** `CHECK (agency_id IS NOT NULL)`
  by kolidoval s vlastným FK pri zmazaní agentúry.
- policy `platform_events_select_tenant` si ponecháva vetvu `agency_id IS NULL`
  → osirené eventy vidí každý prihlásený používateľ.
- `ai_jobs`: RLS zapnuté, **0 policies** = deny-all mimo `service_role`.

### Rozhodnutia o dopade na PROD

- **Triggery (#625) sa vytvárajú iba ak chýbajú.** V PROD existujú, takže
  žiadny `DROP`/`CREATE` nad živým write-path na `leads`/`activities` a žiadny
  zámok na horúcich tabuľkách. Cena, priznaná: migrácia tvrdí prítomnosť, nie
  presný tvar — tvar bol overený meraním, nie vynútený migráciou.
- **Funkcie idú cez `CREATE OR REPLACE`.** Jediný rozdiel oproti PROD je koniec
  riadku: PROD nesie CRLF zdedené z archívneho súboru, repo má LF. Preto sa
  fingerprint počíta nad `prosrc` s normalizovaným CR — porovnáva sa obsah,
  nie artefakt.
- **`SET NOT NULL` (#628) guardované** — v PROD už platí, takže no-op bez
  zámku. **Žiadny backfill:** keby NULL riadky existovali, migrácia má spadnúť
  nahlas, nie ticho prepisovať dáta.

### Nálezy, ktoré vznikli meraním, nie čítaním dokumentácie

1. **`LEADS-AGENCY-FK-CONTRADICTION`** — `leads.agency_id` je `NOT NULL`,
   ale `leads_agency_id_fkey` je `ON DELETE SET NULL`. Protirečí si to:
   **zmazanie agentúry, ktorá má leady, dnes v PROD zlyhá.** Dormantné len
   preto, že sa to nerobí. Overené v CI po #628:
   `ERROR: null value in column "agency_id" ... CONTEXT: UPDATE ONLY
   "public"."leads" SET "agency_id" = NULL`.
   Riešenia (`CASCADE` / `RESTRICT` / zrušiť `NOT NULL`) majú rôzne dôsledky na
   dáta → rozhodnutie Foundera.
2. **`EMIT-EVENT-PUBLIC-EXECUTE`** — `emit_platform_event` je
   `SECURITY DEFINER` s `EXECUTE` pre **PUBLIC** (`=X/postgres`, plus `anon`,
   `authenticated`, `service_role`). Ktokoľvek ju vie zavolať s ľubovoľným
   `agency_id` a payloadom a zapísať podvrhnutý event do streamu ľubovoľného
   tenanta. RLS to nezastaví — `SECURITY DEFINER` ju obchádza.
3. **`leads.agency_id NOT NULL` vzniklo v PROD mimo migrácií.** Žiadna zo 106
   migrácií ho nedoťahuje. Founder si to dal explicitne overiť a tušil správne.
4. **`PLATFORM-EVENT-NULL-WRITER`** — `apps/crm/src/lib/ai/matching-engine.ts:36`
   volá `emitPlatformEventServer({ agencyId: null, … })`, writer chybu iba
   `console.warn`-ne. PROD má **0 NULL riadkov** → tá vetva nikdy úspešne
   nezbehla. Rovnaký vzor ako 11 mŕtvych `logAiAction` call sites.
5. **Bezpečnostný dôkaz, ktorý prežil:** `trg_activities_platform_events`
   odvodzuje agency cez `SELECT … INTO`; pri neexistujúcom `lead_id` by
   `v_agency` zostalo NULL. Oba triggery sú **AFTER** a FK
   `activities_lead_id_fkey` je validated → vetva je v PROD nedosiahnuteľná.
   **Ale:** kým `leads.agency_id` nebolo NOT NULL aj v CI, v CI dosiahnuteľná
   bola. To bol vecný dôvod pre #628, nie kozmetika.

### Oprava vlastného omylu

- **`BUS-TYPECHECK` som opakovane viedol ako `UNKNOWN`.** Bolo to prevzaté
  z tela #612, ktoré vzniklo **pred** #620. Overené v repo: `bus:typecheck`
  beží v `saas-grade-pipeline.yml:308`, commit `b3d20de` na main.
  **Položka je uzavretá**, nie otvorená.

### Procesné

- **`BUS-CI-WIRE` sa nevykonal ako samostatná brána** — #612 si CI job priniesla
  so sebou, lebo mutation evidence sa dala vyrobiť len na vetve, kde `from` gate
  existoval. Overené nepriamo: job `BUS (transport authority boundary)` bežal
  a bol zelený na #619, ktorá mení jeden SQL súbor.
- **Jedna brána = jedna PR.** Keď bol commit `a58d8b3` hotový, ale #625 ešte
  otvorená, Founder zvolil **počkať na merge** namiesto stackovania. Commit
  držaný lokálne pod tagom `pending/leads-agency-notnull`, doručený až po merge.
- **Vercel deployment padal na všetkých troch PR** na kvóte účtu
  (`api-deployments-free-per-day`, 100/deň, free plán). Nie je to chyba diffu;
  okomentované raz na každej PR, re-run nespúšťaný. Merge to nezablokovalo →
  Vercel nie je medzi required checks.
- **Detekcia mergu:** pole `merged` z `list_pull_requests` je v tomto repe
  nespoľahlivé — vracia `false` aj pre preukázateľne zmergované PR. Používať
  `state == "closed"` alebo priamo `git log origin/main`.

## 2026-09-21 — BUS-HANDSHAKE-IDENTITY: harness dorovnaný na per-agent auth

- **Nález.** #612 zaviedlo per-agent credentials do `serve.ts` a `http.ts`, ale
  `scripts/bus/handshake.ts` sa nedotklo — čítalo ďalej iba `REVOLIS_BUS_TOKEN`.
  Runbook pritom v §1 hovorí starý zdieľaný token *„rotuj preč"*, zatiaľ čo §4
  z neho stále čítal. Krok §4 (overenie round-tripu pred ChatGPT) teda po
  zapnutí per-agent režimu **nemohol prejsť** — a je to posledný krok pred
  Gate C.
- **Reprodukované proti živému serveru** (loopback, filesystem store, bez tunela
  a bez zápisu do repa), nie odvodené z kódu:
  - server `AUTH MODE: per-agent`, harness z `origin/main` s jedným tokenom →
    `BUS-001 PASS`, potom `HANDSHAKE: FAIL — POST result returned 403`.
    Bearer je platný, ale `from: claude-code` k nemu nesedí.
  - ten istý harness po rotácii zdieľaného tokenu →
    `REVOLIS_BUS_TOKEN must be set`, exit 1.
- **Korekcia vlastného skoršieho tvrdenia.** Predpovedal som „401 na každom
  volaní". Nesprávne: SOL token sa autentifikuje, takže BUS-001 prejde a padne
  až BUS-002 na `403 from_not_authorized`. Záver (remote C-0 na main neprejde)
  platí, ale mechanizmus je iný, než som napísal.
- **Zmena.** `handshakeAuthFromEnv()` číta oba `REVOLIS_BUS_TOKEN_SOL` /
  `_CLAUDE`; BUS-001 posiela ako `sol-gpt`, BUS-002 a `ack` ako `claude-code`.
  Lokálny režim beží po novom tiež per-agent, takže hranicu testuje aj bez
  tunela. Zdieľaný `REVOLIS_BUS_TOKEN` ostáva ako DEGRADED fallback.
- **Nové BUS-004** — identita ako **asserted** výsledok, nie predpoklad:
  `sol-gpt` → `outbox` musí byť `403 box_not_writable` a `sol-gpt` s
  `from: claude-code` musí byť `403 from_not_authorized`. Kontroluje sa aj kód
  chyby, nie len status: 403 zo zlého dôvodu by prešiel status testom a hranicu
  nechal nezmeranú. V DEGRADED režime sa **SKIPne** a záver znie
  `PASS (DEGRADED — identity boundary untested)` — mlčanie nie je povolenie.
- **Polovičná migrácia fail-closed.** `serve.ts` znesie nastavený len jeden z
  dvoch (chýbajúca strana je proste zamknutá). Harness nie: autentifikoval by
  jednu nohu a druhú 401, a čitateľ by hádal, ktorý test zlyhal. Odmietne bežať.
- **`from_binding` cross-check.** Harness načíta `/health` a porovná posture
  servera s vlastnou konfiguráciou. Nesúlad v ktoromkoľvek smere povie, ktorá
  strana je zle nastavená, namiesto neprehľadného 401 o tri volania neskôr.
- **Overené, štyri kombinácie, všetky proti bežiacemu serveru:**
  per-agent/per-agent → `PASS` 4/4 · shared/shared → `PASS (DEGRADED)`, BUS-004
  SKIP · per-agent server + shared harness → FAIL s presnou diagnostikou ·
  shared server + per-agent harness → FAIL s opačnou diagnostikou.
- **Testy:** 173/173 (166 pred zmenou + 7 nových pre `handshakeAuthFromEnv`).
  `tsc --strict` nad `packages/bus-core` aj `scripts/bus`: 0 chýb.
- **Korekcia po merge `b3d20de`.** Pôvodne som sem napísal, že BUS-TYPECHECK
  ostáva otvorený a typy som si doinštaloval ad hoc. Medzitým pristálo #620,
  ktoré typecheck zapojilo do CI — a BUS job na tomto PR (`e1c42b6`) bežal proti
  merge refu s novým workflowom, takže `npx tsc -p tsconfig.json --noEmit`
  s `typescript@5.9.3` a `@types/node@22` prešiel **v CI**, nie len u mňa.
  Dôkaz je silnejší, než aký som pri odosielaní tvrdil.
- **Nezmenené:** `serve.ts`, `http.ts`, `consumer.ts`, `consume.ts`, auth model,
  `outbox` boundary, ACK sémantika. Zmena je v harnesse a v runbooku.
- **Čo to neodomyká.** Gate C ostáva zablokovaný: `bus/main` je stále na
  `17f30d4` (2026-09-19), žiadny remote C-0 nebežal. Toto odstraňuje prekážku
  v kroku §4, nespúšťa ho.

## 2026-09-23 — P-2 + P-3: RLS model loop tabuliek uzavretý v repe (#644, #645)

- **P-2 (#644 `5b2e915`) — rozdelenie 2/3, bez zmeny schémy.** Päť loop tabuliek
  dostalo explicitný RLS model. Dve infra (`ai_jobs`, `lead_triage_idempotency`)
  ostávajú `RLS ON, 0 policies` — ale už **ako zámer, nie ako opomenutie**:
  obe majú `COMMENT ON TABLE 'intentional infra deny-all'`, lebo nemajú tenantný
  kľúč a prístup k nim ide výlučne cez `service_role` (`rolbypassrls`). Tri
  tenantné (`credit_ledger`, `decisions`, `exclusivity_outcomes`) dostali
  SELECT + INSERT pre `authenticated` scopované na `agency_id`.
- **Prečo DROP+CREATE a nie guard na neexistenciu.** `credit_ledger` už tenantné
  policies mal — z `20260613000000`, ktorá však v PROD nikdy nebežala.
  `DROP POLICY IF EXISTS` + `CREATE` je jediný tvar, ktorý **konverguje obe
  strany na rovnaký výsledok** bez ohľadu na to, čo na danej inštancii je.
- **Odchýlka od zadania, hlásená pred implementáciou.** Zadanie znelo
  `USING (agency_id = current_agency_id())`. Tá funkcia v repe **neexistuje**.
  Použitý je zavedený helper `public.profile_agencies_for_auth()` (`SETOF uuid`,
  `SECURITY DEFINER`, `STABLE`, 26 migrácií). Sémanticky ekvivalent pre
  používateľa s jednou agentúrou, korektný aj pre viac.
- **P-3 (#645 `6ae75ba`) — vetva `agency_id IS NULL` zatvorená natrvalo.**
  Tri policies (`platform_events_select_tenant`, `ai_action_audit_select_tenant`,
  `ai_action_audit_insert_tenant`) sprístupňovali každému prihlásenému riadky
  s `agency_id IS NULL`. Podmienka na uzavretie bola count = 0; meranie proti
  živému PROD tesne pred zmenou: `platform_events` **1420 / 0 NULL**,
  `ai_action_audit` **186 / 0 NULL**. (Skoršie meranie ukazovalo 178 — tabuľka
  je živá, číslo narástlo; `NULL = 0` platí v oboch.)
- **Zvyšok výrazu ostal bajt na bajt.** Nemenil sa `cmd`, `roles` ani tvar
  poddotazu, a **zámerne** sa nepresúval na `profile_agencies_for_auth()`, hoci
  je to inde v repe zavedený helper. Brána odstraňuje vetvu, nič iné.
- **Nález, ktorý zmenil tvar P-3 migrácie: `ai_action_audit` nemá rovnaký tvar
  v CI a v PROD.** Repo migrácia `20260616123000_rls_wave_a_hardening.sql` obe
  menované policies dropuje a nahrádza jedinou `ai_action_audit_tenant`
  (`FOR ALL`, `profile_agencies_for_auth`) — ale v PROD nikdy nebežala, je jednou
  zo 60 neaplikovaných. Bezpodmienečný `CREATE` by teda v CI **pridal** policies,
  ktoré tamojší model nemá; a permisívne RLS policies sa **OR-ujú**, teda by
  prístup **rozšíril**, nie zúžil. Preto sú zmeny na `ai_action_audit` guardované
  na existenciu policy: v CI no-op, v PROD prepis. Testované obe vetvy zvlášť.
- **Dôkaz behaviorálny, nie len tvarový.** Ako rola `authenticated`
  (`begin; set local role authenticated; set local "request.jwt.claim.sub" = …`),
  fixtures 1 vlastný + 1 osirený riadok:
  `platform_events` SELECT — so starou policy osirený viditeľný **1**, po P-3 **0**;
  `ai_action_audit` INSERT `agency_id → NULL` — so starou policy `INSERT 0 1`,
  po P-3 `ERROR: new row violates row-level security policy`.
  Replay celého setu `APPLIED_OK=111 FAILED=0`, migrácia aplikovaná 3× — idempotentná.
- **DÔLEŽITÉ — merge do `main` nezatvoril dieru v PROD.** Obe migrácie sú
  v aktívnom sete, ale **neaplikované na PROD**; deploy je samostatná brána.
  Overené po merge #645: všetky tri policies majú v PROD stále vetvu
  `(agency_id IS NULL) OR …`. Repo je uzavreté, PROD nie.
- **`BUS` CI blocker — diagnostikovaný, opravený iným PR.** `bus:validate` padal
  na `Unsupported YAML line: --- (line 1)` kvôli UTF-8 BOM (`EF BB BF`) v
  `.ai/bus/tasks/TASK-BUS-RUNNER-2D.md`, zavedenému commitom `36ff454` (#624);
  červené bolo aj na `main`, teda na každom PR v repe. Diagnóza s dôkazom
  reprodukcie na base vetve je v komentári na #644. Opravené cez #647/#648,
  `bus:validate` je zelený (0 errors). **Root cause ale ostáva otvorený:**
  `packages/bus-core/src/yaml.ts` BOM stále netoleruje — ďalší súbor uložený
  s BOM zhodí pipeline znova.

## 2026-09-23 — Gate A/B zavreté, Gate C stále bez dôkazu (#649, #653)

- **Gate B zmergovaný ako `ee3d9f3` (#649): capability `repo-head`.** Prvá
  capability, ktorej odpoveď nie je konštanta. `BUS ALIVE` dokazuje, že sa
  slučka točí, ale jeho dve pevné slová by vyzerali rovnako z procesu, ktorý
  tento stroj nikdy nevidel. `repo-head` odpovedá commitom, na ktorom runner
  stojí, a kontrakt porovnáva odpoveď proti sha prečítanej **pred** spustením
  procesu — vymyslená, dobre tvarovaná sha kontrakt neprejde.
- **Hranica sa nepohla a nesmie sa tak čítať.** Exekútor ďalej beží s
  `--tools ""`, `--safe-mode`, `--permission-mode manual` a v zahadzovacom cwd,
  bajt na bajt. **Model nedostal prístup na čítanie.** Číta runner, model
  relayuje, kontrakt chytí model, ktorý nerelayuje. Dať modelu vlastné nástroje
  je samostatné rozhodnutie za samostatnou bránou — bez GO sa neotvára.
- **Mechanizmus rozšírenia dosahu je zámerne úzky.** Capability deklaruje
  `facts` — uzavretú úniu (dnes jediný `repo_head`), ktorú runner zbiera cez
  mapu `FACT_SOURCES` v `consume.ts`. Capability **pomenuje, čo potrebuje,
  nie príkaz.** Pridať dosah znamená pridať zdroj pod review, nie nový reťazec.
- **Fakty sa zbierajú pred rozpočtom.** Stroj, ktorý nevie odpovedať na
  `git rev-parse HEAD`, je problém prostredia: beh zlyhá, task ostane otvorený,
  slot sa neminie, blocker sa nepošle. Ďalší cyklus to skúsi znova.
- **Jeden test púšťa skutočný `FACT_SOURCES.repo_head` bez injekcie** a pripína
  ho na `git rev-parse HEAD`. Bez neho by jediný kus dotýkajúci sa stroja
  zostal brána existujúca len na papieri — presne to, čo riešilo #620.

### Korekcia: „BOM zhadzuje parser" bolo nesprávne (#653)

- `bus:validate` bol červený na maine a ja som príčinu určil ako **UTF-8 BOM**
  v `TASK-BUS-RUNNER-2D.md` a na tom základe odporučil BOM-tolerantný parser.
  **Nesprávne.** Reprodukované priamo proti parseru:

  | vstup | výsledok |
  |---|---|
  | `---` | parsed |
  | `BOM + ---` | **parsed** — samotný BOM je neškodný |
  | `BOM + --- potom ---` | ERROR |
  | `--- potom ---` (bez BOM) | ERROR — tá istá chyba, BOM netreba |

- Príčinou bol **zdvojený `---`**. `parseBusDocument` strihá vedúci BOM
  odjakživa (`envelope.ts:151`), takže parser BOM-tolerantný **už bol** — len to
  nikto nepripol testom, čiže tolerancia bola náhodná.
- Dátovú polovicu opravilo #648 (zmazaný riadok bol presne `﻿---`).
  Parserová polovica je #653 (`6f6e367`): hláška pomenuje príčinu
  (`duplicated frontmatter delimiter`) namiesto symptómu
  (`Unsupported YAML line: ---`), plus tri regresné testy — BOM sa parsuje,
  zdvojený delimiter je odmietnutý v oboch podobách, a nepodporovaný riadok,
  ktorý delimiter nie je, si drží generickú hlášku.

### Druhá korekcia z tej istej línie

- Pri #626 som napísal, že starý handshake dostane „401 na každom volaní".
  Skutočné zlyhanie bolo **`403` na BUS-002**: SOL token sa autentifikuje, takže
  BUS-001 prejde a padne až výsledok s `from: claude-code` pod SOL bearerom.
  Záver (remote C-0 na maine neprejde) platil, mechanizmus nie.

### Stav brán

| Brána | Stav |
|---|---|
| Gate A | ✅ `45989e8` (#612) — per-agent identita, `from` viazané na bearer |
| Gate B | ✅ `ee3d9f3` (#649) — `repo-head`, hranica `--tools ""` nedotknutá |
| Gate C | 🔴 **BLOCKED** — `bus/main` stále `17f30d425971fe86a78e213c70d67cce8241403d`, remote C-0 nebežal |

- **Gate C je founder-side a nedá sa obísť odo mňa.** Runbook aj handshake sú
  na `main` pripravené; potrebný je server s `AUTH MODE: per-agent` a
  `store: github`, tunel, a **oba** tokeny v prostredí shellu, z ktorého sa
  handshake spúšťa. Dôkaz = päť riadkov výstupu (`MODE:`, `SERVER AUTH:`,
  `store:`, štyri `BUS-00x`, `COPY_PASTE_REQUIRED:`) plus `before`/`after` TIP
  vetvy `bus/main`. Tokeny sa neposielajú do chatu.
- **Nezapísané zámerne:** `memory/session-summary.md` sa nedotýkam — drží stav
  paralelne bežiacej session (revenue blocker `/upgrade`) a prepis by ho zahodil.
  Founder rozhodol „len decisions".
