# D3 Prod Hardening II — Fallback Matrix

**Dátum:** 15. apríla 2026  
**Scope:** fallback UI pre kritické API chyby + retry stratégie  
**Deliverable:** endpoint -> fallback správanie

---

## 1) Fallback matrix

| Endpoint | Consumer | Retry stratégia | Fallback správanie |
|---|---|---|---|
| `/api/billing/checkout` | `PricingCards` | 2 pokusy, exponential backoff (500ms, 1000ms), transient/network chyby | používateľ zostáva na `/billing`, zobrazí sa inline error banner, CTA môže opakovať |
| `/api/billing/portal` | `ManageSubscriptionButton` | 2 pokusy, exponential backoff (500ms, 1000ms), transient/network chyby | pri `NO_CUSTOMER` fallback na `/billing`, inak inline error bez crashu |
| `/api/legal/dpa-request` | `DpaRequestForm` | 2 pokusy, exponential backoff (500ms, 1000ms), transient/network chyby | zachované hodnoty formulára, inline error, okamžitý re-submit |
| `/api/support/request` | `SupportRequestForm` | 2 pokusy, exponential backoff (500ms, 1000ms), transient/network chyby | zachované hodnoty formulára, error banner, bez straty contextu |
| `/api/healthz`, `/landing`, `/legal` | `ServiceStatusCards` | 2 pokusy, exponential backoff (400ms, 800ms) | karta prejde do degraded stavu + manuálne tlačidlo „Obnoviť status“ |
| `/api/observability/probes` | observability workflow | poll endpoint | `degradedCount > 0` signalizuje incident gate pre on-call |

---

## 2) Exact ENV list (infra)

- `NEXT_PUBLIC_APP_URL`
- `EMAIL_PROVIDER` (`RESEND` | `BREVO` | `SMTP`)
- `RESEND_API_KEY` / `BREVO_API_KEY` / SMTP creds podľa provideru
- `LEGAL_INBOX`, `SUPPORT_INBOX`, `LEGAL_FROM_EMAIL`, `SUPPORT_FROM_EMAIL`
- `LEGAL_WEBHOOK_URL`, `SUPPORT_WEBHOOK_URL`, `OPERATIONS_WEBHOOK_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 3) Test plan (D3)

1. URL smoke:
   - `/status/fallbacks`
   - `/status`
   - `/legal`
2. API smoke:
   - `GET /api/observability/fallback-matrix` -> `200`, obsahuje matrix
   - `GET /api/observability/probes` -> `200`
3. Validation sanity:
   - `POST /api/legal/dpa-request` s `{}` -> `400`
   - `POST /api/support/request` s `{}` -> `400`
4. Manual UI test:
   - billing, support, dpa flows zobrazujú fallback text pri chybe
   - service status obsahuje manuálny refresh

---

## 4) Rollback plan

1. Trigger: regresia v billing/dpa/support/status flow po release.
2. Akcia: redeploy posledného stabilného deploymentu.
3. Verify po rollbacku:
   - `/status/fallbacks`, `/status`, `/legal`
   - `/api/observability/fallback-matrix`, `/api/observability/probes`
4. Komunikácia:
   - P1: prvý update do 60 min,
   - postmortem do 5 pracovných dní.
