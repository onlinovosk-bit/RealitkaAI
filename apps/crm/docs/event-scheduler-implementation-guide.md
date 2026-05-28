# EVENT SCHEDULER — Implementation Guide

**Modul:** M-03 Plánovanie obhliadok (Revolis CRM)  
**Cieľ:** Tenant-scoped plánovanie obhliadok, stretnutí a pripomienok s backend API a neskoršou Google Calendar / UI integráciou.

---

## Phase 1 — Database & Backend (tento PR)

### 1.1 Databáza

Tabuľka `public.scheduled_events`:

| Stĺpec | Typ | Popis |
|--------|-----|--------|
| `id` | uuid PK | |
| `agency_id` | uuid FK → agencies | Tenant |
| `profile_id` | uuid FK → profiles | Autor / vlastník udalosti |
| `lead_id` | text FK → leads | Voliteľné |
| `property_id` | text FK → properties | Voliteľné |
| `event_type` | text | `viewing`, `meeting`, `call`, `reminder`, `other` |
| `status` | text | `scheduled`, `confirmed`, `cancelled`, `completed`, `no_show` |
| `title`, `description`, `location` | text | |
| `starts_at`, `ends_at` | timestamptz | `ends_at > starts_at` |
| `timezone` | text | default `Europe/Bratislava` |
| `google_calendar_event_id` | text | Phase 2 sync |
| `google_calendar_html_link` | text | Phase 2 |
| `reminder_minutes` | int | Voliteľné |
| `meta` | jsonb | Rozšírenia |
| `cancelled_at` | timestamptz | Pri cancel |
| `created_at`, `updated_at` | timestamptz | |

**RLS:** `agency_id IN (SELECT profile_agencies_for_auth())` — rovnaký vzor ako `tasks` / `properties`.

**Indexy:** `agency_id`, `(agency_id, starts_at)`, `lead_id`, `profile_id`, `status`.

### 1.2 Backend API (App Router)

| Metóda | Cesta | Účel |
|--------|-------|------|
| GET | `/api/scheduled-events` | Zoznam (query: `from`, `to`, `leadId`, `status`, `eventType`, `limit`) |
| POST | `/api/scheduled-events` | Vytvorenie |
| GET | `/api/scheduled-events/[id]` | Detail |
| PATCH | `/api/scheduled-events/[id]` | Úprava / zmena statusu |
| DELETE | `/api/scheduled-events/[id]` | Zmazanie (hard delete Phase 1) |

**Auth:** Supabase session (`createClient` + `getUser`).  
**Side-effect:** Pri create/update zapísať aktivitu na lead (`activities` cez `createActivity`), ak je `lead_id`.

**Nemeniť:** existujúce `/api/cron/*` routes.

### 1.3 Knižnica

- `src/lib/scheduled-events/types.ts` — typy a konštanty
- `src/lib/scheduled-events/validation.ts` — validácia vstupov
- `src/lib/scheduled-events/store.ts` — mapovanie DB ↔ domain, CRUD
- `src/lib/scheduled-events/__tests__/validation.test.ts`

### 1.4 Testy / build

```bash
cd apps/crm && npm run test -- src/lib/scheduled-events
cd apps/crm && npm run build
```

---

## Phase 2 — Google Calendar & reminders (budúci PR)

- OAuth push do Google (`profile_google_calendar`, `google-calendar-server.ts`)
- Cron `/api/cron/scheduled-events-reminders` (nový, neprepisovať existujúce crony)
- ICS export hook

## Phase 3 — UI (budúci PR)

- Kalendárny panel v `/leads/[id]` a dashboard „Obhliadky dnes“
- Potvrdenie slotu (SMS/email — existujúci playbook)

---

## Rollback

1. Revert migráciu: `DROP TABLE IF EXISTS public.scheduled_events CASCADE;`
2. Revert PR — odstrániť `/api/scheduled-events` a `lib/scheduled-events`.
