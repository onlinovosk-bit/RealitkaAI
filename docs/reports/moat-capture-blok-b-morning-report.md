# Morning report — Moat Capture Blok B

**Branch:** `feat/moat-capture-blok-b`  
**Build package:** `docs/briefs/build-package-moat-capture-blok-b.md`

## Krok 0 — repo-first (existujúce vzory)

| Oblasť | Nájdené | Poznámka |
|--------|---------|----------|
| Terminal lead close | `outcomeWriter.ts` + `PATCH api/leads/[id]` | Genome `exclusivity_outcomes`, nie deal dôvody |
| CRM `ai_recommendations` | `leads-store.ts`, `recommendations-store.ts` | NBA seed/UI model, nie capture log |
| Triage | `inbound-lead-triage.ts` | Best-effort, never throws |
| AI email | `outreach-store.ts` + `ai-outreach.ts` | `ai_action_audit` existuje paralelne |
| NBA UI | `NextBestActionPanel.tsx`, `buildExecutiveSignals` | Client-heavy; server hook cez first-audit |

## Call-sites (tento PR)

1. `apps/crm/src/lib/acquire/inbound-lead-triage.ts` — triage log  
2. `apps/crm/src/app/api/workdesk/first-audit/route.ts` — NBA batch log  
3. `apps/crm/src/lib/outreach-store.ts` — ai_email log  
4. `apps/crm/src/app/api/leads/[id]/route.ts` — deal_outcomes  
5. `apps/crm/src/app/api/recommendations/[id]/route.ts` — accept/reject capture update  

## Test evidence

| Test | Čo dokazuje |
|------|-------------|
| `moat-capture.test.ts` | `logAiRecommendation` / `logDealOutcome` never throw; dedupe 23505; agency dedupe prefix |
| `tests/rls/*` + registry | `deal_outcomes`, `moat_ai_recommendations` seeded, cross-tenant probe |
| `platform-heartbeat.test.ts` | Metriky rozšírené (0 default) |

## Prepared migration (founder GO only)

- `apps/crm/supabase/migrations/20260726120000_moat_capture_blok_b.sql`  
- `apps/crm/supabase/MIGRATION_moat_capture_blok_b.sql`

## ODCHÝLKY

Pozri sekciu ODCHÝLKY v build package (`docs/briefs/build-package-moat-capture-blok-b.md`).

## Atomicity (neaplikované v tomto PR)

Migrácia PROD → schéma → deploy → smoke — founder gate; **merge až po GO**.
