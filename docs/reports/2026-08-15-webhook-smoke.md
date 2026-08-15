# Webhook smoke — POST /api/acquisition/google/lead-webhook

**Dátum:** 2026-08-15
**Handler commit na main:** `b6cb304d6` (#409)
**Tenant lookup:** `acquisition_accounts.customer_id=7024414113` → Demo agency `b101361c-e250-4c43-b099-52c4febeb450`

## Verdikt

**PASS (handler + SQL).** `is_test=true` zapísal `acquisition_events.processing_status=LOGGED_TEST`, `lead_id=NULL`, `leads` ostali na 480. Zlý kľúč → 401. Hosted Preview HTTP nie je zelený — dôvody nižšie; L19 / Production env rm neodpálene.

## 1. Handler dôkaz (priamy POST + produkčné Supabase)

Env: lokálne `apps/crm/.env.local` (Supabase) + dočasný process-only `GOOGLE_ADS_WEBHOOK_KEY` (Vercel Sensitive pull vracia prázdny string). Kľúč sa neloguje.

| Volanie | HTTP | Telo (bez secrets) |
|---|---|---|
| zlý `x-google-key` | **401** | `{ ok:false, error:"Unauthorized" }` |
| `is_test=true`, `customer_id=7024414113`, `lead_id=stage0-handler-1786807720186` | **200** | `logged=true`, `processing_status=LOGGED_TEST`, `lead_created=false`, `lead_id=null` |

Log: `status=LOGGED_TEST provider=GOOGLE agency_id=b101361c-e250-4c43-b099-52c4febeb450 lead_created=false`

## 2. SQL dôkaz

```text
acquisition_events
  id                   8c8a80a5-b67a-45ee-82bc-f42165872447
  agency_id            b101361c-e250-4c43-b099-52c4febeb450   -- Revolis Demo
  lead_id              NULL
  provider             GOOGLE
  event_type           lead.form_submitted
  provider_event_id    stage0-handler-1786807720186
  processing_status    LOGGED_TEST
  metadata.is_test     true
  metadata.lead_created false

leads.count            480   -- rovnaké pred aj po smoku
```

Žiadny insert do `leads`. `lead_id` ostáva NULL.

## 3. Hosted HTTP — čo blokuje Preview

### Ignored Build Step (Git preview)

Git Preview na `chore/stage0-smoke` ostáva Canceled. Marker `apps/crm/STAGE0_SMOKE.md` nestačí. Vercel project API `commandForIgnoringBuildStep`:

```
if [ "$VERCEL_ENV" == "production" ]; then exit 1; else exit 0; fi
```

To vždy skipne Preview a pustí len Production. Nie je to monorepo diff na `apps/crm`. Dashboard som nemenil. Screenshot Settings → Git z Cursora: login wall na vercel.com/login.

Obchádzka bez zmeny nastavení: `npx vercel deploy --target preview` z koreňa monorepa.

### CLI Preview Ready, ale nie je verejné API

- URL: https://realitka-aobjyjfun-onlinovosk-4317s-projects.vercel.app
- readyState=READY, inspector dpl_gxB5iDyqpLLx6AdNWpe7L7J4PLSQ
- SSO Protection `all_except_custom_domains` → bez bypass 401 Protected deployment
- s automation-bypass + zlý kľúč: 500 Internal Server Error (generic Preview env nemá SUPABASE_SERVICE_ROLE_KEY; ten je len Preview (chore/stage0-smoke))
- GOOGLE_ADS_WEBHOOK_KEY je Sensitive: vercel env pull / env run vracajú prázdny string

### Production app.revolis.ai

GET aj POST bez session vracajú `{ ok:false, error:"Unauthorized" }` skôr, než kľúč. `src/proxy.ts` PUBLIC_PATHS obsahuje `/api/acquire/email`, nie `/api/acquisition/google/lead-webhook`. Google lead form teda na produkcii dnes neskončí v handleri. Oprava = allowlist v proxy.ts + middleware.ts (samostatný PR, nie tento).

## Čo ostáva pred vercel env rm production

1. Hosted Preview s vetvovým Supabase alebo Production allowlist + jeden HTTP 200 s reálnym Preview kľúčom.
2. Až potom stiahnuť Production scope. `vercel env ls` dnes: z piatich GOOGLE_ADS_* je na Production len GOOGLE_ADS_WEBHOOK_KEY; ostatné štyri už sú Preview-only.