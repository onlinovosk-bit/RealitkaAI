# Demo Ops — Calendly → pre-demo brief → recap draft

Automatizácia pripraví Andyho na demo hovor a po deme pošle **interný** návrh follow-upu na schválenie. Klientovi sa nič neposiela automaticky.

## Tok

1. **Calendly webhook** `POST /api/webhooks/calendly` → `demo_bookings`
2. **Import prospectov** z FinStat pipeline CSV → `demo_prospects`
3. **Cron** `/api/cron/demo-brief` — e-mail 36 h pred demom (Resend → Andy)
4. **Cron** `/api/cron/demo-recap` — po dnešných demách draft recap (Anthropic → Andy)

## Env (Vercel + lokálne)

| Premenná | Účel |
|----------|------|
| `CALENDLY_WEBHOOK_SECRET` | Signing key z Calendly webhooku |
| `CRON_SECRET` | Bearer pre cron routy |
| `RESEND_API_KEY` | Odoslanie mailov |
| `OUTREACH_FROM_EMAIL` | From adresa |
| `DEMO_OPS_ANDY_EMAIL` | Kam chodia briefy a recapy |
| `ANTHROPIC_API_KEY` | Generovanie recap draftu |
| `SUPABASE_SERVICE_ROLE_KEY` | Webhook + crony |

## Calendly setup (manuálne)

1. Calendly → Integrations → Webhooks → Create webhook
2. URL: `https://app.revolis.ai/api/webhooks/calendly`
3. Event: `invitee.created`
4. Signing key → `CALENDLY_WEBHOOK_SECRET`

## Import prospectov

Po `npm run prospect:export` (root) alebo `data/prospects-scored.csv`:

```bash
cd apps/crm
NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  npx tsx scripts/demo-ops/import-prospects.ts ../../data/prospects-scored.csv
```

Match bookingu: doména z `invitee_email` ↔ `demo_prospects.email_domain` (z outreach alebo web).

## Cron registrácia (Andy schváli — NIE v tomto PR)

Do `apps/crm/vercel.json` **navrh** (legal/cron guard):

```json
{ "path": "/api/cron/demo-brief", "schedule": "0 6 * * *" },
{ "path": "/api/cron/demo-recap", "schedule": "30 17 * * *" }
```

Oba vyžadujú hlavičku `Authorization: Bearer $CRON_SECRET`.

## Právne / AKMV

- Outreach kontakty len firemné e-maily (nie gmail/azet osobné).
- Recap je vždy na schválenie — žiadne auto-odoslanie prospectovi.
- Text importu a B2B účel spracovania: pozri `scripts/prospecting/README.md` (review AKMV).

## Testy

```bash
cd apps/crm && npm test -- src/lib/demo-ops src/app/api/webhooks/calendly
```
