# Environment variables — cieľový stav (Roundtable / rollout)

Tento zoznam zodpovedá internému dokumentu o moduloch M-01–M-10. **V aktuálnom CRM nemusia byť všetky premenné nastavené** — závisí od zapnutých integrácií.

## Povinné pre bežný beh aplikácie (typicky)

| Premenná | Popis | Scope |
|----------|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL projektu Supabase | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon kľúč | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role (iba server) | Server |
| `OPENAI_API_KEY` | LLM + embeddings (ak sa používajú) | Server |
| `NEXT_PUBLIC_APP_URL` | Verejná URL nasadenia | Public |
| `SENTRY_DSN` | Sledovanie chýb (ak je zapnuté) | Server |

## Podľa modulu / integrácie

| Premenná | Moduly | Poznámka |
|----------|--------|----------|
| `TWILIO_ACCOUNT_SID` | M-01, M-03, M-05 | SMS / WA |
| `TWILIO_AUTH_TOKEN` | M-01, M-03, M-05 | |
| `TWILIO_WHATSAPP_FROM` | M-01, M-05 | WA Business |
| `RESEND_API_KEY` | M-05, M-08 | E-mail |
| `GOOGLE_CALENDAR_CLIENT_ID` | M-03 | OAuth |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | M-03 | OAuth |
| `CRON_SECRET` | Cron / scheduled routes | Ochrana endpointov |

## Feature flags (z dokumentu — cieľový stav)

Ak sa v budúcnosti zavedú: `FEATURE_FLAG_SOFIA`, `FEATURE_FLAG_SCORING`, `FEATURE_FLAG_MATCHING`, `FEATURE_FLAG_FOLLOWUP`, `FEATURE_FLAG_COMPLIANCE` atď. V repozitári ich treba hľadať v kóde — nie sú súčasťou tohto onboarding UI rolloutu.

## Test plán (po nastavení integrácií)

1. Health / smoke: `GET` verejná stránka, login, jeden lead flow.
2. API: smoke na relevantné route s testovacím účtom.
3. E-mail / Twilio: odoslanie na testovací kontakt v sandboxe.
4. Regresia: `npm run test` / Playwright podľa CI.

## Rollback

1. Vercel: redeploy predchádzajúceho buildu.
2. Premenné: vrátiť predchádzajúcu hodnotu alebo vypnúť feature flag.
3. Git: `git revert` príslušného commitu ak je potrebná kódna náprava.
