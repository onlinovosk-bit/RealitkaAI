# Release Quality Gate — D1 Baseline (Revolis.AI)

**Dátum:** 15. apríla 2026  
**Fáza:** D1 / Quality Baseline  
**Scope:** marketing web, auth, dashboard, billing, legal/trust-center flow, support flow

---

## 1) Quality Gate Checklist (Go/No-Go)

### A. Test Gate

- [ ] Lint bez kritických chýb na dotknutých súboroch.
- [ ] API validačné testy pre:
  - `POST /api/legal/dpa-request`
  - `POST /api/support/request`
- [ ] Smoke test flow:
  - landing -> legal pages -> trust center
  - login/register stránky sa načítajú bez runtime erroru
  - support a dpa formulár renderujú správne polia
- [ ] Build gate:
  - `next build` úspešný
  - deploy úspešný

### B. Monitoring Gate

- [ ] Alerty na kritické API chyby:
  - `/api/billing/checkout`
  - `/api/billing/portal`
  - `/api/legal/dpa-request`
  - `/api/support/request`
- [ ] Alert na zvýšený podiel 5xx pre app API.
- [ ] Uptime check na verejné vstupné URL:
  - `/landing`
  - `/legal`
  - `/status`
  - `/trust-center`
- [ ] Incident severity map (P1-P4) je definovaná a publikovaná v support/status sekcii.

### C. Rollback Gate

- [ ] Rollback postup je pripravený:
  1. identifikovať posledný stabilný deployment,
  2. redeploy posledného stabilného buildu,
  3. verifikovať kritické URL + API health.
- [ ] Rollback owner je určený (CTO / on-call engineer).
- [ ] Incident comms template je pripravený (status + support update).

### D. Ownership Gate

- [ ] Product Owner: schvaľuje scope a acceptance.
- [ ] CTO: schvaľuje tech readiness, fallbacky, rollback.
- [ ] Legal Owner: schvaľuje legal/trust-center konzistenciu.
- [ ] Support Owner: schvaľuje support SLA a ticket routing.
- [ ] CEO/Founder: finálne Go/No-Go pre release.

---

## 2) Exact ENV List (infra-relevant)

### Email/Ticketing

- `EMAIL_PROVIDER` (`RESEND` | `BREVO` | `SMTP`)
- `RESEND_API_KEY` (ak provider = `RESEND`)
- `BREVO_API_KEY` (ak provider = `BREVO`)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL` (ak provider = `SMTP`)
- `LEGAL_INBOX`
- `SUPPORT_INBOX`
- `LEGAL_FROM_EMAIL`
- `SUPPORT_FROM_EMAIL`
- `LEGAL_WEBHOOK_URL` (voliteľné)
- `SUPPORT_WEBHOOK_URL` (voliteľné)
- `OPERATIONS_WEBHOOK_URL` (voliteľný fallback)

### Core runtime (kritické pre app)

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PRO`

---

## 3) Test Plan (D1)

### T1 — API validation

1. Zavolať `POST /api/legal/dpa-request` s prázdnym body.
   - Očakávanie: `400`, validačná hláška.
2. Zavolať `POST /api/support/request` s prázdnym body.
   - Očakávanie: `400`, validačná hláška.

### T2 — Public URL smoke

Overiť 200/obsah pre:
- `/legal`
- `/privacy-policy`
- `/terms`
- `/security`
- `/status`
- `/trust-center`
- `/dpa-request`
- `/support`

### T3 — UX sanity

- DPA form render + submit flow.
- Support form render + submit flow.
- Cookie banner sa zobrazuje pri prvom načítaní.

### T4 — Deploy sanity

- Produkčný deploy úspešný.
- Po deployi opakovane overiť URL z T2.

---

## 4) Rollback Plan (D1)

1. **Trigger:** kritická regresia po release (P1/P2).
2. **Immediate action:** zastaviť ďalšie rollouty, informovať support/legal.
3. **Technical rollback:**
   - vybrať posledný stabilný deployment v hosting platforme,
   - okamžite redeploy predchádzajúcej stabilnej verzie.
4. **Verification after rollback:**
   - `/landing`, `/legal`, `/status`, `/dashboard`, billing API health.
5. **Communication:**
   - status update do 60 minút od potvrdenia incidentu,
   - postmortem do 5 pracovných dní.

---

## 5) D1 Completion Criteria

D1 je splnený, ak:
- všetky body v sekcii 1 majú stav splnené alebo majú schválenú výnimku,
- test plan T1-T4 je vykonaný,
- env list je potvrdený s ownerom infra,
- rollback je technicky vykonateľný a komunikačne pripravený.
