## Session 2026-07-22 (overnight handoff)

### Dokončené
- PR #311 **MERGED** — sandbox `/odhad/demo` + `lead_consents` + migrácia
- CI fixy: DROP FUNCTION, lead_id text, RLS test is_sandbox
- PROD apply script: `apps/crm/scripts/apply-sandbox-gdpr-prod.mjs`
- GA4 widget overené (G-R1GZQFV42V)

### Rozpracované / Pending (ráno u foundera)
1. **PROD migrácia** — `node apps/crm/scripts/apply-sandbox-gdpr-prod.mjs` (POSTGRES_URL_NON_POOLING)
2. **Po Vercel deploy** — mobile smoke `/odhad/demo` (leads +0, sandbox_submissions +1)
3. **E-mail Smolkovi** — overenie Novák vs Webex (draft pripravený v chate)
4. Cleanup smoke leadov v CRM

### Ďalší krok
PROD migrácia + deploy smoke — až potom demo link verejne.
