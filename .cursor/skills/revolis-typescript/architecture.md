# Revolis CRM — TypeScript Architecture

Reference for `apps/crm` in the RealitkaAI monorepo.

## Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS |
| Language | TypeScript (strict) |
| Database | Supabase (Postgres + RLS) |
| Validation | Zod |
| Deploy | Vercel |

## App Router structure

```
src/app/
├── (dashboard)/     # Authenticated CRM — layout with session guard
├── (public)/        # Marketing, register, widget funnels
├── (marketing)/     # Landing pages
├── api/             # ~200 REST routes (webhooks, AI, cron, public widget)
├── login/           # Auth flows + colocated actions.ts
└── layout.tsx       # Root providers
```

**Default to Server Components.** Add `"use client"` only for interactivity (forms, hooks, browser APIs).

### Route groups

- `(dashboard)` — requires Supabase session; pages fetch via server components or repositories
- `(public)` — unauthenticated or limited-auth flows (register, buyer onboarding)
- `api/` — external integrations, webhooks, mobile clients, AI endpoints

## Multi-tenant model

Every tenant-scoped row carries `agency_id`. RLS policies enforce isolation at the database layer.

```
User (auth.users)
  └── profiles (agency_id, role: owner | manager | agent)
        └── agencies (billing, entitlements, feature flags)
              └── leads, deals, properties, tasks, …
```

### Rules

1. **Never trust client-supplied `agency_id`** — resolve from session profile
2. **RLS is the backstop** — application code still filters by `agency_id` explicitly
3. **Service role** — cron jobs and admin scripts only; never in user request path
4. **Cross-tenant reads** — operator/super-admin routes use dedicated guards, not raw bypass

### Supabase clients

| Client | Path | Use |
|--------|------|-----|
| Server (cookie) | `@/lib/supabase/server` | Pages, actions, API routes (user context) |
| Browser | `@/lib/supabase/client` | Client components (realtime, auth UI) |
| Admin | `@/lib/supabase/admin` | Cron, migrations, batch jobs |

## Layered architecture

```
┌─────────────────────────────────────────┐
│  app/ (pages, API routes, actions)      │
├─────────────────────────────────────────┤
│  domain/ (interfaces, events, types)    │
├─────────────────────────────────────────┤
│  infra/db/ (Supabase*Repository)        │
├─────────────────────────────────────────┤
│  lib/ (schemas, stores, utilities)      │
└─────────────────────────────────────────┘
```

- **Domain** defines `LeadsRepository`, `ProfilesRepository` — no Supabase imports
- **Infra** implements repositories with typed mappers
- **Lib** holds Zod schemas, `safeServerAction`, `api-validate`, feature stores

## Server actions vs API routes

| Choose | When |
|--------|------|
| **Server action** | Form submit from CRM UI, redirect flows, colocated with page, no external consumer |
| **API route** | Webhooks (Stripe, Realvia), public widget, cron, mobile/third-party, rate-limited public endpoints |

### Server action pattern

```typescript
"use server";
// Colocate in actions.ts next to the page or feature folder
// Return discriminated union: { ok: true, data } | { ok: false, error }
// Use redirect() for auth failures on login/register flows
```

Wrap with `safeServerAction` from `@/lib/safe-action` for consistent error surfaces.

### API route pattern

Required imports (see `.cursor/rules/revolis-api.mdc`):

- `@/lib/api-validate` — `validateBody`, `validateQuery`
- `@/lib/api-response` — `okResponse`, `errorResponse`
- `@/lib/auto-error-capture` — telemetry on failures

```typescript
export async function POST(req: Request) {
  const validated = await validateBody(req, CreateLeadSchema);
  if (!validated.ok) return validated.response;
  // … business logic
  return okResponse({ id: lead.id });
}
```

## Validation boundaries

| Boundary | Tool |
|----------|------|
| HTTP body/query | Zod + `validateBody` / `validateQuery` |
| Server action input | Zod `.safeParse()` before DB call |
| Environment | `@/config/env.ts` (Zod schema at boot) |
| AI/LLM output | Dedicated output schema + parse retry |

Export both schema and inferred type:

```typescript
export const ListingInputSchema = z.object({ /* … */ });
export type ListingInput = z.infer<typeof ListingInputSchema>;
```

## UI conventions (dashboard)

- Theme tokens: `SLATE_HORIZON`, `WORKDESK_CARD`, `WORKDESK_INPUT` from `@/lib/slate-horizon-theme`
- Enterprise workdesk aesthetic — matte cards, blue brand gradient topbar
- Shared shells: `@/components/shared/module-shell`, `empty-state`, `error-state`
- Icons: `lucide-react`; nav icons via `@/components/ui/NavIcon`

## Key directories

| Path | Purpose |
|------|---------|
| `src/lib/ai/schemas/` | Zod schemas for AI inputs/outputs |
| `src/lib/leads-store.ts` | Legacy store (prefer repository for new code) |
| `src/domain/*/events/` | Domain events → EventBus |
| `supabase/migrations/` | Schema + RLS — never edit applied migrations |
| `config/public-schema-allowlist.json` | Tables exposed to anon/authenticated |
| `tests/verification/` | Live specification tests (update on behavior change) |

## Auth & authorization

- Session: Supabase Auth cookie via middleware
- Role checks: `owner`, `manager`, `agent` — enforce in page/action AND RLS where possible
- Path guards: see `login/actions.ts` `canAccessPath` pattern

## Error handling philosophy

- **User-facing**: Slovak messages, no stack traces
- **Logs**: `console.error` or `autoErrorCapture` with context (route, agency_id, user_id)
- **API**: consistent `{ ok: false, error: string }` or `{ ok: false, errors: fieldErrors }`
- **Never swallow** — return typed error or rethrow in cron/batch

## Related rules

- `.cursor/rules/l99-golden-rule.mdc` — PR/deploy gates
- `.cursor/rules/revolis-api.mdc` — API route checklist
- `apps/crm/AGENTS.md` — agent context, test commands
