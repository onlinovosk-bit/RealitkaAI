# Revolis TypeScript Coding Standards

Applies to all code in `apps/crm` unless a brief explicitly documents an exception.

## Strict TypeScript

The project runs with `strict: true`. Treat these as hard rules:

| Forbidden | Alternative |
|-----------|-------------|
| `any` | `unknown` + type guard, generic, or Zod parse |
| `@ts-ignore` | Fix the type error or narrow the type |
| `@ts-expect-error` | Only with issue link + expiry comment |
| Non-null assertion `!` | Explicit null check or optional chaining |
| `as SomeType` casts | Zod parse, mapper function, or satisfies |

### Handling unknown data

```typescript
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

// Supabase row mapping — typed row interface, not any
interface LeadRow {
  id: string;
  name: string | null;
  agency_id: string;
  created_at: string;
}

function mapLeadRow(row: LeadRow): LeadSummary {
  return {
    id: row.id,
    name: row.name,
    agencyId: row.agency_id,
    createdAt: row.created_at,
    // …
  };
}
```

## Zod validation

- Define schema once; export `type X = z.infer<typeof XSchema>`
- Use `.safeParse()` at runtime boundaries; never `.parse()` without try/catch in user paths
- Prefer `.enum()` over free strings for known domains
- Coerce query params: `z.coerce.number()`, `z.coerce.boolean()`
- Optional fields: `.optional()` or `.nullable()` — be explicit about DB null vs missing

Common shared schemas live in `@/lib/api-validate.ts`:

- `UUIDSchema`, `EmailSchema`, `PaginationSchema`

## Naming conventions

| Kind | Convention | Example |
|------|------------|---------|
| Files (components) | kebab-case | `lead-edit-form.tsx` |
| Files (lib/util) | kebab-case | `api-validate.ts` |
| React components | PascalCase export | `export function LeadEditForm` |
| Server actions | camelCase verb | `updateLeadStatus` |
| API routes | REST nouns | `/api/leads/[id]/route.ts` |
| Zod schemas | PascalCase + Schema | `CreateLeadSchema` |
| Inferred types | PascalCase noun | `CreateLeadInput` |
| Repository interface | PascalCase + Repository | `LeadsRepository` |
| Repository impl | Supabase + Name + Repository | `SupabaseLeadsRepository` |
| DB columns (TS domain) | camelCase | `agencyId`, `createdAt` |
| DB columns (SQL/row) | snake_case | `agency_id`, `created_at` |

## Imports

- Use `@/` path alias (maps to `src/`)
- Type-only imports: `import type { X } from "…"`
- Server-only modules: never import into `"use client"` files
- `"use server"` files: no client hooks, no browser APIs

## Error handling

### Server actions

Return discriminated unions:

```typescript
type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
```

Use `safeServerAction` wrapper for unexpected throws.

### API routes

- 400 — validation failure (field errors)
- 401 — no session
- 403 — wrong role or agency
- 404 — resource not found (same message for cross-tenant miss)
- 429 — rate limit (`@/lib/rate-limit`)
- 500 — unexpected; capture via `autoErrorCapture`

User messages in Slovak for CRM UI; English OK for developer logs.

### Never

- Expose Supabase internal error codes to end users
- Return different 404 vs 403 for cross-tenant access (information leak)

## React 19 patterns

- Prefer function components with typed props interface
- `useState<T>` with explicit generic when null initial: `useState<string | null>(null)`
- Event handlers: `React.FormEvent`, `React.ChangeEvent<HTMLInputElement>`
- Avoid `useEffect` for data that can be fetched in RSC parent
- `useTransition` for non-blocking UI updates on server action calls

## Supabase queries

- Select explicit columns — avoid `select("*")` in production paths
- Use `.maybeSingle()` when 0 or 1 row expected
- Check `error` on every query; throw or return typed error
- Pagination: `.range(offset, offset + limit - 1)` with validated limits

## Testing

- Unit: Vitest colocated `__tests__/` or `tests/`
- Verification: `tests/verification/<feature>.verification.test.ts` — update when behavior/flags change
- RLS: `tests/rls/` with tenant fixtures
- No tests that assert `any` or skip type checking

## ESLint expectations

- `@typescript-eslint/no-explicit-any` — error
- Unused vars — prefix with `_` if intentionally unused
- React hooks rules enforced in client components

## Comments

- Self-documenting code first
- Comments for non-obvious business rules (GDPR, billing, Slovak legal)
- No commented-out code in PRs

## Commit scope (reminder)

One logical change per PR. Type-only refactors separate from behavior changes when possible.
