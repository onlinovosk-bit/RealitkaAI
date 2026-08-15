# Webhook smoke — POST /api/acquisition/google/lead-webhook

**Dátum:** 2026-08-15
**Preview:** `chore/stage0-smoke` @ `db6e276bd` Ready
**URL:** https://realitka-ai-git-chore-stage0-smoke-onlinovosk-4317s-projects.vercel.app
**Tenant lookup:** `acquisition_accounts.customer_id=7024414113` → Demo agency `b101361c-e250-4c43-b099-52c4febeb450`

## Verdikt

**PASS (hosted Preview HTTP + SQL).** `is_test=true` → `LOGGED_TEST`, `lead_id=NULL`, `leads` ostali na 480. Zlý kľúč → 401. GET → 405.

## Hosted HTTP (Git Preview, SSO bypass, bez logovania kľúča)

| Volanie | HTTP | Telo (bez secrets) |
|---|---|---|
| GET | **405** | `{ ok:false, error:"Method Not Allowed" }` |
| POST zlý `x-google-key` | **401** | `{ ok:false, error:"Unauthorized" }` |
| POST `is_test=true`, `customer_id=7024414113`, `lead_id=stage0-hosted-1786809368531` | **200** | `logged=true`, `processing_status=LOGGED_TEST`, `lead_created=false`, `lead_id=null` |

Ignored Build Step je vypnutý (`commandForIgnoringBuildStep` prázdny). Preview sa postavil z Git push.

Session gate: na smoke vetve je `/api/acquisition/google/lead-webhook` v `src/proxy.ts` PUBLIC_PATHS a `middleware.ts` BYPASS_PREFIXES (commit `db6e276bd`). Na `main` tento allowlist ešte nie je — Production `app.revolis.ai` by stále 401-oval pred kľúčom. Samostatný PR, nie merge smoke vetvy.

## SQL dôkaz

```text
acquisition_events
  id                   58633820-7e1b-4004-9edc-b713613df440
  agency_id            b101361c-e250-4c43-b099-52c4febeb450   -- Revolis Demo
  lead_id              NULL
  provider             GOOGLE
  event_type           lead.form_submitted
  provider_event_id    stage0-hosted-1786809368531
  processing_status    LOGGED_TEST
  metadata.is_test     true
  metadata.lead_created false

leads.count            480   -- rovnaké pred aj po smoku
```

Žiadny insert do `leads`. `lead_id` ostáva NULL.

## Poznámka k env

`GOOGLE_ADS_WEBHOOK_KEY` na shared Preview+Production je Sensitive (CLI pull vracia prázdny string). Pre tento smoke je vetvový Preview override na `chore/stage0-smoke` (nie Production). Kľúč sa neloguje.