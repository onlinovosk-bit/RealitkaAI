# D4 Incident Cleanup Sprint — RCA Log

**Dátum:** 15. apríla 2026  
**Scope:** otvorené P1/P2 bugy v retry/fallback kritických flowoch  
**Fáza:** D4 / Incident Cleanup Sprint

---

## Incident #1 (P2) — Neželané retry pri 4xx chybách

### Príčina
V `fetchJsonWithRetry` sa pri niektorých non-retryable chybách (napr. 400) request opakoval, lebo `throw` padol do catch vetvy, ktorá mohla pokračovať ďalším pokusom.

### Dopad
- duplikované requesty,
- potenciálne zvýšené rate-limit riziko,
- nepresné incident metriky.

### Fix
- prepracovaná retry slučka:
  - retry len pri explicitne retryable statusoch,
  - okamžitý fail pri non-retryable 4xx,
  - kontrolované retry pri network chybách.

### Prevencia (guard tests)
- `request-helpers.retry.test.ts`:
  - non-retryable 400 sa nerequestuje opakovane,
  - 503 sa retryne a môže recovernúť,
  - network error sa retryne.

---

## Incident #2 (P1) — Hard fail support/legal ticketu pri email provider výpadku

### Príčina
`/api/legal/dpa-request` a `/api/support/request` pôvodne failovali request, ak sa nepodarilo odoslať email, aj keď webhook fallback mohol byť dostupný.

### Dopad
- strata inbound lead/support požiadaviek pri email provider incidente,
- riziko straty zákazníckeho trustu.

### Fix
- routes teraz pracujú v degrade režime:
  - pokus o email,
  - pokus o webhook,
  - ak aspoň jeden channel prejde -> request je accepted,
  - hard fail len keď zlyhajú oba kanály.

### Prevencia
- degrade response payload (`degradedDelivery`) pre monitorovanie kvality doručenia,
- fallback matrix dokumentovaný + publikovaný.

---

## Guard tests a verifikácia

- Unit guard tests:
  - `src/lib/__tests__/request-helpers.retry.test.ts`
- Produkčné smoke overenie:
  - `/status/fallbacks`
  - `/api/observability/fallback-matrix`
  - validation checks pre legal/support endpointy

---

## Exact ENV list (infra)

- `EMAIL_PROVIDER` (`RESEND` | `BREVO` | `SMTP`)
- `RESEND_API_KEY` / `BREVO_API_KEY` / SMTP creds
- `LEGAL_INBOX`, `SUPPORT_INBOX`, `LEGAL_FROM_EMAIL`, `SUPPORT_FROM_EMAIL`
- `LEGAL_WEBHOOK_URL`, `SUPPORT_WEBHOOK_URL`, `OPERATIONS_WEBHOOK_URL`
- `NEXT_PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PRO`, `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

---

## Test plan (D4)

1. Unit tests:
   - spustiť `request-helpers.retry.test.ts`.
2. API validation:
   - `POST /api/legal/dpa-request` s `{}` -> `400`
   - `POST /api/support/request` s `{}` -> `400`
3. Fallback docs/URL:
   - `/status/fallbacks`
   - `/api/observability/fallback-matrix`
4. Build+deploy:
   - production deploy green
   - post-deploy URL verifikácia.

---

## Rollback plan

1. Trigger: regresia po D4 release (billing/support/legal/status flow).
2. Immediate action: redeploy posledný stabilný deployment.
3. Verify po rollbacku:
   - `/status`, `/status/fallbacks`, `/legal`
   - `/api/observability/fallback-matrix`
4. Komunikácia:
   - P1: do 60 min prvý update,
   - postmortem do 5 pracovných dní.
