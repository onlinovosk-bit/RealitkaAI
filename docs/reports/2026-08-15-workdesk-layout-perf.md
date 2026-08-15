# Workdesk layout perf — customer-facing performance bug

**Datum:** 2026-08-15
**GO:** founder. #416 merged. Production T1/T2 15.8. vecer. **Perfgate PASS.**
**Klasifikacia:** customer-facing performance bug (cele CRM workdesk, nie len `/acquisition`).

## 1. Baseline T2 pred fixom

Zakladatel nemohol byt v tomto behu prihlaseny z agent browsera (`/login`). Cisla su founder wall-clock + Vercel production logy + Supabase edge logy CRM `ypgajkhqtbriqqmyawyv`, Demo tenant.

| Stranka | T1 | T2 | Zdroj |
|---|---|---|---|
| `/acquisition` | ~2 min (founder, po deployi #414) | ~2 min (founder, 15.8. ~21:08 CEST) | wall-clock |
| Workdesk home `/dashboard` | rovnake telo layoutu | Vercel `GET /dashboard` 200 v T2 okne; properties `limit=500` ide aj pocas `/acquisition` | proxy, nie samostatny founder stopwatch |
| `/leads` | rovnake telo layoutu | Vercel `GET /leads` 200 o **19:07:41Z** (este pocas cakania na `/acquisition`) a znova 19:08:21Z | proxy; dokazuje prefetch |

### T2 `/acquisition` (15.8. 19:06-19:08 UTC)

| Cas UTC | Co |
|---|---|
| 19:06:07 | `auth/v1/user` (N-krat) |
| 19:06:10 | `properties?...&limit=500` |
| 19:06:12 | `leads?select=*&limit=500` |
| 19:07:41 | Vercel `GET /leads` 200 + dalsi `getUser` burst |
| 19:08:14 | Vercel `GET /acquisition` 200 (dokoncenie) |
| 19:08:15-17 | `acquisition_*` SELECT-y, HTTP 200, <2 s |
| 19:08:20-21 | Vercel `GET /dashboard` + `GET /leads` (prefetch po HTML) |

Dalsi CRM session **18:06-18:08 UTC** (pred `/acquisition` T1): ~68 s opakoveho `getUser`, **ziadne** properties/leads/acquisition query. Pomalost teda nie je unikát Google Ads stranky.

**Zaver pred fixom:** pomale je **cele CRM workdesk**. `/acquisition` to len odhalilo, lebo page-specific query pride az po ~2 min. `properties`/`leads` 500-row nie su v `layout.tsx` — spusta ich **Next.js prefetch** sidebar linkov na `/dashboard` a `/leads`.

## 2. Fix (ziadna zmena zobrazovanych dat, RLS, auth logiky)

1. Request-scoped memo na `findProfileForAuthUser` + `linkProfileToAuthUser` (jeden find na request, canonical select).
2. `prefetch={false}` na workdesk nav Linkoch, aby `/acquisition` (a kazda ina stranka) nespustala SSR `/dashboard` + `/leads` s `limit=500`.
3. `listProperties` / `listLeads` ostavaju na strankach, ktore ich potrebuju (`/dashboard`, `/leads`, `/properties`).

## 3. Overenie pred merge

- Vitest: profile memo + existujuce resolve/link testy + `workdesk-layout-perf.verification.test.ts`
- `npm run build` v `apps/crm`

## 4. T1/T2 po #416 (production, founder wall-clock, 15.8.2026)

Baseline pred fixom: `/acquisition` T1 aj T2 ~2 min (nie cold start).

| Stranka | T1 | T2 | Poznamka |
|---|---|---|---|
| `/acquisition` | **4 s** | **4 s** | skoršie T1 ~3 min bolo merané **počas deploy okna** — artefakt merania, nie regresia |
| `/dashboard` | **6 s** | **6 s** | vlastný inventory ostáva na stránke |
| `/leads` | **4 s** | **5 s** | vlastný 500-row load ostáva na stránke |

**Perfgate = splnená.** T2 je v sekundách, nie minútach. `/acquisition` a workdesk shell sú rýchle. Ďalšia paginácia `/dashboard` / `/leads` = samostatný PR, nie Stage 0.

## 5. Stage 0

Perfgate PASS po #416. Stage 0 PASS sa vyhlasuje docs addendum PR (screenshoty + tieto čísla). Stage 1 sa nespúšťa.

## 6. #400 chore/stage0-smoke

Zatvorene bez merge, vetva zmazana. Supabase development branches: ziadne. Vercel Preview gitBranch chore/stage0-smoke mal NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY + GOOGLE_ADS_WEBHOOK_KEY. **Neprescopovane** na vsetky Preview — unscoped Preview uz ma SUPABASE_URL + anon/publishable; service role na vsetky Preview by rozsirilo secret. Orphan env na zmazanej vetve je neaktivny.
