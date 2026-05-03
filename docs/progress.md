# Revolis.AI — Progress & Status

**Posledná aktualizácia:** 03.05.2026  
**Verzia:** v11 (aktuálna produkčná)  
**Repo:** github.com/onlinovosk-bit/RealitkaAI · Branch: `main`  
**Produkcia:** app.revolis.ai · revolis.ai · Vercel region: iad1 / fra1

---

## Projekt

**Revolis.AI** je AI-first CRM platforma pre slovenské realitné kancelárie.  
Vyvíja ju **ONLINOVO, s.r.o.** (Štúrova 130/25, 058 01 Poprad · IČO: 54166942).

**Stack:** Next.js 15 · TypeScript strict · Tailwind CSS v3 · Supabase · Stripe · OpenAI · Resend · web-push  
**Monorepo:** `apps/crm/` (CRM) · `apps/marketing/` (Marketing site) · Vercel Root Directory: `apps/crm`

---

## Produkčné URL

| App | URL | Stav |
|---|---|---|
| CRM | https://app.revolis.ai | Live |
| Marketing | https://revolis.ai / https://www.revolis.ai | Live |

---

## Pricing

| Plán | Cena | Popis |
|---|---|---|
| Smart Start | 49 €/mes | 1 maklér, základné AI |
| Active Force | 99 €/mes | 1 maklér, plný AI |
| Market Vision | 199 €/mes | 1 owner + 1 maklér |
| Protocol Authority | 449 €/mes | 1 owner + 4 makléri, Gold tier |

---

## Prvý klient — Reality Smolko, s.r.o.

| Pole | Hodnota |
|---|---|
| Spoločnosť | Reality Smolko, s.r.o. |
| Sídlo | Mirka Nešpora 4884/45, 080 01 Prešov |
| IČO | 54 539 251 |
| IČ DPH | SK2121712835 |
| Zastúpený | Rastislav Smolko, RSc. |
| E-mail | office@realitysmolko.sk |
| Plán | Market Vision · 199 €/mes |
| Zmluva | RL-RS-2026/01270426 |
| Podpis | 27.04.2026, v Poprade |

---

## Legal Suite — Finálne dokumenty

| Dokument | Verzia | Stav |
|---|---|---|
| Zmluva o poskytovaní platformy | v10 | Finálna |
| Order Form | v5 | Finálna |
| DPA (Zmluva o spracovaní OÚ) | v3 | Finálna |
| Privacy Policy | v2 | Hotová |
| SLA | v2 | Hotová |
| VOP | v2 | Hotová |
| Cookie Policy | v2 | Hotová |

**Na podpis (3):** Zmluva v10 · Order Form v5 · DPA v3  
**Na oboznámenie (4):** Privacy Policy · SLA · VOP · Cookie Policy

### Zmluva v10 — kľúčové doplnenia (vs. v9)
- **Čl. Ia** — Definície (6 pojmov: Platforma, BRI skóre, L99 Intelligence, Zákaznícke dáta, Commitment Period, Príloha)
- **Čl. V bod 6** — Mimoriadna nákladová eskalácia AI API (OpenAI/Anthropic/AWS)
- **Čl. VIII bod 6** — Strop odškodnenia 200 % ročného poplatku + výnimka pre čl. XII/XIII
- **Príloha E** — AI Change Log & Release Governance (4 kategórie: Minor/Major/Critical/Emergency · changelog URL · rollback SLA 5 prac. dní)

### DPA v3 — čl. 22 GDPR
Prepísaný ako „Asistované hodnotenie leadov a ochrana dotknutých osôb (čl. 22 GDPR)" s plain-language boxom:  
*„BRI skóre je pomôcka, nie rozhodnutie. Maklér vždy rozhoduje sám."*

---

## Feature Pipeline — VS Code skripty

| # | Skript | Feature | Stav |
|---|---|---|---|
| F#1 | `create_event_pipeline.sh` | Event Sourcing | Hotový |
| F#2 | `create_bri_live_score.sh` | BRI Live Score | Hotový |
| F#3 | `create_morning_brief.sh` | Morning Brief 08:00 | Hotový |
| F#4 | `create_arbitrage_engine.sh` | Cross-Portal Arbitrage | Hotový |
| F#5 | `create_price_history.sh` | Historical Price Trail | Hotový |
| F#6a | `create_integrity_monitor_backend.sh` | Integrity Monitor Backend | Hotový |
| F#6b | `create_integrity_monitor_ui.sh` | Integrity Monitor UI | Hotový |

---

## Architektúra — Kľúčové commity (chronologicky)

| SHA | Popis |
|---|---|
| `d6f53b3` | Phase 1+2 — Event Sourcing + Leads domain |
| `1721c20` | Phase 4 — Zod validácia leads routes |
| `87b0406` | Architecture cleanup — unified types, seed-demo |
| `3ddec0e` | Fix all TypeScript errors — 0 TS errorov |
| `3b6f517` | PWA foundation — manifest, SW v2, mobile nav, FAB |
| `49266b2` | Push notifikácie + mobile leads karty + playbook UX |
| `84525cb` | Push toggle Settings + TS fix urlBase64ToUint8Array |
| `5d8af6d` | Dashboard mobile-first dark theme |
| `acd7dc2` | Lead detail mobile-first dark theme |
| `023e759` | Lead create form dark mobile-first |
| `879364f` | /leads/new standalone + SlackLayout overflow fix |
| `e7b6e58` | Supabase migration push_subscriptions |
| `2b770f9` | Onboarding Automat — cron, dispatch, checklist triggers |
| `1878d4d` | Onboarding checklist v2 — Step6/8 + firstAutomationLive |
| `c0d11d8` | Dark theme — pipeline, activities, integrations, billing |
| `f0ef6d5` | docs: progress.md |

---

## PWA + Mobile

### PWA Foundation
- `manifest.json` — ikony, theme color, standalone display
- Service Worker v2 — network-first pre API, cache-first pre statiku
- Mobile bottom navigation bar (5 položiek)
- Floating Action Button — rýchle pridanie leadu (`/leads/new`)
- Install banner — `beforeinstallprompt`

### Push Notifikácie (full stack)
- Subscribe API (`/api/push/subscribe`) — upsert + delete
- `PushNotificationService` — `notifyHotLead`, `notifyDailyPlaybook`
- `usePushNotifications` hook
- `PushNotificationsToggle` UI v Settings
- Trigger: HOT lead → push notifikácia assignovanému agentovi
- Supabase tabuľka: `push_subscriptions` + RLS

### VAPID kľúče (vygenerované 03.05.2026)
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY = BGDo0Lbnm1kyFB1ZwPsN2H6Z4Az0VwsNFzhA49d6FtOU3AkAkwnNTfKqLXgH3TNUbaV3d0iFdsagtQzZSN0svdI
VAPID_PRIVATE_KEY            = TZFi425PsLg8H49xkwrvUKovAkp4rrt0MFA2ymtAxzc
CRON_SECRET                  = 3394bd8e12795ac559665de20a1a2b758a11089367ea08b87ace45645cf4958a
```
Stav: v `.env.local` ✓ · Vercel Dashboard: pridané ✓ (redeploy potrebný)

---

## Mobile-First Dark UI

**Design systém:**
- Background: `#050914` · Karty: `#080D1A` bg, `#0F1F3D` border
- Text: `#F0F9FF` primary, `#64748B` secondary · Akcent: `#22D3EE` cyan
- Touch targets: `min-h-[44px]`

| Stránka / Oblasť | Stav |
|---|---|
| Dashboard — KPI, QuickActionsBar, PriorityLeads, ActivityFeed | Hotové |
| Leads list — mobile karty, dark filters, stats grid | Hotové |
| Lead detail — InlineField, BRI score, Sofia panel, L99 ops | Hotové |
| Playbook — PlaybookItemCard, PlaybookFilterToggle | Hotové |
| Settings — dark layout, PushNotificationsToggle | Hotové |
| Pipeline — board, slide-over, filter panel | Hotové |
| Activities — stat karty, feed | Hotové |
| Billing — header, karty, progress bar, CTA | Hotové |
| /leads/new — standalone mobile forma (3 sekcie) | Hotové |
| Performance, Forecast | Redirecty — bez vlastného layoutu |

---

## Onboarding Automat (B2B)

### DB tabuľky (migrácie aplikované na remote 03.05.2026)
- `client_onboarding_progress` — checklist JSONB, readiness score, last activity
- `client_onboarding_messages` — scheduled d1/d3/d7 emaily, status, attempts

### Checklist v2 — položky a váhy (suma = 100)

| Pole | Váha | Trigger |
|---|---|---|
| `connectedCrm` | 18 | Step7 — connectedTools.length > 0 |
| `importedLeads` | 18 | Step5 — importSource nie je prázdny/skip |
| `configuredTeam` | 12 | Step2 — agencyName + city vyplnené |
| `firstAutomationLive` | 17 | Step4 — autoReply === true |
| `firstAiBriefViewed` | 10 | Step4 — vždy |
| `firstMeetingBooked` | 10 | Manuálne (zatiaľ) |
| `pipelineConfigured` | 10 | Step6 — vždy |
| `goalsDefined` | 5 | Step8 — primaryGoal alebo kpiLeads > 0 |

### Email sekvencie (Resend)
- D+1: Welcome · D+3: CRM sync reminder · D+7: AI activation

### Cron dispatch
- `/api/cron/onboarding-dispatch` — každý deň 08:00 UTC
- Retry: `attempts < 3` pre failed správy
- Shared logika: `src/lib/onboarding-dispatch.ts`

### Admin UI
- `/onboarding-monitor` — at-risk klienti, readiness bary, missing steps
- Viditeľné pre `owner_vision` + `owner_protocol`

---

## Agency Scraping

- `PortalNehnutelnostiSource` — scraping s configurable page count
- `AgencyDiscoveryEngine` — orchestrácia
- Cron: `/api/cron/agency-scraping` — každý pondelok 02:00 UTC

---

## Vercel Crons (vercel.json)

| Endpoint | Schedule | Účel |
|---|---|---|
| `/api/cron/recompute-bri` | každú hodinu | Prepočet BRI skóre |
| `/api/cron/agency-scraping` | pondelok 02:00 | Scraping agentúr |
| `/api/cron/auto-tune` | každý deň 03:00 | AI auto-tuning |
| `/api/cron/onboarding-dispatch` | každý deň 08:00 | Onboarding emaily |

---

## Marketing Site

- Next.js static export — homepage + demo stránka
- Deploy: `revolis-marketing` projekt na Vercel
- Domény: `revolis.ai` → 307 → `www.revolis.ai` → Production ✓

---

## Infraštruktúra & CI/CD

### Vercel (CRM projekt: realitka-ai)

| Parameter | Hodnota |
|---|---|
| Root Directory | `apps/crm` |
| Build Command | `npm run build` |
| Region | iad1 (Washington) + fra1 (Frankfurt) |

**UPOZORNENIE:** `Settings → Build and Deployment → Production Overrides` — Build Command musí byť `npm run build`, nie `reset`.

### GitHub Actions
**Súbor:** `.github/workflows/saas-grade-pipeline.yml`

```
1. Install  → npm ci
2. Lint     → npm run lint
3. Test     → npm test
4. Build    → npm run build + env vars
5. Verify   → test -d .next
6. Upload   → actions/upload-artifact@v4
```

---

## Environment Variables

| Premenná | Stav |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Nastavené |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Nastavené |
| `SUPABASE_SERVICE_ROLE_KEY` | Nastavené |
| `OPENAI_API_KEY` | Nastavené |
| `RESEND_API_KEY` | Nastavené |
| `STRIPE_SECRET_KEY` | Nastavené |
| `CRON_SECRET` | Nastavené (03.05.2026) |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Nastavené (03.05.2026) |
| `VAPID_PRIVATE_KEY` | Nastavené (03.05.2026) |

---

## B2B Data API — Strategická analýza

| Segment | ARR potenciál |
|---|---|
| Banky (8 SK) | 200 000 – 500 000 € |
| Developeri | 150 000 – 750 000 € |
| Poisťovne + Fondy | 50 000 – 500 000 € |
| **Celkovo po 18 mes.** | **500 000 – 1,5 M €** |

Pricing tiers: Intelligence Feed 990 €/mes · Market Pulse 3 490 €/mes · Risk Intelligence 9 900 €/mes

**Kľúčový insight:** Banky nekupujú mapu bytov — kupujú early-warning systém kolaterálového rizika.

---

## Routing — Stav

### Vyriešené
- `/team/permissions` → presunutý do `(dashboard)` group (commit `98d8072`)
- `api/scrape` `.catch()` na PostgrestFilterBuilder opravený

### Zostatok — presunúť do `(dashboard)` group
```
src/app/dashboard/reputation/integrity/page.tsx
src/app/dashboard/revolis-ai/page.tsx
```

---

## Open Items

### Kritické
- [ ] Vercel Redeploy — po pridaní VAPID + CRON_SECRET env vars (kliknúť Redeploy)
- [ ] `/api/leads 500` — overiť Supabase env vars na Vercel

### Technické
- [ ] `npm audit fix` — 8 moderate vulnerabilities
- [ ] Presunúť `dashboard/reputation/integrity` a `dashboard/revolis-ai` do `(dashboard)` group
- [ ] `firstMeetingBooked` trigger — keď agent zabookuje 1. stretnutie
- [ ] Dark theme: Performance, Forecast stránky (low priority — sú redirecty)

### Hotové (03.05.2026)
- Legal Suite finálny (Zmluva v10, Order Form v5, DPA v3 + 4 ostatné)
- VS Code skripty F#1–F#6 (vrátane UI)
- GitHub Actions CI pipeline (zelená)
- PWA — manifest, SW v2, mobile nav, FAB, install banner
- Push notifikácie full stack (subscribe, dispatch, trigger, UI)
- VAPID kľúče vygenerované + nastavené
- CRON_SECRET vygenerovaný + nastavený
- Supabase migrácie push_subscriptions + onboarding_mvp aplikované na remote
- Mobile-first dark UI — všetky hlavné stránky
- Onboarding Automat — cron, retry, checklist triggers (Step2/4/5/6/7/8/9), admin UI
- Onboarding checklist v2 — pipelineConfigured + goalsDefined + firstAutomationLive
- Agency scraping cron
- Marketing site deployed na revolis.ai
- docs/progress.md

---

## Zlaté pravidlo CI/CD

```
1 PR = 1 logická zmena = 1 Vercel Preview Deploy = smoke testy zelené = merge

NIKDY:
✗ Viac features v jednom commite bez deploy
✗ Merge bez zeleného CI
✗ Manuálna zmena Build Command v Vercel bez dokumentácie

VŽDY:
✓ git bisect run npm run build — ak niečo padne
✓ Vercel → Settings → Build and Deployment → Production Overrides — skontrolovať
✓ smoke testy pred každým merge
```

---

*Generované automaticky zo session histórie · Revolis.AI · ONLINOVO s.r.o.*
