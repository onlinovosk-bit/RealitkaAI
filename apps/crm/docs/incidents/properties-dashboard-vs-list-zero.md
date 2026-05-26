# Incident: Kokpit 91 nehnuteľností, `/properties` 0

## Symptóm
- `/dashboard` (Peniaze) → widget Nehnuteľnosti ukazuje správny počet (napr. 91).
- Klik „Pozri všetky“ → `/properties` → KPI a/alebo tabuľka **0**.

## Root cause (kód)
1. **Rozdiel SSR vs. browser Supabase** — widget mohol načítať dáta cez `getSupabaseClient()` (session v cookies prehliadača), zatiaľ čo RSC na `/properties` používal `createClient()` zo servera; pri neobnovenej session RLS vráti `[]`.
2. **`select *` + chýbajúce stĺpce** — fallback v `listProperties` sa spúšťal len pri chybe **a** aktívnom `q` filtri; pri chybe schémy bez `q` sa vracali demo dáta alebo prázdny výsledok podľa prostredia.
3. **Čiastočný fix filtrov** — KPI z filtrovaného zoznamu namiesto celého inventára (opravené v `loadPropertiesInventory`).

## Fix (2026-05-26, v2)
- **Root cause:** serverové RSC na Vercel často nevidí JWT rovnako ako prehliadač → SSR/API vráti `[]`, zatiaľ čo **browser Supabase** vráti 91.
- Dashboard posielal len **súhrn** (4 čísla) cez SSR; `/properties` posielalo celé pole → prázdne KPI.
- **Riešenie:** `/properties` načíta inventár **vždy v prehliadači** cez `getSupabaseClient()` + `loadPropertiesInventory()`.
- Widget: najprv browser, potom API fallback.
- `loadPropertiesInventory` + explicitný SELECT stĺpcov; PR #64 musí byť **merged do main** pred prod deployom.

## Súvisiace symptómy (2026-05-26)

### Maklér len v popise, prázdne „Meno vlastníka“
- **Príčina:** `processQueue.ts` mapuje `broker` → `broker_name` / `broker_phone` / `broker_email`. Stĺpec `owner_name` Realvia neplní. Popis je `advert.description` (HTML podpis makléra).
- **Fix:** SELECT + UI zobrazí `broker_*`; tabuľka „Vlastník / maklér“; v detaile blok „Maklér (Realvia)“.

### „Moji klienti“ — 4 nuly (Príležitosti / Horúce / Obhliadky / Avg BRI)
- **Príčina:** menu `/contacts` → redirect na `/leads`. `listLeads()` na SSR bez browser session → `[]` → všetky KPI = 0.
- **Fix:** `LeadsModule` doplní leady cez `listLeads(undefined, getSupabaseClient())` v prehliadači.

## Overenie
1. Prihlásený účet s `profiles.agency_id`.
2. `/dashboard` Celkovo = N.
3. `/properties` Celkom (kancelária) = N, tabuľka zobrazí záznamy.
4. `npm run build` v `apps/crm`.

## Role (L99)
Chief Orchestrator, Ruflo, Principal Full-Stack, Principal Data Model, Principal UI/UX.
