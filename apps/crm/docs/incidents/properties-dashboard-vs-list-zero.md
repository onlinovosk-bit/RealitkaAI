# Incident: Kokpit 91 nehnuteľností, `/properties` 0

## Symptóm
- `/dashboard` (Peniaze) → widget Nehnuteľnosti ukazuje správny počet (napr. 91).
- Klik „Pozri všetky“ → `/properties` → KPI a/alebo tabuľka **0**.

## Root cause (kód)
1. **Rozdiel SSR vs. browser Supabase** — widget mohol načítať dáta cez `getSupabaseClient()` (session v cookies prehliadača), zatiaľ čo RSC na `/properties` používal `createClient()` zo servera; pri neobnovenej session RLS vráti `[]`.
2. **`select *` + chýbajúce stĺpce** — fallback v `listProperties` sa spúšťal len pri chybe **a** aktívnom `q` filtri; pri chybe schémy bez `q` sa vracali demo dáta alebo prázdny výsledok podľa prostredia.
3. **Čiastočný fix filtrov** — KPI z filtrovaného zoznamu namiesto celého inventára (opravené v `loadPropertiesInventory`).

## Fix (2026-05-26)
- `loadPropertiesInventory(supabase)` — jeden zdroj pre dashboard aj `/properties`.
- Explicitný `PROPERTIES_SELECT` + retry na core stĺpce pri DDL chybe.
- `GET /api/properties/inventory` + `PropertiesPageClient` client refetch ak SSR vráti 0.
- `proxy.ts` — ochrana `/properties` rovnako ako `/dashboard`.

## Overenie
1. Prihlásený účet s `profiles.agency_id`.
2. `/dashboard` Celkovo = N.
3. `/properties` Celkom (kancelária) = N, tabuľka zobrazí záznamy.
4. `npm run build` v `apps/crm`.

## Role (L99)
Chief Orchestrator, Ruflo, Principal Full-Stack, Principal Data Model, Principal UI/UX.
