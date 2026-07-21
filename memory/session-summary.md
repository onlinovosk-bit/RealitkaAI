## Session 2026-07-22 (overnight handoff)

### Dokončené
- **PR #311 MERGED** → `main` @ `17181d6d6` — sandbox `/odhad/demo` + `lead_consents`
- CI opravené (3 iterácie): RPC DROP, `lead_id text`, RLS test
- Apply script: `apps/crm/scripts/apply-sandbox-gdpr-prod.mjs`
- GA4 widget funkčné (`G-R1GZQFV42V`)

### Ráno u foundera (3 kroky)
1. **PROD migrácia** — Supabase SQL alebo `POSTGRES_URL_NON_POOLING=... node apps/crm/scripts/apply-sandbox-gdpr-prod.mjs`
2. **Po Vercel deploy** — mobile smoke `/odhad/demo`: submit → `sandbox_submissions` +1, `leads` +0
3. **Poslať e-mail Smolkovi** (Novák vs Webex) — draft v chate 21.7.

### Neblokované
- Smolko A/B Ads čaká len na Smolkovu odpoveď
- Demo link **neposielať** verejne pred krokom 2
- Cleanup smoke leadov v CRM (voliteľné)
