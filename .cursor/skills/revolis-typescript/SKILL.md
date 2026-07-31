---
name: revolis-typescript
description: >-
  TypeScript and Next.js 16 conventions for Revolis CRM (RealitkaAI monorepo).
  Covers strict typing, Zod validation, Supabase multi-tenant RLS, server actions,
  API routes, and repository patterns. Use when writing or reviewing TypeScript
  in apps/crm, fixing type errors, scaffolding features, or preparing TS PRs.
---

# Revolis TypeScript

Production TypeScript standards for **Revolis CRM** (`apps/crm`).

## When to use

- Implementing or refactoring features in `apps/crm`
- Reviewing PRs for type safety, RLS, or API conventions
- Fixing `tsc`, ESLint, or Vitest failures
- Scaffolding server actions, API routes, repositories, or client components

## Quick reference

| Topic | Rule |
|-------|------|
| Strictness | `strict: true` — no `any`, no `@ts-ignore`, no `@ts-expect-error` without linked issue |
| Validation | Zod at boundaries (API body, server action input, env) |
| Multi-tenant | Every query scoped by `agency_id`; rely on RLS + explicit filters |
| Server actions | `"use server"` + typed returns via `safeServerAction` or discriminated unions |
| API routes | `validateBody` / `validateQuery` + `okResponse` / `errorResponse` |
| Data access | Domain interface + `Supabase*Repository` in `infra/db` |
| UI (dashboard) | `"use client"` only when needed; SLATE_HORIZON tokens for workdesk UI |
| Tests | Unit in Vitest; behavior changes → update `tests/verification/*.verification.test.ts` |

## Workflow

1. **Read context** — `apps/crm/AGENTS.md`, relevant `.cursor/rules/revolis-*.mdc`
2. **Pick layer** — page (RSC) → server action or API → repository → Supabase
3. **Type boundaries** — Zod schema → `z.infer<typeof Schema>` for TS types
4. **Verify** — `npm test`, affected verification tests, `npm run build` in `apps/crm`

## Progressive disclosure

| File | Contents |
|------|----------|
| [architecture.md](architecture.md) | App Router layout, RLS, actions vs API |
| [coding-standards.md](coding-standards.md) | Naming, errors, Zod, forbidden patterns |
| [checklist.md](checklist.md) | PR checklist for TS changes |
| [prompts.md](prompts.md) | Reusable prompt snippets |
| [examples/](examples/) | Reference implementations (no `any`) |

## Examples (read before generating code)

- Client component: [examples/react-component.tsx](examples/react-component.tsx)
- Server action: [examples/server-action.ts](examples/server-action.ts)
- Repository: [examples/repository.ts](examples/repository.ts)

## Repo paths

```
apps/crm/
├── src/app/              # App Router (pages, API, actions)
├── src/domain/           # Interfaces, events (no Supabase imports)
├── src/infra/db/         # Supabase repository implementations
├── src/lib/              # Shared utilities, schemas, safe-action
├── supabase/migrations/  # RLS policies
└── tests/verification/   # Live spec tests
```

## Anti-patterns

- Bypassing RLS with service-role client in user-facing code
- Duplicating API routes — `rg` in `src/app/api/` first
- Untyped Supabase rows — define row types or mappers
- Client components fetching secrets or using admin Supabase client
