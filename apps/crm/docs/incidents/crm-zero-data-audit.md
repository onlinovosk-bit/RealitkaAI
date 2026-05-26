# Incident: CRM kapitoly zobrazujú 0 (živá Supabase ≠ UI)

**Dátum:** 2026-05-26  
**Tenant:** Reality Smolko / Rastislav Smolko  
**Produkcia:** https://app.revolis.ai

## Symptóm

- Kokpit a väčšina modulov (Nehnuteľnosti, Moji klienti/Leads, Úlohy, Matching, Odporúčania) ukazuje **0** alebo prázdne zoznamy.
- V Supabase sú dáta (napr. ~80–91 `properties` pre agentúru).
- Po redeploy na `main` sa stav nezmenil, ak fix nebol zmergovaný.

## Root cause (overené)

1. **Server RSC bez session cookies**  
   Store vrstvy volali `getSupabaseClient()` z `@/lib/supabase/client`. Na serveri (RSC) tento klient **neviaže request cookies** → Supabase RLS vracia **0 riadkov** pre tenant.

2. **Rozdiel dashboard vs. zoznam**  
   Niektoré widgety načítali dáta v prehliadači (fungovalo), SSR stránky (`/properties`, `/leads`, `/tasks`) nie.

3. **API „fallback“**  
   `/api/properties/inventory` používal rovnaký server `createClient()` bez platnej session → tiež prázdne.

4. **Deploy vetva**  
   Čiastočné opravy boli na `fix/properties-inventory-dashboard-sync` (PR #64), nie na `main`.

## Náprava

### Centrálny pattern

`apps/crm/src/lib/supabase/resolve-client.ts`:

- Browser → `getSupabaseClient()` (cookies)
- RSC / route handler → `createClient()` zo `@/lib/supabase/server`

Všetky tenant read cesty v store sú prepojené na `resolveTenantSupabase()`:

- `properties-store`, `leads-store`, `tasks-store`, `team-store`
- `matching-store`, `activities-store`, `recommendations-store`
- `sales-funnel-store`, `profiles-store`, `ai-scoring-store`

### Diagnostika

`GET /api/crm/tenant-health` — počty pod RLS + `profiles.agency_id` pre prihláseného usera.

### Modulové poznámky

| Kapitola | Cesta | Poznámka |
|----------|-------|----------|
| Kokpit | `/dashboard` | `force-dynamic`; widgety + SSR cez resolve |
| Nehnuteľnosti | `/properties` | inventory loader + browser fallback |
| Moji klienti | `/contacts` → `/leads` | KPI z `listLeads()` |
| Úlohy | `/tasks` | `listTasks` + leads/profiles |
| Matching | `/matching` | `listPersistedMatches` |
| Odporúčania | `/recommendations` | `recommendations-store` |
| Maklér v UI | detail nehnuteľnosti | `broker_*` stĺpce z Realvia, nie `owner_name` |

## Overenie po deploy

1. Prihlásenie ako tenant Smolko.
2. `GET /api/crm/tenant-health` → `counts.properties` > 0 ak DB má dáta.
3. `/dashboard`, `/properties`, `/leads` — zhodné počty.
4. `npm run test` + `npm run build` v `apps/crm`.
5. Playwright `tests/smoke.spec.ts` na preview.

## Otvorené (mimo session RLS)

- Ceny `0`, lokalita `-` — mapovanie Realvia payload.
- Typ „Byt“ pre pozemok — `mapCategory`.
- `owner_name` vs `broker_*` pri importe — produktové rozhodnutie.

## PR

- https://github.com/onlinovosk-bit/RealitkaAI/pull/64 — merge do `main` pred produkčným očakávaním fixu.
