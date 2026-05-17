# REALVIA → REVOLIS
## Production Integration Specification (L99)

# GOAL

Implement a production-grade Realvia export ingestion pipeline for Revolis AI.

This is NOT a simple webhook.

Requirements:
- idempotent
- replayable
- observable
- secure
- async
- production safe

Stack:
- Next.js API routes
- PostgreSQL
- Supabase
- TypeScript

---

# ARCHITECTURE

Realvia pushes advert updates to Revolis endpoint.

Flow:

```
Realvia
→ webhook endpoint
→ validation
→ raw payload log
→ enqueue processing job
→ immediate 200 response
→ async processing worker
→ DB upsert
→ media sync
→ AI processing
```

Webhook endpoint MUST stay under 300ms.

NO AI inside request lifecycle.

---

# SECURITY REQUIREMENTS

## MUST IMPLEMENT

### 1. IP validation

Allow ONLY:
`185.59.208.101`

Use:
- `x-forwarded-for`
- fallback `req.ip`

Reject all others with 403.

---

### 2. Shared secret validation

Implement header:
`X-Revolis-Secret`

Compare against:
`process.env.REALVIA_SHARED_SECRET`

Reject invalid requests.

---

### 3. Payload size limit

Max: 5MB

Reject larger payloads.

---

### 4. HTTPS only

Reject insecure requests in production.

---

# DATABASE TABLES

## TABLE: realvia_webhook_logs

Store EVERY incoming request.

Fields:
- `id` — uuid, PK
- `received_at` — timestamptz, default now()
- `source_ip` — text
- `headers_json` — jsonb
- `payload_json` — jsonb
- `processed` — boolean, default false
- `processing_error` — text
- `request_id` — uuid, unique

---

## TABLE: realvia_processing_queue

Fields:
- `id` — uuid, PK
- `webhook_log_id` — uuid, FK → realvia_webhook_logs
- `status` — text, default 'pending'
- `retry_count` — int, default 0
- `next_retry_at` — timestamptz
- `created_at` — timestamptz, default now()
- `processed_at` — timestamptz

Statuses:
- `pending`
- `processing`
- `completed`
- `failed`

---

## TABLE: properties

Fields:
- `id` — uuid, PK
- `source_id` — text, UNIQUE
- `title` — text
- `description` — text
- `price` — numeric
- `currency` — text
- `status` — text (ACTIVE / SOLD / REMOVED)
- `broker_source_id` — text
- `payload_raw` — jsonb
- `created_at` — timestamptz
- `updated_at` — timestamptz

Statuses:
- `ACTIVE`
- `SOLD`
- `REMOVED`

---

## TABLE: property_price_history

Fields:
- `id` — uuid, PK
- `property_id` — uuid, FK → properties
- `old_price` — numeric
- `new_price` — numeric
- `changed_at` — timestamptz, default now()

Insert ONLY if price changes.

---

# WEBHOOK ENDPOINT

Create:
`api/webhooks/realvia/route.ts`

Responsibilities ONLY:
1. validate request
2. validate IP
3. validate secret
4. store raw payload
5. enqueue job
6. return success

NO:
- AI
- image downloads
- parsing complexity
- embeddings

Response: 200 OK within 300ms.

---

# ASYNC PROCESSING

Implement worker:
`lib/realvia/processQueue.ts`

Worker responsibilities:
- dequeue pending jobs
- parse payload
- upsert property
- detect price changes
- update status
- trigger media sync
- mark completed

---

# IDEMPOTENCY

MUST prevent duplicates.

Rules:

If `source_id` exists:
→ UPDATE existing property

Else:
→ CREATE

Never duplicate properties.

---

# REMOVAL HANDLING

Never hard delete.

Map exports to:
- `ACTIVE`
- `SOLD`
- `REMOVED`

Keep historical data.

---

# MEDIA STRATEGY

Realvia sends URLs.

DO NOT hotlink permanently.

Implement:
1. download media
2. optimize
3. upload to Supabase Storage
4. save local CDN URLs

Run asynchronously.

---

# OBSERVABILITY

Implement logging:
- webhook failures
- duplicate detection
- processing duration
- retry count
- media failures

Use: console + structured logs

---

# RETRY SYSTEM

Failed jobs:
- retry 3x
- exponential backoff

After final failure:
→ move to failed state

Never lose payloads.

---

# ADMIN DEBUG PAGE

Create:
`app/admin/integrations/realvia/page.tsx`

Show:
- latest webhook requests
- processing status
- failed jobs
- retry count
- processing errors

Simple UI only.

---

# ENV VARIABLES

Add:

```
REALVIA_SHARED_SECRET=
REALVIA_ALLOWED_IP=185.59.208.101
```

### Production (.env.production)
```
REALVIA_SHARED_SECRET=super-long-random-secret
REALVIA_ALLOWED_IP=185.59.208.101
```

### Cloudflare Rate Limiting

Endpoint `/api/webhooks/realvia` MUST be protected via Cloudflare Rate Limiting rule:
- Max 60 requests/minute from single IP
- Block with 429 response
- Configure in Cloudflare Dashboard → Security → WAF → Rate Limiting Rules

---

# CODING RULES

- TypeScript strict
- production-safe
- no `any`
- defensive parsing
- graceful failures
- never crash webhook endpoint

---

# IMPLEMENTATION ORDER

## PHASE 1
- DB schema
- env setup

## PHASE 2
- webhook endpoint
- security validation

## PHASE 3
- queue system
- async worker

## PHASE 4
- property upsert
- idempotency

## PHASE 5
- price history
- status handling

## PHASE 6
- media sync

## PHASE 7
- admin debug page

## PHASE 8
- logging
- retry system
- final hardening

After EACH phase:
- explain architecture
- show modified files
- wait for approval

Never skip phases.

---

# CONTROLLED GO-LIVE SEQUENCE

## ⚠️ NEVER send production endpoint to Realvia without testing first.

### Step 1: Local Testing
```bash
# 1. Add to .env.local:
REALVIA_IDENTIFIER=revolis-live-webhook
REALVIA_IDENTIFIER_2=rv_7F29xA91mK44pQ
REALVIA_SHARED_SECRET=dev-test-secret
REALVIA_ALLOWED_IP=127.0.0.1,::1

# 2. Run DB migration in Supabase SQL Editor:
# supabase/22_realvia_webhook_infrastructure.sql

# 3. Start dev server:
npm run dev

# 4. Run test suite:
npx ts-node scripts/test-realvia-webhook.ts
```

### Step 2: Staging Deploy
- Deploy to staging environment
- Verify admin page: `/admin/integrations/realvia`
- Verify health: `GET /api/webhooks/realvia`
- Run test script against staging URL

### Step 3: Email to Realvia (STAGING ONLY)
```
Dobrý deň,

posielame staging endpoint pre nastavenie exportu:

https://staging.revolis.ai/api/webhooks/realvia

Hlavičky:
identifikator: revolis-live-webhook
identifikator2: rv_7F29xA91mK44pQ

Prosíme o potvrdenie po nastavení exportu.
Ďakujeme.
```

### Step 4: Staging Validation
Wait for real Realvia payloads on staging. Verify:
- [ ] Payloads arrive and are logged
- [ ] Queue processes correctly
- [ ] Properties created/updated in DB
- [ ] Price history recorded
- [ ] No duplicates
- [ ] Media URLs stored
- [ ] Admin page shows correct data

### Step 5: Production Switch
Only after staging is validated:
- Email Realvia: change endpoint to production URL
- Monitor first 24h closely
- Check admin page for errors

## ENV VARIABLES — Complete List

```env
# Realvia webhook authentication (Realvia sends these headers)
REALVIA_IDENTIFIER=revolis-live-webhook
REALVIA_IDENTIFIER_2=rv_7F29xA91mK44pQ

# Additional secret (our own validation layer)
REALVIA_SHARED_SECRET=<generate-64-char-random>

# IP whitelist (Realvia server)
REALVIA_ALLOWED_IP=185.59.208.101
```

⚠️ NEVER commit these values to git.
⚠️ NEVER expose in frontend code.
⚠️ Store in Vercel Environment Variables only.
