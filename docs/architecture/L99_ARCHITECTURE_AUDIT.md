# REVOLIS.AI — L99 Architecture Audit & Refactor Plan

**Autor:** Senior Staff Engineer (architektonický strážca)
**Dátum:** 2026-05-03
**Rozsah:** Celý monorepo `RealitkaAI` so zameraním na `apps/crm` (Next.js 16, React 19, Supabase, Vercel)
**Stav výstupu:** PLAN ONLY — žiadne zmeny v kóde neboli vykonané (v súlade s `CLAUDE.md` direktívou).
**Cieľová úroveň:** L99 — architektúra, ktorú by v 2026 postavil staff-tím z OpenAI / Notion / HubSpot / Salesforce / Zapier.

---

## 1. Metóda a rozsah analýzy

Boli prečítané a štatisticky vyhodnotené:

- 802 TS/TSX súborov v `apps/crm/src`
- 161 API route handlerov v `src/app/api`
- 50 dashboard stránok, 8 marketing, 26 public route-ov
- 23 stavových "store" modulov v `src/lib/*-store.ts`
- 36 SQL migrácií v dvoch nezávislých priečinkoch
- 2 paralelné security guardy (`lib/revolis-guard.js` + `src/middleware.ts`)
- `vercel.json`, `server.mjs`, `tsconfig.json`, `package.json`, `eslint.config.mjs`
- `/memory/*.md` (rozhodnutia, ponuka, ľudia, skills, preferencie, personalita)
- Posledných 20 commitov v git history

Ciele auditu (per `CLAUDE.md` projektových inštrukcií): identifikovať architektonické slabiny, navrhnúť cieľový stav, dať bezpečný step-by-step plán. Bez zmeny kódu.

---

## 2. Sumár súčasnej architektúry

### 2.1 Top-level layout

`RealitkaAI/` (root monorepo)
- `apps/crm` — hlavná SaaS aplikácia (Next.js 16, React 19, App Router)
- `apps/marketing` — samostatný Next.js 15.3 web (NIE je v root `workspaces`)
- `supabase/` — 36 očíslovaných SQL migrácií
- `scripts/`, `briefs/`, `memory/`, `tmp-revolis-import/`
- `REVOLIS_L99_MASTER_PROMPT.md` (15 KB špecifikácie),
  `repo-structure.txt` (3 MB textový snapshot — checked-in artifact)

### 2.2 Aplikácia `apps/crm`

| Vrstva | Cesta | Stav |
|---|---|---|
| App shell (Next App Router) | `src/app` | 318 súborov, 4 paralelné route-grupy: `(app)`, `(dashboard)`, `(marketing)`, `(public)` |
| API handlers | `src/app/api` | 161 route.ts, ploché, bez verziovania |
| Komponenty | `src/components` | 225 súborov, 49 podpriečinkov vrátane `legacy/` a `backup-ui/` |
| Domain layer | `src/domain` | 9 súborov (anemický) |
| Application services | `src/services` | 8 súborov |
| Infrastructure | `src/infra` | 6 súborov (EventStore, EventBus, 3 repository, 1 scraper) |
| Background jobs | `src/jobs` | 2 súbory |
| AI orchestrácia | `src/ai` (1) + `src/lib/ai` (34) + `src/lib/ai-engine.ts` + `src/lib/ai-insights` (3) + `src/app/api/ai` (10+) | rozhádzané v 5 lokáciách |
| Lib (god folder) | `src/lib` | 196 súborov: 96 voľných na top-leveli + 23 podpriečinkov (z toho 5 prázdnych) |
| State (stores) | `src/lib/*-store.ts` | 23 ad-hoc stores; len 1 naozaj používa `zustand.create()` |
| Hooks | `src/hooks` | 15 súborov |
| Types | `src/types` | 9 súborov |
| Tests | `src/__tests__` + `src/lib/__tests__` + `src/lib/ai/__tests__` | ~20 spec súborov pre ~800 zdrojových — pokrytie ~2.5 % |

### 2.3 Runtime / deploy

- **Hosting:** Vercel (sériaš serverless functions + edge middleware)
- **DB:** Supabase (Postgres + RLS + Storage + Auth)
- **Real-time:** Vlastný `server.mjs` so Socket.IO (mimo Vercel edge runtime — funguje len pri `dev:ws` / `start:ws`)
- **Cron:** `vercel.json` registruje 4 cron jobs — ale `/api/cron/*` má 11 endpointov a `/api/agents/*` ďalšie 4
- **AI providers:** Anthropic SDK + OpenAI SDK (oba ako priame deps, bez gateway abstrakcie)
- **Outbound:** Resend, Nodemailer, Twilio, Brevo, Web-Push — bez unifikovaného `MessageBus`
- **Maps:** Mapbox GL (client)
- **3D:** three.js r0.183
- **Validation:** Zod 4
- **Auth:** `@supabase/ssr` cez `src/middleware.ts`

### 2.4 Pôvodné dizajn-rozhodnutia (z `/memory/decisions.md`)

1. **Štafetová orchestrácia**: `SCRAPED → SCORED → SEGMENTED → OUTREACH_DONE` — stavový stroj cez DB, nie cez kaskádové crony.
2. **Centralizovaný Revolis Guard middleware**: jeden vyhadzovač pre všetky endpoints.
3. **Automatizovaná rotácia kľúčov**: 32-znaková entropia cez `openssl`.
4. **One-click deployment**: jeden Bash príkaz pre celý release.

Audit zistil, že tieto rozhodnutia sú **iba čiastočne implementované** — viď problém #1 nižšie.

---

## 3. Architektonické problémy (priorita podľa blast radius)

### 🔴 P0 — kritické, bezpečnostné a produkciu-ohrozujúce

**P0.1 — Dva nekonzistentné security guardy.**
`lib/revolis-guard.js` (CommonJS-style, mimo `src/`) overuje `?key=` query param oproti `CRON_SECRET`. `src/middleware.ts` (TS, edge runtime) overuje Supabase session. CRON routes obchádzajú middleware úplne (`isCronRoute()` skoro pre `/api/agents` aj `/api/scoring` aj `/api/segmentation`), ale nie všetky cron-podobné routes sú v whitelist (`/api/cron/*` cestu nepokrýva). Tajomstvo v query stringu **leakuje do log súborov, Vercel analytics a Referer hlavičky**.

**P0.2 — `rate-limit.ts` je in-process Map → na serverless nefunguje.**
Vercel functions sú efemérne. Každý cold start má svoju mapu. V produkcii je rate-limit **ticho prepadnutý** — útočník dostane neobmedzený throughput.

**P0.3 — `EventBus` je in-memory singleton, ale beží na serverless.**
Producent eventu v jednej lambda inštancii nikdy nedoručí konzumentom v inej. Domain-event flow je rozbitý vždy okrem prípadu, keď producent aj konzument bežia v tej istej požiadavke. EventStore (DB) existuje, ale Bus naň nie je napojený.

**P0.4 — `mockDb.ts` a `mock-data.ts` sú importované z PRODUKČNÝCH stránok.**
`src/app/(dashboard)/leads/page.tsx`, `team/page.tsx`, `dashboard/revolis-ai/page.tsx`, `components/leads/leads-module.tsx`, `lib/leads-store.ts`, `lib/embeddings.ts` všetky volajú `mock-data` alebo `mockDb`. To znamená, že časti UI ukazujú demo-dáta aj v produkcii (alebo padajú, lebo `mockDb` drží stav v `let` premennej, ktorá je na serverless prázdna pri každom volaní).

**P0.5 — `E2E_BYPASS_AUTH` má len NODE_ENV check, žiadny test/CI guard.**
Stačí jedno omylom nasadené `NODE_ENV=development` (alebo úprava env premennej cez Vercel UI) a auth je vypnutý. Žiadny smoke test toto neoveruje.

### 🟠 P1 — vysoká, architektonická dlhopis

**P1.1 — `src/lib` je god folder.**
96 voľných súborov + 23 podpriečinkov (z toho 5 prázdnych: `legal/`, `matching/`, `scoring/`, `scraper/`, `sales/` má 1 súbor). `leads-store.ts` má **1388 riadkov** a mieša persistence, business logiku, mock data a UI helpers. `properties-store.ts` má 573 LOC. To je antipattern pre L99 — domain logika musí žiť v `src/domain`, nie v `src/lib`.

**P1.2 — Domain/Service/Infra vrstvy sú ANEMICKÉ.**
`src/domain` má 9 súborov pre celú akviznú a sales doménu. `src/services` má 8. `src/infra` má 6 (z toho 1 EventBus, 1 EventStore, 3 repos, 1 scraper). Reálne business pravidlá nie sú tu — sú v `lib/`. Vznikol "Hexagonal architecture" iba na papieri, kód žije inde.

**P1.3 — Štyri paralelné route grupy s prekrývajúcimi sa konceptami.**

| Koncept | `(app)` | `(dashboard)` | `app/` (no group) | `app/api` |
|---|:-:|:-:|:-:|:-:|
| dashboard | ✅ (prázdny) | ✅ | ✅ | ✅ |
| billing | ✅ | ✅ | — | ✅ |
| forecast | ✅ | ✅ | — | ✅ |
| settings | ✅ | ✅ | — | ✅ |
| team | ✅ | ✅ | ✅ | ✅ |

`(app)/dashboard/page.tsx` neexistuje — group je „rozpísaná migrácia, ktorá zamrzla". V Next App Router-i to vedie ku konfliktom v rendering tree-i a k chybám 404 vs 500.

**P1.4 — Cron registry mismatch.**
`vercel.json` obsahuje 4 crony. V kóde existuje **14 cron-like endpointov** (`/api/cron/*` 10 + `/api/agents/*` 4). Ostatné sa nikdy automaticky nespustia, alebo sa spúšťajú neviditeľne externe — žiaden zdroj pravdy.

**P1.5 — Migrácie v dvoch nezávislých adresároch.**
`supabase/01..34*.sql` (manuálne číslované) a `src/infra/db/migrations/002_event_store.sql` (vlastné číslovanie). Číslo `002` koliduje so `supabase/02_*`. Žiadny migrátor (sqitch/dbmate/Supabase CLI) — manuálne aplikované.

**P1.6 — AI logika rozsekaná na 5 miest.**
`src/ai/`, `src/lib/ai/` (34 súborov: `engine.ts`, `scoring-engine.ts`, `l99-engine.ts`, `matching-engine.ts`, `sales-brain.ts`, `decision-flags.ts`...), `src/lib/ai-engine.ts`, `src/lib/ai-insights/`, `src/app/api/ai/*`. Tri rôzne "engine" súbory s prekrývajúcou sa zodpovednosťou. Žiadny `AIGateway` cez ktorý by tiekli všetky LLM volania (kvôli token-budgetu, rate-limitu, audit logu, fallbacku).

**P1.7 — 23 ad-hoc stores, 22 z nich nie sú zustand stores.**
`*-store.ts` názov sľubuje state management, ale väčšinou ide o module-level singletons s `let` premennými, alebo wrappery nad fetch-om. Server/klient hranica je úplne stratená. Žiaden TanStack Query, žiadny SWR, žiadna kanonická data-fetching vrstva.

**P1.8 — 161 API routes bez verziovania a bez modulov.**
Žiadne `/api/v1/...`. Žiadne kategórie. `route.ts` súbory obsahujú parsing, validáciu, biz logiku aj DB volania — žiadny handler/controller pattern. Nedá sa bezpečne deprecovať starší endpoint.

### 🟡 P2 — stredná, údržba a clarity

**P2.1 — Repo hygiena katastrofa.**

- `src/{components/{layout,ui,charts,portals},app/` — priečinok s **literálnym `{` v názve** (zlyhaný shell glob expansion).
- `apps/crm/apps/crm/.git` — repo naklonovaný do seba.
- 5 `.bak` súborov priamo v `src/`.
- `billing-store.ts.bak`, `forecasting/page.tsx.bak`, `layout.tsx.bak` (dashboard root layout!), `LiveDemoExperience.tsx.bak`, `SlackLayout.tsx.bak`.
- `propertiesStore.ts` (3 LOC) + `properties-store.ts` (573 LOC) — duplicita kebab vs camel.
- `fix-stubs.mjs`, `fix-stubs-2.mjs` v rooti `apps/crm`.
- `repo-structure.txt` (3 MB!) checknutý do gitu.

**P2.2 — Hybrid TS/JS bez plánu.**
`revolis-guard.js`, `server.mjs`, `next.config.js`, `tailwind.config.js`, `jest.config.js`, `fix-stubs*.mjs`, `scripts/slack-brief-sender.js` — JavaScript v projekte, kde inak je všetko TS. Type safety nedotiahnutá.

**P2.3 — Slovenčina ↔ Angličtina v štruktúre.**
`(dashboard)/akvizieia/` (preklep — má byť `akvizícia`), `klonovanie-kupujucich`, `zachran-samopredajcu`, `porovnanie-programov`, `rozpis-funkcionalit` vs. `dashboard`, `team`, `forecast`, `settings`. Ťažko sa hľadá, ťažko sa generujú slugy.

**P2.4 — Magic strings namiesto enumerácií.**
`src/lib/ai-engine.ts` má hardcoded `"Nový" | "Teplý" | "Horúci" | "Obhliadka" | "Ponuka"`. Status hodnoty sa opakujú v `mock-data.ts`, `leads-store.ts`, DB schéme, prekladoch. Žiadny `LeadStatus` enum / typed const.

**P2.5 — Test theatre.**
`"test": "echo 'No tests yet' && exit 0"` v `package.json`. ~20 spec súborov pre 800 zdrojových. Husky pre-push beží lint, ale lint má v `package.json` vypnutých 6 pravidiel (`react-hooks/purity`, `react-hooks/immutability`, `no-var`, ...).

**P2.6 — Dva test runnery.**
`jest.config.js` aj `vitest.config.js`. Jeden pre staré, druhý pre nové. Žiadne rozhodnutie ktorý vyhrá.

**P2.7 — Duplicate UI homes.**
`src/components/ui` (2 súbory) + `src/ui` (subfoldery `analytics`, `playbook`) + `src/components/shared` (10 súborov). Dizajn systém roztrhaný cez 3 lokácie.

**P2.8 — Verziová drift medzi appmi.**
`apps/crm` Next 16.2, React 19.2. `apps/marketing` Next 15.3, React 19.0. `apps/marketing` nie je v `workspaces`, takže `npm install` v rooti ju nezahŕňa.

### 🟢 P3 — nízka, kozmetika a drobnosti

- BOM (`﻿`) na začiatku `api-response.ts`.
- `lucide-react@^1.7.0` — to je 6 rokov stará verzia (chyba? Lucide je momentálne v0.4xx).
- Eslint script s `--quiet` a 6 vypnutými pravidlami — supresuje signál.
- `framer-motion@12`, `mapbox-gl@3`, `three@0.183` — všetky najnovšie, žiadny lock na patch verziu.

---

## 4. Cieľová architektúra (L99 — 2026 staff-tím)

### 4.1 Filozofia

Tri princípy ktoré L99 tím v Silicon Valley nikdy nepustí:

1. **Bounded contexts > flat folders.** Každý doménový subsystém (Leads, Properties, Matching, Outreach, Billing, Agents) má vlastnú vertical slice: `domain/`, `application/`, `infra/`, `ui/`, `api/`.
2. **Stateless edge, stateful core.** Nič v procese (rate-limit, eventbus, cache) — všetko v Redis/Postgres. Edge layer je čistý router + auth + observability.
3. **AI ako first-class citizen, nie ako lib.** Jeden `AIGateway` so token budgetom, fallback maticou, audit logom, prompt registrom. LLM-y sú swap-able dependency, nie hardcoded import.

### 4.2 Cieľový adresárový strom (apps/crm)

```
apps/crm/
├─ src/
│  ├─ app/                              # Next App Router — IBA shell + RSC routing
│  │  ├─ (auth)/                        # login, register, forgot-password
│  │  ├─ (workspace)/                   # dashboard, leads, properties, matching, outreach, billing, settings
│  │  ├─ (marketing)/                   # landing, blog, demo
│  │  ├─ (public)/                      # legal, makleri/[slug]
│  │  └─ api/v1/                        # všetky route handlers, verziované
│  │     ├─ leads/                      # tenké HTTP wrappery → modules/leads/api
│  │     ├─ properties/
│  │     └─ ...
│  ├─ modules/                          # ★ JADRO: bounded contexts (vertical slices)
│  │  ├─ leads/
│  │  │  ├─ domain/                     # Lead aggregate, LeadStatus enum, domain events
│  │  │  ├─ application/                # CreateLead, ScoreLead, AssignLead use-cases
│  │  │  ├─ infra/                      # SupabaseLeadsRepository, LeadsEventStore
│  │  │  ├─ ui/                         # LeadCard, LeadList, LeadDetail (RSC + client)
│  │  │  ├─ api/                        # http handlers (volané z app/api/v1/leads)
│  │  │  └─ index.ts                    # public barrel — JEDINÝ povolený import-point
│  │  ├─ properties/
│  │  ├─ matching/
│  │  ├─ outreach/                      # email, sms, push, slack — pod jedným MessageBus
│  │  ├─ billing/                       # Stripe + plán + entitlements
│  │  ├─ ai/                            # AIGateway, prompt registry, token budget, fallback matrix
│  │  ├─ agents/                        # Cleaner, Competitor-Watch, Deal-Trigger, Social-Scout
│  │  ├─ scraping/                      # XML feeds, portál sources, kataster
│  │  └─ playbook/                      # Daily playbook, BRI, morning brief
│  ├─ platform/                         # ★ Cross-cutting infra (žiadna doména)
│  │  ├─ db/                            # Supabase clients (browser/server/admin), migrátor
│  │  ├─ auth/                          # session, RBAC, RevolisGuard (jediný)
│  │  ├─ events/                        # Redis-backed EventBus + EventStore + outbox
│  │  ├─ rate-limit/                    # Upstash Redis sliding window
│  │  ├─ observability/                 # logger, metrics, traces, error reporter
│  │  ├─ feature-flags/                 # GrowthBook / vlastná tabuľka
│  │  ├─ http/                          # api-response, api-validate, error mapper
│  │  └─ realtime/                      # Supabase Realtime channel API (preč so Socket.IO)
│  ├─ design-system/                    # ★ Jediný UI home (kde žije Tailwind v4 + tokens)
│  │  ├─ primitives/                    # Button, Input, Card, Dialog (radix-based)
│  │  ├─ patterns/                      # EmptyState, ErrorState, ModuleShell
│  │  ├─ icons/                         # lucide proxy
│  │  └─ tokens/                        # color, spacing, typography
│  ├─ contracts/                        # zod schemas + TS types zdieľané medzi BE/FE/DB
│  └─ test/                             # test utilities, fixtures, msw handlers
├─ migrations/                          # Sqitch/Drizzle/Supabase CLI — JEDEN zdroj pravdy
├─ scripts/                             # codemody, seedy — všetko TS
└─ docs/architecture/                   # ADRs, diagrams (mermaid)
```

### 4.3 Kľúčové architektonické komponenty

**RevolisGuard v2 (jediný).** Edge middleware s tromi režimami:
- `session` (default) — Supabase JWT
- `cron` — HMAC podpis hlavičky `x-revolis-signature` (NIE query param), s timestamp + nonce → odolný voči replay
- `service` — service-account JWT pre internú M2M komunikáciu

**AIGateway.** Singleton (per request) s API:
```ts
interface AIGateway {
  complete(req: PromptRequest): Promise<Result<Completion, AIError>>;
  stream(req: PromptRequest): AsyncIterable<Token>;
  embed(text: string[]): Promise<Result<Embedding[], AIError>>;
}
```
Vnútri: token-budget per tenant, fallback matica (Claude → GPT-4o → cached response), prompt registry s verziovaním, audit log do `ai_calls` tabuľky.

**EventBus + Outbox pattern.** Producer zapíše event do `event_store` v rovnakej transakcii ako business write (outbox). Background worker (Vercel cron + Postgres `LISTEN/NOTIFY` cez Supabase Realtime) ho dotlačí konzumentom. Žiadny in-memory Bus.

**Stateful infra cez Upstash Redis.**
- Rate limit: sliding window per IP/user
- Idempotency keys pre webhooks (Stripe, Resend, Twilio)
- Session cache pre Supabase JWT

**Štafeta v2 — explicit state machine.**
Stav leadu/property nie je `string` v DB, ale `LeadStatus` discriminated union v kóde + Postgres enum + RLS pravidlá. Tranzície definované v `modules/leads/domain/LeadStateMachine.ts`. Každá tranzícia emituje doménový event.

**API ako Contracts-first.**
`contracts/leads.ts` definuje `LeadDTO`, `CreateLeadRequest`, `LeadStatus` cez Zod. BE handler aj FE klient z neho generujú typy. tRPC alebo Zodios na type-safe RPC. `/api/v1/...` má OpenAPI spec auto-generovaný.

**Design system.**
Jeden home: `src/design-system/`. Tailwind v4 tokens. Radix primitives. Storybook pre dokumentáciu. Žiadne `legacy/`, `backup-ui/`, ani druhý `src/ui/`.

**Observability.**
Jeden logger (`pino`), jeden tracer (OpenTelemetry → Vercel/Datadog), jeden error reporter (Sentry). Štruktúrované logy s `traceId`, `tenantId`, `userId`. Žiadne `console.log` mimo skriptov.

### 4.4 Hranice modulov (kompilátorom vynútené)

`eslint-plugin-boundaries` config zabezpečí:
- `app/*` smie importovať len `modules/*/index.ts` (barrel) a `design-system/*`
- `modules/X/api` smie importovať len `modules/X/application` a `platform/*`
- `modules/X/application` smie importovať len `modules/X/domain` a `modules/X/infra` (interfaces) a `platform/*`
- `modules/X/domain` NESMIE importovať NIČ z `modules/Y` ani z `infra/`
- `platform/*` nesmie importovať `modules/*`

CI gate: `tsc --noEmit && eslint --max-warnings 0 && depcruise`.

### 4.5 Deployment

- **Edge:** Vercel — middleware + `app/api/v1/*` ako edge functions (kde je to možné), inak Node runtime
- **Async work:** Vercel cron + Supabase Edge Functions pre dlhé úlohy (>10s)
- **Real-time:** Supabase Realtime (channels nad Postgres) — koniec so `server.mjs` + Socket.IO
- **Object storage:** Supabase Storage
- **Secrets:** Vercel encrypted env + Supabase Vault, rotované cez GitHub Action raz mesačne
- **Monorepo orchestrácia:** Turborepo (cache build outputs, paralelné lint/test)

---

## 5. Refactor plán (fázovaný, každý krok je samostatne shippable)

> Princíp: **Strangler Fig** — neprerábať, ale vedľa starého kódu postaviť nový a postupne presmerovať volania. Každá fáza končí zelenou pipeline a nasaditeľnou produkciou.

### Fáza 0 — Stabilizácia (1 týždeň, NULA biznis-feature changes)

| # | Úloha | Risk | Výstup |
|---|---|---|---|
| 0.1 | Odstrániť `apps/crm/apps/crm/.git` (nested clone) | nulový | čistý working tree |
| 0.2 | Odstrániť `src/{components/...` priečinok s literálnym `{` | nulový | žiadne shell-glob preklepy |
| 0.3 | Premenovať / zmazať všetky `*.bak` súbory; obnoviť cez git history ak treba | nízky | čisté `src/` |
| 0.4 | Odstrániť `propertiesStore.ts` (3 LOC duplikát) | nulový | jeden zdroj |
| 0.5 | Vyčistiť `repo-structure.txt` (3 MB) z gitu, pridať do `.gitignore` | nulový | menší clone |
| 0.6 | Pridať `apps/marketing` do koreňových `workspaces` | nízky | konzistentný `npm i` |
| 0.7 | Zjednotiť test runner: rozhodnúť **vitest** (rýchlejší, ESM-native) → odstrániť `jest.config.js`, migrovať existujúce testy | stredný | jeden runner |
| 0.8 | Aktualizovať `package.json` `"test"` aby reálne spúšťal vitest | nízky | CI sa nedá obísť |
| 0.9 | Doplniť `vercel.json` o **všetkých 14 cron endpointov** alebo zmazať tie, ktoré nemajú byť automatizované | nízky | jeden zdroj pravdy |
| 0.10 | Smoke test pre `E2E_BYPASS_AUTH` v produkcii: build-time check `if (NODE_ENV==='production' && E2E_BYPASS_AUTH==='1') throw` | nízky | bezpečné |

**Definition of Done fázy 0:** Pipeline zelená, žiadne `.bak`, žiadne nested git, jeden test runner.

### Fáza 1 — Bezpečnostný perimeter (1 týždeň)

| # | Úloha | Risk |
|---|---|---|
| 1.1 | Vytvoriť `platform/auth/RevolisGuard.ts` ako jediný entry-point. Zmazať `lib/revolis-guard.js`. | stredný |
| 1.2 | Cron auth: prejsť z `?key=CRON_SECRET` na HMAC podpis hlavičky `x-revolis-signature`. Updatnúť `vercel.json` cron jobs aby posielali podpis (cez Vercel cron secret). | stredný |
| 1.3 | Implementovať **Upstash Redis** rate-limit (`@upstash/ratelimit`). Nahradiť `src/lib/rate-limit.ts`. | nízky |
| 1.4 | Zaviesť idempotency-key middleware pre webhooks (Stripe, Resend, Twilio). | nízky |
| 1.5 | Audit log tabuľka `security_events` (Supabase): každé použitie `service-role` key, každý cron run, každý failed auth → DB. | nízky |
| 1.6 | RLS audit cez `pgtap` testy v `migrations/tests/`. | stredný |

### Fáza 2 — Vyčistenie god folderov (2 týždne)

| # | Úloha | Risk |
|---|---|---|
| 2.1 | Vytvoriť `src/modules/` a `src/platform/` priečinky (prázdne, s README) | nulový |
| 2.2 | Migrovať `src/lib/supabase/*` → `src/platform/db/*`. Update tsconfig path `@platform/db/*`. | nízky |
| 2.3 | Migrovať `src/lib/api-response.ts`, `api-validate.ts`, `error-handler.ts`, `safe-fetch.ts`, `request-helpers.ts` → `src/platform/http/`. Odstrániť BOM. | nízky |
| 2.4 | Migrovať `src/lib/logger.ts`, `auto-error-capture.ts`, `observability-rules.ts` → `src/platform/observability/`. | nízky |
| 2.5 | Migrovať `src/lib/feature-gating.ts`, `enterprise-sales-intelligence-gate.ts` → `src/platform/feature-flags/`. | nízky |
| 2.6 | Vytvoriť `eslint-plugin-boundaries` config — povoliť IBA staré importy s `// eslint-disable boundaries — TODO module migration`. | stredný |

### Fáza 3 — Bounded context #1: Leads (2 týždne)

> Pilot. Ostatné moduly budú kópia tohto receptu.

| # | Úloha | Risk |
|---|---|---|
| 3.1 | Vytvoriť `src/modules/leads/domain/Lead.ts` — aggregate, `LeadStatus` enum (TS const + Postgres enum migration), domain events (`LeadCreated`, `LeadStatusChanged`, `LeadAssigned`). | stredný |
| 3.2 | Definovať `LeadStateMachine.ts` so všetkými povolenými tranzíciami. Test cez `vitest` na 100 % branch coverage. | stredný |
| 3.3 | Vytvoriť `LeadsRepository` interface v `domain/`, `SupabaseLeadsRepository` impl v `infra/`. Zlúčiť so `src/domain/leads/repositories/LeadsRepository.ts` ktorý už existuje. | stredný |
| 3.4 | Use-cases v `application/`: `CreateLead`, `ScoreLead`, `AssignLead`, `ListLeads` (paginated, filterable). | stredný |
| 3.5 | Tenké HTTP handlery v `modules/leads/api/` — len parsing + volanie use-case + serializácia. | nízky |
| 3.6 | `app/api/v1/leads/route.ts` — re-export z `modules/leads/api`. | nízky |
| 3.7 | Migrovať `src/lib/leads-store.ts` (1388 LOC) postupne: extrahovať každú funkciu do use-case alebo repo metódy. Starý súbor zmenší na re-export shimy. | **vysoký** |
| 3.8 | Odstrániť `src/lib/mock-data` import zo všetkých produkčných stránok. Nahradiť: dev-only seed cez Supabase. | stredný |
| 3.9 | Storybook pre `modules/leads/ui/*` komponenty. | nízky |
| 3.10 | Acceptance test: vytvor lead → score → assign → status change → fetch — všetko cez `/api/v1/leads/*`. | stredný |

### Fáza 4 — AIGateway (1 týždeň)

| # | Úloha | Risk |
|---|---|---|
| 4.1 | `modules/ai/domain/PromptRequest.ts`, `Completion.ts`, `AIError.ts` — Result<T,E> pattern. | nízky |
| 4.2 | `modules/ai/infra/AnthropicAdapter.ts`, `OpenAIAdapter.ts` — zaň `AIGateway` interface. | nízky |
| 4.3 | Token budget: `modules/ai/application/TokenBudgetService.ts` — tenant_id → daily/monthly limit z `ai_budgets` tabuľky. | stredný |
| 4.4 | Fallback matica: ak Anthropic 5xx alebo budget vyčerpaný → OpenAI → cached. | stredný |
| 4.5 | Prompt registry: `modules/ai/prompts/*.md` so semverom v frontmatteri. Loader validuje pri buildoch. | nízky |
| 4.6 | Audit log: každé volanie → `ai_calls` (tenant, prompt_id, version, in_tokens, out_tokens, latency_ms, cost). | nízky |
| 4.7 | Migrovať postupne `src/lib/ai/*`, `src/lib/ai-engine.ts`, `src/lib/ai-insights/*` → `modules/ai/`. | **vysoký** |

### Fáza 5 — Outreach + Agents (2 týždne)

| # | Úloha | Risk |
|---|---|---|
| 5.1 | `modules/outreach/domain/Channel.ts` — Email, SMS, Push, Slack ako stratégie. | nízky |
| 5.2 | `MessageBus` interface + adapters (Resend, Twilio, web-push, slack). | stredný |
| 5.3 | Migrovať `lib/outreach-store.ts`, `lib/email.ts`, `lib/sms-templates.ts`, `lib/multi-channel-sender.ts` → `modules/outreach`. | **vysoký** |
| 5.4 | Agents (Cleaner, Competitor-Watch, Deal-Trigger, Social-Scout) → `modules/agents/`. Každý agent je `application/use-case` triggerovaná cron-om alebo eventom. | stredný |
| 5.5 | Outbox pattern: ak agent emituje doménový event, ten sa najprv zapíše do `event_store` v transakcii, potom worker dotlačí na MessageBus. | stredný |

### Fáza 6 — Real-time & Events (1 týždeň)

| # | Úloha | Risk |
|---|---|---|
| 6.1 | Nahradiť Socket.IO za Supabase Realtime channels. | stredný |
| 6.2 | Zmazať `server.mjs`. Vercel deploy len `next build`. | stredný |
| 6.3 | EventBus: nahradiť in-memory `Map` za Postgres `LISTEN/NOTIFY` cez Supabase Realtime broadcast. | stredný |
| 6.4 | EventStore + Outbox worker: Vercel cron `*/1 * * * *` → drain outbox → publish. | stredný |

### Fáza 7 — Routes & API kontrakty (2 týždne)

| # | Úloha | Risk |
|---|---|---|
| 7.1 | Premenovať route grupy: `(workspace)`, `(marketing)`, `(public)`, `(auth)`. Zmazať `(app)` (prázdna). | **vysoký** |
| 7.2 | Vyriešiť kolíziu `app/dashboard` vs `app/(dashboard)/dashboard`: zvoliť jeden a 301-redirect z druhého. | stredný |
| 7.3 | Zaviesť `app/api/v1/`. Staré `app/api/*` → wrapper s deprecation warningom (response header `Deprecation: true`). | **vysoký** |
| 7.4 | OpenAPI spec generovaný z Zod schém v `contracts/`. | nízky |
| 7.5 | Slovenské slugy: pridať `next.config.js` redirects pre `akvizieia` → `akvizicia` (preklep), zjednotiť konvenciu. | nízky |

### Fáza 8 — Migrácie & Database hygiena (1 týždeň)

| # | Úloha | Risk |
|---|---|---|
| 8.1 | Zaviesť **Supabase CLI** ako jediný migrátor. | stredný |
| 8.2 | Spojiť `supabase/*.sql` a `src/infra/db/migrations/*.sql` do jedného linearizovaného poradia s timestamp-based names. | **vysoký** |
| 8.3 | Vyriešiť kolíziu `02_*` a `002_event_store`. | stredný |
| 8.4 | Pridať `pgtap` testy pre RLS, enum tranzície a constraints. | nízky |

### Fáza 9 — Design system (1 týždeň)

| # | Úloha | Risk |
|---|---|---|
| 9.1 | Vytvoriť `src/design-system/` — primitives (Button, Card, Dialog) cez Radix. | nízky |
| 9.2 | Migrovať `src/components/ui/*` + `src/ui/*` + `src/components/shared/*` → `design-system/`. | stredný |
| 9.3 | Storybook (Vite-based). | nízky |
| 9.4 | Zmazať `src/components/legacy/`, `backup-ui/`. | nízky |
| 9.5 | Jeden ikon import-point: `design-system/icons/index.ts` re-exportuje len používané `lucide-react` ikony. | nízky |

### Fáza 10 — Observability + CI gates (1 týždeň)

| # | Úloha | Risk |
|---|---|---|
| 10.1 | `pino` logger + OpenTelemetry → Vercel / Datadog. | nízky |
| 10.2 | Sentry pre FE+BE chyby. | nízky |
| 10.3 | CI gate: `tsc --noEmit`, `eslint --max-warnings 0`, `vitest run`, `playwright test --project=smoke`, `depcruise`. | stredný |
| 10.4 | Bundle size budget (Next.js stats) — fail PR ak chunk > 200 KB gzip. | nízky |
| 10.5 | Lighthouse CI na marketing app. | nízky |

### Fáza 11 — Ostatné moduly (paralelne, 4 týždne)

Pre každý: properties, matching, billing, scraping, playbook → kópia receptu z fázy 3.

### Fáza 12 — Hardening (1 týždeň)

| # | Úloha |
|---|---|
| 12.1 | Penetration test (manuálny + ZAP). |
| 12.2 | Load test (k6) — 100 req/s na top-10 endpoints. |
| 12.3 | Disaster recovery drill: obnova DB z PITR backupu. |
| 12.4 | Secret rotation cez GitHub Action — testovať. |

---

## 6. Quick Wins (môžu sa nasadiť hneď, mimo plánu)

Pre prípad, že p. Smolko alebo demo termín zatlačí — týchto **6 zmien dá L99 dojem za 1 deň** bez rizika:

1. **Zmazať `apps/crm/apps/crm/.git` a `src/{components`** (dirty workspace).
2. **Pridať `repo-structure.txt` do `.gitignore`** (zmenší clone).
3. **Premenovať `*.bak` súbory na `*.bak.deleteme`** mimo `src/` (alebo do `_archive/`).
4. **Build-time guard**: v `next.config.js` `if (process.env.NODE_ENV === 'production' && process.env.E2E_BYPASS_AUTH === '1') throw new Error('E2E bypass v prod!')`.
5. **Vyplniť `vercel.json`** o všetky existujúce cron endpointy (alebo zmazať tie, čo sa nepoužívajú).
6. **Real `npm test`**: nahradiť `echo 'No tests yet'` skutočným `vitest run` — aj keď spadne, aspoň uvidíme stav.

---

## 7. Definition of Done — L99

L99 = staff-level, šplhať na úroveň top 1% Silicon Valley tímov. Konkrétne metriky:

- **Test coverage** ≥ 70 % statements, 100 % v `domain/` a `application/`
- **TypeScript strict** vrátane `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- **Zero `any`** v `modules/` (lint rule)
- **eslint-plugin-boundaries** vynútené, žiadne `// eslint-disable boundaries`
- **OpenAPI** auto-generovaný + diffed v PR
- **p95 latency** < 200 ms na `/api/v1/leads/*`
- **Cold start** Vercel function < 500 ms
- **Bundle** dashboard route < 250 KB gzip
- **CI** beží do 5 min (turbocache)
- **MTTR** < 30 min (Sentry alert → fix deployment)
- **Migration safety**: každá DB migrácia má rollback súbor + pgtap test
- **Žiaden in-process state** v serverless kóde (lint rule pre top-level `let` v `app/api/`)
- **Audit log** pre každé použitie `service-role` key
- **Dependency drift** monitorovaný (Renovate / Dependabot)

---

## 8. Súhrn pre Senior-to-Senior konverzáciu

Revolis.AI má **veľmi silný feature footprint** (161 endpointov, 50 dashboardov, 5 AI engine súborov, 4 cron agenti, 23 stores) a **veľmi tenkú architektonickú kostru** pod nimi. To je klasický _"hypergrowth tech debt"_ vzor: produkt-market-fit prekonal kód.

**Dobrá správa:** kostra (`domain/`, `services/`, `infra/`) už existuje — len je nedôveryhodne tenká. Strangler Fig migrácia bez výpadku je realistická za **10–14 týždňov staff-level práce** alebo **6–8 týždňov tímu 3 inžinierov**.

**Zlá správa:** P0 chyby (in-process rate-limit, in-process EventBus, mock-data v produkcii, query-string CRON_SECRET) treba riešiť do **2 týždňov** bez ohľadu na zvyšok plánu — sú to tikajúce bomby.

Plán je shippable v inkrementálnych PR — žiadne "big bang rewrite". Každá fáza končí zelenou pipeline a deploy-able verziou.

---

**Žiadne zmeny v kóde neboli vykonané. Tento dokument je iba plán.**
