# PR Checklist — TypeScript Changes (Revolis CRM)

Copy and track before opening or merging a PR that touches `apps/crm` TypeScript.

## Scope & planning

- [ ] Build Order brief exists (`docs/briefs/BO-*.md`) for non-trivial features
- [ ] Single logical change — no unrelated refactors bundled
- [ ] Searched existing code: `rg "<feature>" apps/crm/src/` — extended, not duplicated

## Type safety

- [ ] No new `any`, `@ts-ignore`, or unchecked `as` casts
- [ ] Zod schema at every external input boundary (API body, action input, env)
- [ ] Exported types derived from schemas (`z.infer`) where applicable
- [ ] Supabase row mappers use explicit interfaces, not loose objects
- [ ] `npm run build` passes in `apps/crm` (or monorepo root if configured)

## Multi-tenant & security

- [ ] Queries scoped by `agency_id` from session profile, not client input
- [ ] RLS policy added/updated in migration if new table or column access pattern
- [ ] No service-role Supabase client in user-facing routes
- [ ] Cross-tenant access returns generic 404, not 403 leak

## API routes (if applicable)

- [ ] Uses `validateBody` / `validateQuery` from `@/lib/api-validate`
- [ ] Uses `okResponse` / `errorResponse` from `@/lib/api-response`
- [ ] Rate limit on public endpoints (`@/lib/rate-limit`)
- [ ] Cron routes use `Authorization: Bearer ${CRON_SECRET}`
- [ ] Errors captured via `@/lib/auto-error-capture`

## Server actions (if applicable)

- [ ] File starts with `"use server"`
- [ ] Returns typed `{ ok: true, data } | { ok: false, error }` or uses `safeServerAction`
- [ ] No secrets or admin clients exposed to client bundle

## UI (if applicable)

- [ ] Server Component by default; `"use client"` only when necessary
- [ ] Dashboard uses SLATE_HORIZON / WORKDESK tokens for consistency
- [ ] Loading and error states handled (not blank screen)
- [ ] User-facing copy reviewed (Slovak, outcome-focused per clay-positioning)

## Tests

- [ ] `npm test` passes (unit + RLS)
- [ ] Behavior/flag change → updated `tests/verification/*.verification.test.ts`
- [ ] New API route in smoke scope → `tests/smoke.spec.ts` or verification test
- [ ] RLS changes → `tests/rls/` fixtures updated

## Deploy & CI (L99 golden rule)

- [ ] Branch rebased on current `main`
- [ ] CI check `Lint, test, build` green
- [ ] Vercel Preview deploy `Ready`
- [ ] `npm run test:smoke` passed locally or via CI Playwright step
- [ ] No manual Vercel setting changes without PR documentation

## Documentation

- [ ] Migration file named `YYYYMMDDHHMMSS_description.sql` if schema changed
- [ ] `public-schema-allowlist.json` updated if new public table
- [ ] Verification index updated if new verification test file

## Final review questions

1. Would a type error here reach production? (If yes, add test or stricter type.)
2. Can agency A read agency B's data with this code path?
3. Does this change require a live spec update?
