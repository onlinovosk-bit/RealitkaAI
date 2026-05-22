## Session 2026-05-22 — Realvia integration GO + workspace cleanup

### Dokončené
- PR #58–#61 merged — response contract, delete payload, auth message, identifikator-only auth
- Production deploy (Vercel redeploy) — header dump + `Invalid authentication` live
- Auth verified: produkčný curl s tokenmi → IP block (OK); lokálny curl → **200 OK**
- Email brief pre Bereczovú / p. Smolka pripravený
- `.gitignore` cleanup — agent logy a lokálny šum mimo Git

### Rozpracované / Pending
- Finálny re-test exportu od Realvie (Bereczová)
- Demo funnel v5 HTML — samostatný PR po schválení
- Publishing Center WIP — samostatný PR
- `resolveAgency.ts` agency DB lookup fix (P1)

### Kľúčové súbory (produkcia)
- `apps/crm/src/lib/realvia/validate.ts` — identifikator auth, no mandatory SHARED_SECRET
- `apps/crm/src/app/api/webhooks/realvia/route.ts` — header dump logging
- `docs/REALVIA_ONBOARDING.md` — aktualizovaný onboarding

### Ďalší krok
Po potvrdení od Bereczovej: overiť `realvia_webhook_logs` v Supabase. Potom demo funnel v5 PR.
