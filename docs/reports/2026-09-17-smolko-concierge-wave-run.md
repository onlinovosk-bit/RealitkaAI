# Smolko Concierge — wave run summary (GO-W1 → W2 → W3)

**Dátum:** 2026-09-17  
**Branch:** `exec/smolko-concierge-w1-w3`  
**Stack:** `docs/prompts/smolko-website-concierge/`  
**Ship GOs (chat):** GO-B04-PROD · GO-B05-COPY · GO-B06-ROUTING · GO-W3-SHIP · GO-B07-DB · GO-B08-OAUTH

## W1 (parallel) — executed

| Node | Result | Artifact |
|---|---|---|
| N01 | **DONE** | CRM chatbot removed; `docs/reports/2026-09-17-smolko-crm-chat-cleanup.md` |
| N04 | **HUMAN** (GO granted; SQL paste open) | `docs/reports/2026-09-17-smo-b04-prod-evidence.md` |
| N05 | **DONE** (GO-B05-COPY) | `docs/briefs/smolko-concierge-privacy-faq-DRAFT.md` → APPROVED |
| N06 | **DONE** (GO-B06-ROUTING) | `docs/briefs/smolko-concierge-routing-matrix.md` → APPROVED |

## W2 — re-run under GO-W3-SHIP → **M1**

| Node | Result |
|---|---|
| N07 | **DONE** — API-only Concierge: `GET /api/concierge/properties`, `POST /api/concierge/callback`; PUBLIC_PATHS + unit tests; Voiceflow UI remains external |

**M1:** CODE complete on branch. Live Voiceflow wiring + PROD SQL for B04 still HUMAN.

## W3 — re-run under GO-B07/B08 → **M2 code**

| Node | Result |
|---|---|
| N08 | **HUMAN** — GO-B07-DB recorded; worker does **not** apply migration |
| N09 | **DONE (code)** — `lib/concierge/freebusy.ts` + `GET /api/concierge/freebusy` (503 `oauth_missing` until token) |
| N10 | **DONE (code)** — `lib/concierge/booking.ts` wraps scheduled_events idempotency |

**M2 PROD:** blocked on ops apply of `scheduled_events` + `CONCIERGE_GOOGLE_ACCESS_TOKEN` after OAuth.

## Remaining founder/ops

1. Paste B04 PROD SQL into N04 report  
2. Apply B07 migration in prod (ops)  
3. Complete B08 OAuth → set env tokens  
4. Wire Voiceflow → Concierge endpoints
