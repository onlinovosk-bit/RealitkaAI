# ARCHITECTURE — systémová mapa a hranice modulov

> Revolis.AI reverse-engineering & system discovery v1.0 · 2026-10-21 · HEAD `a04bc5e` (main, #908)
> Metóda: statická inšpekcia repozitára (read-only). Zdrojové súbory, komentáre a docs sú brané ako **nedôveryhodné dáta**; čo repo o sebe tvrdí, je označené „claim".
> Značky: **CONFIRMED** = overené čítaním kódu/migrácií v tejto discovery · **INFERRED** = vyvodené z kódu, nie priamo overené · **UNKNOWN** = nedá sa overiť z repozitára (typicky PROD stav).
> Cesty sú relatívne k rootu repozitára. `crm/` = `apps/crm/`, `S/` = `apps/crm/src/`, `mig/` = `apps/crm/supabase/migrations/`.
> Čísla riadkov sú presné tam, kde bol súbor znova prečítaný; inak „~" (približné). Dôkaz kódu ≠ dôkaz behu v PROD (viď `OPEN_QUESTIONS.md`).

## 1. Mapa repozitára

| Jednotka | Čo to je | Workspace? | Nasadenie |
|---|---|---|---|
| `apps/crm` | Next 16 (app router, webpack build), React 19.2, Supabase SSR, Stripe SDK 21, Resend, OpenAI, Anthropic, zod 4, vitest 4 | áno | Vercel projekt `realitka-ai` (CONFIRMED vo `crm/vercel.json`; stav PROD: UNKNOWN okrem meraní nižšie) |
| `apps/marketing` | samostatný Next ^15.3 (port 3001), vlastný `vercel.json`, bez závislosti na crm | áno | samostatná jednotka |
| `apps/realvia-ingestion` | Express + pg, vlastné `migrations/001_initial.sql`, bez Supabase | **nie** | UNKNOWN či beží |
| `apps/revenue-intelligence` | Express + BullMQ + ioredis + Slack, Dockerfile, migrácie 001–002 | **nie** | UNKNOWN či beží |
| `packages/mcp-{shared,crm,comm,calendar,telephony,onlinovo}` | samostatné MCP servery (každý vlastný Dockerfile) | áno | CRM `S/` ich nereferencuje |
| `packages/control-contract` | `@revolis/control-contract` — jediný balík importovaný CRM-kou (tsconfig path alias + vitest alias): `lib/agents/*`, `lib/inbound/approve-draft.ts`, `lib/control-plane/run-context.ts` | **nie** (alias) | build-time |
| `packages/bus-core`, `scripts/bus`, `brain/` | nástroje (npm skripty `bus:*`, `brain:*`) | nie | CRM ich neimportuje |
| `automation/n8n`, `infra/sql` | 3 exportované n8n workflowy; 1 SQL súbor | — | nie sú zapojené do CRM kódu |

Zdroje: `package.json:4-13`, `crm/package.json:33-50`, `crm/tsconfig.json:26-29`, `crm/vitest.config.js:7`, `packages/README.md:1-12`. **CONFIRMED.**

Merané (nie z kódu): PROD Supabase `ypgajkhqtbriqqmyawyv` má 7 agentúr, 0 s `stripe_subscription_id`, 142 tabuliek v `public`, všetky s `ENABLE RLS` (kvalita policies **nemeraná**). Zdroj: `mcp__Supabase__execute_sql` v tomto sedení.

## 2. Vrstvenie `apps/crm/src`

- **App router**: route groups `(dashboard)`, `(marketing)`, `(public)` + `admin`, `api`, `auth`, `dashboard`, `developer`, `f`, `login`, `onboarding`, `operator`. **238** `route.ts` súborov pod `S/app/api`. Route groups nepridávajú URL segment. CONFIRMED.
- **Hexagonálna vrstva je malý výsek**: `S/domain` (agency, buyer-readiness, leads, outbound, playbook, profiles), `S/infra` (db, email, messaging, outbound, scraping), `S/services`, `S/jobs`. Mimo týchto vrstiev ich importuje len `S/ui/playbook/components.map.ts` a 4 API routes (`api/cron/agency-scraping`, `api/leads`, `api/leads/[id]`, `api/call-script`). Väčšina logiky žije v `S/lib/*-store.ts` (~150 položiek), ktoré volajú Supabase priamo. CONFIRMED.
- **Mŕtvy/duplicitný kód** (CONFIRMED): `S/jobs/*` (4 súbory, 0 importérov; `run-outbound-send.ts` zapája `ConsoleEmailSender`, ktorý len loguje); `S/lib/supabase/browser.ts` (0 importérov); `S/lib/supabase/proxy.ts` (len sám seba); `S/app/api/login/route.ts` (stub); `S/ai/` (1 súbor); druhý `S/lib/infra/` kolidujúci názvom so `S/infra/`; `S/infra/db/migrations/002_event_store.sql` (migrácia mimo `mig/`; neskôr backfillnutá `mig/20261016170000_…`). ~8 zbytkových súborov v koreni `crm/` (`build.log`, `surgical-fix.tar.gz`, `fix-stubs*.mjs`, `outreach_contacts.csv`, `tmp-nehnutelnosti.html`, `tsconfig.tsbuildinfo`).
- **Typová kontrola**: `crm/next.config.js:45` `typescript.ignoreBuildErrors: true`; kompenzuje CI baseline-diff typecheck (`.github/workflows/saas-grade-pipeline.yml:~195`). CONFIRMED.
- **Supabase klienti**: `createClient` (cookie, anon/publishable → RLS platí; pri chýbajúcom env padá na placeholder URL/key), `createAdminClient` (`S/lib/supabase/server.ts:18-25`: `SERVICE_ROLE || anon || "placeholder-key"` — tichý downgrade), `createServiceRoleClient` (`S/lib/supabase/admin.ts:7-22`: vráti `null` pri chýbajúcom kľúči). ~88 súborov importuje `createAdminClient`, ~125 `createServiceRoleClient`; `S/lib/supabase/client.ts` (browser singleton) 31 importérov. CONFIRMED.

## 3. Hranica dôvery: request gate

`S/proxy.ts` (Next 16 náhrada za middleware): SSR Supabase klient s 5 s fetch timeoutom, `getUser()`.

| Situácia | Výsledok | Riadky |
|---|---|---|
| `isPublic`, realvia/uc/realsoft import, `/api/webhooks*`, removed/deprecated shims, `isCronRoute` | session sa **vôbec nekontroluje** | `proxy.ts:132-138` |
| nie je user, cesta `/api/*` | 401 JSON | `:194-199` |
| nie je user, `/dashboard*`, `/app*`, `/properties*` | redirect `/login` | `:201-211` |
| timeout auth — API | 401 (fail-closed) | `:177-189` |
| timeout auth — stránky | prejde (fail-open; layout re-checkuje) | `:189` |
| iné stránky (`/leads`, `/contacts`, `/operator`) | proxy ich **negateuje**; spolieha na layout `(dashboard)/layout.tsx:26` (`getUser`+redirect) | `:201-211` |

Bypass zoznamy: `PUBLIC_PATHS` (`:6-40`, 24 presných ciest), `/api/agents*`, `/api/cron/*`, `/api/followup`, `/api/inbound/gmail-pull`, `/api/scoring*` (`:42-51`), celé `/api/webhooks*` (`:54`). **Každá bypassnutá cesta musí autentifikovať sama** — viď `INTEGRATIONS.md §1`. CONFIRMED.

**Dôležité (F-02):** `/api/resend-webhook` ani `/api/morning-brief/track/{open,click}` nie sú v žiadnom bypass zozname → proxy ich bez cookie vráti 401. CONFIRMED staticky; živé správanie UNKNOWN.

## 4. Tenancy a autorizácia

- Tenant = **agentúra** (`agency_id`). RLS cez SECURITY DEFINER `public.profile_agencies_for_auth()` (`profiles.agency_id` kde `auth_user_id = auth.uid() OR id = auth.uid()`; `mig/20260419_enterprise_rls_profile_link.sql:16-33`). Jadro tabuliek (`leads`, `properties`, `activities`, matches, AI tabuľky) používa `agency_id IN (profile_agencies_for_auth())`; open-anon `using(true)` policies, `agency_id IS NULL OR …` vetvy boli odstránené, `leads.agency_id` je NOT NULL (mig `20260616124500`, `20260904150000`, `20260923070000`, `20260928070000`, `20260921200000`, `20261001160500`). CONFIRMED.
- **Team-level RLS prakticky neexistuje**: `team_id` je atribút profilu. CONFIRMED.
- **App vrstva**: `S/lib/tenant-scope.ts:25-47` `sameAgency()` je fail-closed (null na ktorejkoľvek strane = deny). `S/lib/permissions.ts:4-18` `requireRole` (chýbajúci profil = `agent`), ~25 call-sites. Role: `owner|manager|agent` + legacy `founder|admin|senior`, UI `owner`→DB `manager`, osobitný `ui_role`; `is_platform_admin` pre operator routes. CONFIRMED.
- **~195 service-role call-sites obchádzajú RLS** (~70 API route súborov; ~30 z nich nespomenie `agency_id`/tenant). Filtrovanie je konvencia + heuristický nástroj `scripts/ops/route-gates.mjs`, nie technické vynútenie. CONFIRMED (počet hrubý).
- **Guard triggery** na `profiles` proti self-escalation role/agency (`20260830231500_*`). RLS test suite `crm/tests/rls/*`; CI overuje, že reálne bežala (`saas-grade-pipeline.yml:274-277`). CONFIRMED.
- **App-mode `demo|production`** je klientský UI prepínač (localStorage + cookie), nie bezpečnostná hranica. **E2E bypass** `E2E_BYPASS_AUTH=1` (`S/lib/auth.ts:7-10,49-60`) je blokovaný `NODE_ENV` kontrolou a build-time throwom (`next.config.js:5-7`). CONFIRMED.

## 5. Plánovanie a asynchrónna práca

- `crm/vercel.json`: **19** cron záznamov (`dashboard-insights` je uvedený **dvakrát**), `ignoreCommand`. 31 `/api/cron/*` route súborov → **10 bez známeho spúšťača** (agency-scraping, auto-tune, credits-expire, credits-grant, daily-match, demo-brief, demo-recap, night-watch, onboarding-dispatch, stealth-recruiter-ingest). CONFIRMED statický rozdiel; či sa spúšťajú inak: UNKNOWN.
- 11 GitHub workflows; `gmail-inbound-pull.yml` (`*/10 * * * *`) je jediný produkčný poller mimo Vercelu (+ denný Vercel cron ako záloha). `saas-grade-pipeline.yml` (push+PR): lint, typecheck baseline-diff, vitest proti lokálnemu `supabase start`/`db reset`, RLS suite, build, Playwright smoke.
- Edge funkcie v `crm/supabase/functions/*`: ai-coaching-engine, data-api-gateway, detect-competitor-sleep, ghost-resurrection-bsm, kataster-monitor — **nečítané** (UNKNOWN čo robia a či sú nasadené).

## 6. Schéma a migrácie

- `mig/`: **141** `.sql` (~10,5 k riadkov), zmiešané 8- a 14-ciferné prefixy, bez duplicitných verzií, **0 down-migrácií**. + 27 legacy ručných SQL `crm/supabase/*.sql` (nie sú aplikované `db reset`; dva `06_*`). CONFIRMED.
- **Drift repo↔PROD** (claim samotných migrácií): 30 prod-only tabuliek bolo spätne zrekonštruovaných (`mig/20260925210000_baseline_prod_only_tables.sql:1-25`), 24 migration-only tabuliek chýba v PROD, `v_genome_*` pohľady len v PROD (`mig/20261001160500_tenant_isolation_wall.sql:7-9`). Čistá reprodukcia PROD z migrácií preto nie je zaručená.
- Governance: `schema-governance-guard.yml` má schedule zakomentovaný od 2026-06-17 (manual-only), porovnáva len prítomnosť tabuliek; `scripts/db/migration-ledger-audit.mjs` berie ručne dodaný JSON. Jediné kontinuálne vynucovanie = CI `db reset` + RLS suite. CONFIRMED.
- Repo-vs-PROD: `credit_redemption_codes` a `demo_prefill_links` nemajú v migráciách `ENABLE ROW LEVEL SECURITY`; PROD ich má (všetkých 142 s RLS) → drift (F-14).

## 7. Moduly podľa domény (kde čo žije)

| Doména | Hlavné súbory | Pozn. |
|---|---|---|
| Intake leadov | `S/app/api/{acquire/email,leads/inbound,valuation,concierge,demo,webhooks}`, `S/lib/acquire/*`, `S/lib/inbound/*` | `DATA_FLOWS.md §1` |
| Skórovanie/AI | `S/lib/ai/*`, `S/lib/ai-*.ts`, `S/app/api/cron/lead-ai-triage` (Anthropic Haiku) | prompty nečítané |
| Outbound | `S/lib/outreach-store.ts`, `S/lib/outbound-orchestrator.ts`, `S/app/api/outreach/{send,approve}`, `@revolis/control-contract` | `DATA_FLOWS.md §3` |
| Billing/ceny | `S/lib/{billing-store,pricing-v2,credits-billing-v2,credits-billing-webhook,billing-lifecycle,saas-ops,feature-gating}.ts`, `S/lib/credits/*` | `DATA_FLOWS.md §4` |
| Import | `S/lib/realvia/*`, `S/lib/uc/*`, `S/lib/realsoft/*` | inbound only |
| Alerty | `S/lib/alerts/*` (Telegram/Slack/webhooky) | |

## 8. Čo tento dokument netvrdí

Nič o PROD env hodnotách, o tom, ktoré crony/workflowy reálne bežia, o Stripe LIVE objektoch, Resend/Realvia dashboardoch, branch protection, kvalite RLS policies v PROD. Viď `OPEN_QUESTIONS.md`.
