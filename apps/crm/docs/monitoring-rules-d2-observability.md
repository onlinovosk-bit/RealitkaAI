# D2 Observability Baseline — Monitoring pravidlá + Incident Severity Map

**Dátum:** 15. apríla 2026  
**Scope:** auth, billing checkout/portal, API 5xx, dashboard load  
**Fáza:** D2 / Prod Hardening I (Observability)

---

## 1) Monitoring pravidlá

| ID | Oblasť | Metrika | Okno | Threshold | Severity | Akcia |
|---|---|---|---|---|---|---|
| auth-error-rate | auth | 5xx rate na `/api/auth/login` | 5m | >2% | P1 | page on-call + status update do 60 min |
| billing-checkout-failure | billing | 4xx+5xx na `/api/billing/checkout` | 10m | >8% | P1 | stop promo sends + over Stripe config |
| billing-portal-failure | billing | 4xx+5xx na `/api/billing/portal` | 10m | >5% | P2 | over customer state + app URL config |
| api-5xx-global | api | 5xx na `/api/*` | 5m | >1.5% | P1 | incident commander + rollback gate |
| dashboard-load-regression | dashboard | p95 load `/dashboard` | 15m | >4.0s | P2 | degrade mode widgets + query inspection |

Machine-readable endpoint:
- `/api/observability/rules`

Synthetic probe endpoint:
- `/api/observability/probes`

---

## 2) Incident severity map (P1-P4)

| Severity | Definícia | First response SLA | Komunikačná kadencia | Owner |
|---|---|---|---|---|
| P1 | kritický výpadok alebo revenue impact | 60 min | každé 4h | CTO / on-call |
| P2 | výrazná degradácia s workaroundom | 4h | 2x denne | Tech lead + Support lead |
| P3 | funkčná chyba s nízkym dopadom | 1 pracovný deň | denný súhrn | Product owner |
| P4 | minor issue / info request | 1 pracovný deň | podľa potreby | Support owner |

---

## 3) Exact ENV list (infra)

- `NEXT_PUBLIC_APP_URL`
- `EMAIL_PROVIDER` (`RESEND` | `BREVO` | `SMTP`)
- `RESEND_API_KEY` / `BREVO_API_KEY` / SMTP creds podľa provideru
- `LEGAL_INBOX`, `SUPPORT_INBOX`, `LEGAL_FROM_EMAIL`, `SUPPORT_FROM_EMAIL`
- `LEGAL_WEBHOOK_URL`, `SUPPORT_WEBHOOK_URL`, `OPERATIONS_WEBHOOK_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## 4) Test plan (D2)

1. `GET /api/observability/rules`
   - očakávanie: `200`, obsahuje rules + severity map.
2. `GET /api/observability/probes`
   - očakávanie: `200`, obsahuje probe výsledky pre auth/billing/dashboard/healthz.
3. URL smoke:
   - `/status`
   - `/status/observability`
   - `/legal`
4. API validation sanity:
   - `POST /api/legal/dpa-request` s `{}` -> `400`
   - `POST /api/support/request` s `{}` -> `400`

---

## 5) Rollback plan

1. Trigger: regresia na public status/legal routes alebo API probes po release.
2. Akcia: redeploy posledný stabilný deployment.
3. Verifikácia po rollbacku:
   - `/status`, `/status/observability`, `/legal`
   - `/api/observability/rules`, `/api/observability/probes`
4. Komunikácia:
   - P1: prvý update do 60 min,
   - postmortem do 5 pracovných dní.
