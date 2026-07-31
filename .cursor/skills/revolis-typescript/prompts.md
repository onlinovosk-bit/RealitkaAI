# Reusable Prompt Snippets — Revolis TypeScript

Copy-paste and fill placeholders. Adjust scope to match BO brief.

---

## New API route

```
Implement a POST handler at apps/crm/src/app/api/{resource}/route.ts for Revolis CRM.

Requirements:
- Zod schema for request body; use validateBody from @/lib/api-validate
- Auth: Supabase session via createClient from @/lib/supabase/server
- Scope all queries by agency_id from the user's profile
- Responses: okResponse / errorResponse from @/lib/api-response
- Capture errors with autoErrorCapture
- No any, no @ts-ignore
- Mirror patterns in apps/crm/src/app/api/leads/route.ts

Resource: {describe resource}
Input fields: {list fields}
Output: {describe success payload}
```

---

## New server action

```
Add a server action in apps/crm/src/app/(dashboard)/{feature}/actions.ts.

Requirements:
- "use server" directive
- Zod-validate input before Supabase calls
- Return { ok: true, data: T } | { ok: false, error: string }
- Use safeServerAction from @/lib/safe-action for the outer wrapper
- Resolve agency_id from session profile, never from client
- Slovak user-facing error messages
- Strict TypeScript — no any

Action: {action name}
Input: {fields}
Side effects: {DB tables, events}
```

---

## New repository method

```
Extend the data access layer for {entity} in apps/crm.

Requirements:
- Add method to domain interface in src/domain/{entity}/repositories/
- Implement in src/infra/db/repositories/Supabase{Entity}Repository.ts
- Explicit column select (no select("*"))
- Filter by agency_id parameter
- Typed row interface + mapRow mapper (no any)
- Throw Error with [Supabase{Entity}Repository] prefix on DB errors

Method: {method signature}
Filters: {optional filters}
Return type: {domain type}
```

---

## New dashboard client component

```
Create a client component at apps/crm/src/components/{area}/{name}.tsx.

Requirements:
- "use client" only because {interactivity reason}
- Typed props interface exported or colocated
- SLATE_HORIZON / WORKDESK_* tokens from @/lib/slate-horizon-theme
- Loading and error UI states
- Call server action or /api route — no direct Supabase admin
- React 19 patterns; lucide-react icons
- No any

Purpose: {what it does}
Props: {list props}
Actions: {submit, fetch, etc.}
```

---

## Fix TypeScript errors

```
Fix TypeScript errors in {file path(s)} without weakening strictness.

Rules:
- Do not add any, @ts-ignore, or unsafe casts
- Prefer Zod parse or explicit type guards for unknown data
- Preserve runtime behavior unless error indicates real bug
- Match existing naming and import style in apps/crm

Errors:
{paste tsc/eslint output}
```

---

## Add Zod schema + types

```
Create a Zod schema for {feature} in apps/crm/src/lib/{path}/schema.ts.

Requirements:
- Export Schema constant and z.infer type alias
- Use .enum() for closed sets, .coerce for query params
- Add .max() limits on strings (match DB column lengths where known)
- Include formatListingInputForPrompt-style helper if AI-facing
- Unit test in __tests__/ with valid/invalid cases

Fields: {list with types and constraints}
```

---

## Verification test update

```
Behavior changed for {feature}. Update the live spec.

Steps:
1. rg "{feature}" apps/crm/tests/verification/
2. Edit matching *.verification.test.ts
3. Assert new behavior with file-path references (verification README pattern)
4. Run: npx vitest run tests/verification/{file}.verification.test.ts

Change: {what changed}
Expected assertions: {list}
```

---

## PR review (TypeScript focus)

```
Review this diff for Revolis CRM TypeScript standards.

Check:
- any / @ts-ignore / unsafe casts
- Missing Zod at API/action boundaries
- agency_id scoping and RLS assumptions
- Server vs client boundary violations
- Missing verification test updates for behavior changes
- API route imports (validateBody, okResponse, autoErrorCapture)

Apply revolis-typescript skill checklist.md.
Return findings as Critical / Suggestion / Nice-to-have.
```

---

## RLS migration

```
Add Supabase migration for table {table_name} with multi-tenant RLS.

Requirements:
- agency_id UUID NOT NULL REFERENCES agencies(id)
- ENABLE ROW LEVEL SECURITY
- Policies: SELECT/INSERT/UPDATE/DELETE scoped to auth user's profile.agency_id
- Update tests/rls/tenant-table-registry.ts if new tenant table
- Update config/public-schema-allowlist.json only if intentionally public

Access pattern: {who can read/write}
Special roles: {owner/manager/agent rules if different}
```
