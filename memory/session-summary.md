## Session 2026-07-17 (evening)
### Dokončené
- Diagnostika: Smolko password reset link broken — PKCE + chýbajúce `/auth/confirm`
- Fix branch `fix/password-reset-auth-confirm`: auth/confirm, auth/callback, forgot-password, hardened reset-password, runbook TokenHash

### Rozpracované / Pending
- Merge + Andy: aktualizovať Supabase Reset Password šablónu na TokenHash
- Po deploy: smoke s novým e-mailom pre Smolko

### Kľúčové súbory
- `apps/crm/src/app/auth/confirm/route.ts`, `auth/callback/route.ts`
- `apps/crm/src/app/forgot-password/page.tsx`, `reset-password/page.tsx`
- `docs/runbooks/supabase-auth-email-templates-sk.md`

### Ďalší krok
PR merge → Andy dashboard šablóna → nový reset e-mail Smolkovi
