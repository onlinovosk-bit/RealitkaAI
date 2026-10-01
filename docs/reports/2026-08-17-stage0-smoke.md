# Stage 0 smoke — chore/stage0-smoke

**Dátum merania:** 2026-08-15 (súbor podľa zadania 2026-08-17)
**Vetva / Preview:** `chore/stage0-smoke` @ `513ec4127`
**URL:** https://realitka-ai-git-chore-stage0-smoke-onlinovosk-4317s-projects.vercel.app
**Auth:** `owner@revolis.ai` / Revolis Demo `b101361c-e250-4c43-b099-52c4febeb450` (nie Smolko)
**Payload zámerne zlý:** `agency_id=11111111-…-111111111111` (Smolko) + `customer_id=9998887777`

## Verdikt

**PASS.** Connect vytvoril `PENDING` riadok pre Demo. Client `agency_id` aj `customer_id` ignorované. Credentials v response nie sú.

## HTTP

| Volanie | HTTP | Telo (bez secrets) |
|---|---|---|
| `GET /api/acquisition/google/accounts` bez auth | 401 | `{ ok:false, error:"Unauthorized" }` |
| `POST /api/acquisition/google/connect` | **200** | `status=PENDING`, `agency_id=Demo`, `customer_id=7024414113` (Test MCC z env) |
| `GET /api/acquisition/google/accounts` | **200** | 1 účet, len Demo; Smolko nie je v zozname |
| druhý `POST /connect` (alias) | 409 | unique na `customer_id` — očakávané |

Leaks scan: žiadny `credential_ref`, `BEGIN PRIVATE KEY`, SA email, developer token.

## SQL riadok PENDING

```text
id                   40a02a8e-7e31-439e-aecd-11aec040b2a2
agency_id            b101361c-e250-4c43-b099-52c4febeb450   -- Revolis Demo
provider             GOOGLE
customer_id          7024414113
manager_customer_id  7024414113
status               PENDING
credential_type      SERVICE_ACCOUNT
billing_owner        CLIENT
created_at           2026-08-15 07:58:50+00
connected_at         null
last_sync_at         null
```

Tabuľka `public.acquisition_accounts` existuje. Migrácia `20260811220000_acquisition_core` je v `schema_migrations`.

## Env poznámka

`GOOGLE_ADS_*` sú na Verceli **Preview-only** (Production scope stiahnutý po PASS). `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` Preview scoped na `chore/stage0-smoke`, nie plošne.

## Checklist bod

`customer_id` / `agency_id` z payloadu sa neberú — dôkaz: Smolko UUID + `9998887777` v POST, v DB/response je Demo + `7024414113`.
