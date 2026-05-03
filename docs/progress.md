# Revolis.AI — Progress Log

**Projekt:** Revolis.AI CRM + Marketing Site  
**Stack:** Next.js 15, Supabase, Stripe, Resend, Vercel  
**Posledná aktualizácia:** 2026-05-03

---

## Produkčné URL

| App | URL | Stav |
|---|---|---|
| CRM (hlavná app) | https://app.revolis.ai | Live |
| Marketing site | https://marketing-e2tfnfcpg-onlinovosk-4317s-projects.vercel.app | Live (doména WIP) |

---

## Fázy vývoja

### Fáza 1–2 — Architektúra (Event Sourcing + Leads domain)
**Commit:** `d6f53b3`
- Event Sourcing foundation — `LeadStatusChanged`, `ActivityLogged` eventy
- Leads domain — typový systém, validácia, BRI (Buyer Readiness Index)
- Zod validácia na leads routes
- Marketing site vykanie / príležitosť lokalizácia

### Fáza 3 — Playbook + Agency Scraping
**Commit:** `b8b556d`, `d25d7ab`
- Playbook engine — denné AI odporúčania pre maklérov
- Agency scraping — `PortalNehnutelnostiSource`, `AgencyDiscoveryEngine`
- Profiles domain + Supabase repozitár

### Fáza 4 — Architecture Cleanup
**Commit:** `87b0406`, `771a255`, `3ddec0e`
- Zjednotenie typov, odstránenie mŕtveho kódu
- 0 TypeScript errorov
- Seed-demo inline generátor

---

## PWA + Mobile

### PWA Foundation
**Commit:** `3b6f517`
- `manifest.json` — ikony, theme color, standalone display
- Service Worker v2 — network-first pre API, cache-first pre statiku
- Mobile bottom navigation bar (5 položiek)
- Floating Action Button — rýchle pridanie leadu
- Install banner — `beforeinstallprompt`

### Push Notifikácie
**Commit:** `49266b2`, `84525cb`
- Subscribe API (`/api/push/subscribe`) — upsert + delete
- `PushNotificationService` — `notifyHotLead`, `notifyDailyPlaybook`
- `usePushNotifications` hook — subscribe/unsubscribe
- `PushNotificationsToggle` UI komponent v Settings
- Trigger: HOT lead → push notifikácia assignovanému agentovi
- Supabase migration: `push_subscriptions` tabuľka + RLS

### ENV vars (VAPID + CRON)
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — vygenerovaný, v `.env.local`
- `VAPID_PRIVATE_KEY` — vygenerovaný, v `.env.local`
- `CRON_SECRET` — vygenerovaný, v `.env.local`
- **TODO:** Pridať na Vercel Dashboard → Environment Variables

---

## Mobile-First Dark UI

**Design systém:**
- Background: `#050914`
- Karty: `#080D1A` bg, `#0F1F3D` border
- Text: `#F0F9FF` primary, `#64748B` secondary
- Akcent: `#22D3EE` cyan
- Touch targets: `min-h-[44px]`

### Konvertované stránky/komponenty
**Commits:** `5d8af6d` → `c0d11d8`

| Oblasť | Stav |
|---|---|
| Dashboard | Hotové — KPI karty, QuickActionsBar, PriorityLeads, ActivityFeed |
| Leads list | Hotové — mobile karty (`LeadCardMobile`), dark filters, stats grid |
| Lead detail | Hotové — InlineField, select, quick actions, BRI score, Sofia panel, L99 ops |
| Playbook | Hotové — `PlaybookItemCard`, `PlaybookFilterToggle` touch targets |
| Settings | Hotové — dark layout, PushNotificationsToggle |
| Pipeline | Hotové — board, slide-over, filter panel |
| Activities | Hotové — stat karty, feed |
| Billing | Hotové — header, karty, progress bar, CTA |
| /leads/new | Hotové — standalone mobile forma (3 sekcie) |

---

## Onboarding Automat (B2B)

### Infraštruktúra
**Commits:** `2b770f9`, `1878d4d`

**DB tabuľky:**
- `client_onboarding_progress` — checklist, readiness score, last activity
- `client_onboarding_messages` — scheduled d1/d3/d7 emaily

**Checklist položky (v2):**
| Pole | Váha | Trigger |
|---|---|---|
| `connectedCrm` | 18 | Step7 — connectedTools.length > 0 |
| `importedLeads` | 18 | Step5 — importSource !== "" && !== "skip" |
| `configuredTeam` | 12 | Step2 — agencyName + city vyplnené |
| `firstAutomationLive` | 17 | Step4 — autoReply === true |
| `firstAiBriefViewed` | 10 | Step4 — vždy pri dokončení |
| `firstMeetingBooked` | 10 | Manuálne (zatiaľ) |
| `pipelineConfigured` | 10 | Step6 — vždy pri dokončení |
| `goalsDefined` | 5 | Step8 — primaryGoal alebo kpiLeads > 0 |

**Email sekvencie (Resend):**
- D+1: Welcome email
- D+3: CRM sync reminder
- D+7: AI activation

**Cron:**
- `/api/cron/onboarding-dispatch` — každý deň 08:00 UTC
- Retry logika: `attempts < 3` pre failed správy

**Admin UI:**
- `/onboarding-monitor` — at-risk klienti, readiness bary, missing steps
- Viditeľné pre `owner_vision` + `owner_protocol` plány

---

## Agency Scraping

**Commit:** `e95164f`
- `PortalNehnutelnostiSource` — scraping portalu s configurable page count
- `AgencyDiscoveryEngine` — orchestrácia scrapingu
- Cron: `/api/cron/agency-scraping` — každý pondelok 02:00 UTC

---

## Infraštruktúra + Vercel Crons

**`vercel.json` crons:**
| Endpoint | Schedule | Účel |
|---|---|---|
| `/api/cron/recompute-bri` | každú hodinu | Prepočet BRI skóre |
| `/api/cron/agency-scraping` | pondelok 02:00 | Scraping agentúr |
| `/api/cron/auto-tune` | každý deň 03:00 | AI auto-tuning |
| `/api/cron/onboarding-dispatch` | každý deň 08:00 | Onboarding emaily |

---

## Marketing Site

**Commit:** `612b66b`  
**Deploy:** `marketing-e2tfnfcpg-onlinovosk-4317s-projects.vercel.app`

- Homepage — hero, features, pricing, CTA
- Demo page — interaktívna ukážka
- **TODO:** Priradiť doménu `revolis.ai` v Vercel → marketing projekt → Domains

---

## Pending / TODO

### Vysoká priorita
- [ ] Vercel ENV vars: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`
- [ ] Priradiť `revolis.ai` doménu na marketing projekt v Vercel

### Stredná priorita
- [ ] `firstMeetingBooked` trigger — keď agent zabookuje prvé stretnutie
- [ ] Dark theme: Performance, Forecast stránky (redirecty — nízka priorita)
- [ ] Onboarding Step 6 — pipeline stages UI (momentálne bez výberu, len "videl som")

### Nízka priorita
- [ ] Retry cron pre failed onboarding messages (momentálne v dispatch logike)
- [ ] Neural Intelligence / Competition Heatmap features (Protocol Authority tier)
