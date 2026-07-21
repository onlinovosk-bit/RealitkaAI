## Session 2026-07-22 (overnight handoff)

### Dokončené
- PR #311: sandbox `/odhad/demo` + `lead_consents` + migrácia `20260722120000_sandbox_gdpr_consent.sql`
- CI fix: `DROP FUNCTION` pred zmenou `get_valuation_tenant` return type
- PROD apply script: `apps/crm/scripts/apply-sandbox-gdpr-prod.mjs`
- E2e rozšírenie: demo badge + sandbox submit API
- GA4 na widgete overené (G-R1GZQFV42V + redeploy)
- E-mail draft pre Smolka (Novák vs Webex) — founder má poslať

### Rozpracované / Pending
- PR #311 merge + PROD migrácia + founder mobile smoke `/odhad/demo`
- Smolko A/B Ads (čaká odpoveď Smolka o Novákovi)
- Cleanup smoke leadov v CRM

### Kľúčové súbory
- `apps/crm/supabase/migrations/20260722120000_sandbox_gdpr_consent.sql`
- `apps/crm/src/app/api/valuation/submit/route.ts`
- `docs/briefs/overnight/overnight-brief-sandbox-gdpr.md`

### Ďalší krok
Merge PR #311 → PROD migrácia → mobile smoke demo → až potom demo link verejne.
