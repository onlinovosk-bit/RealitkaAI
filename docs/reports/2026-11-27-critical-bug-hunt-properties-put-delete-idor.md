# Critical bug hunt — properties PUT/DELETE cross-tenant IDOR (2026-11-27)

**Head checked:** `origin/main` @ `0437f80d`  
**Branch:** `cursor/critical-bug-properties-put-delete-agency-scope`  
**Verdict:** NEW CRITICAL (not in already-tracked set)

## Already tracked (skipped)

| Item | PR |
|------|-----|
| public nehnutelnosti buyer_intents IDOR | #963 |
| csv-import multi-agency email overwrite | #961 |
| licensing.ts free entitlement server actions | #942 |
| profiles founder mint PATCH | #939 merged |
| team owner gate | #935 merged |
| billing ui_role as identity admin | #941 merged |
| matching/recommendations multi-agency wipe | #948 / #944 / #930 |

## NEW CRITICAL

### `PUT` / `DELETE` `/api/properties` — sibling-tenant mutate via multi-agency RLS

| | |
|--|--|
| **Severity** | CRITICAL — cross-tenant write/delete (inventory + owner PII on delete) |
| **File** | `apps/crm/src/app/api/properties/route.ts` (legacy collection mutators; previously bare `.eq("id", id)`) |
| **Concrete trigger** | Auth user whose confirmed email matches `profiles` in agency A **and** B (`profile_agencies_for_auth`). Session `profiles.agency_id = A`. Caller knows/lists a property UUID belonging to agency B (RLS can surface it). `PUT /api/properties` with `{ "id": "<B-property>", "title": "x", "price": 1 }` or `DELETE` with `{ "id": "<B-property>" }` succeeds because RLS `WITH CHECK` allows any agency in `profile_agencies_for_auth()`, and the route never pinned session agency. |
| **Impact** | Overwrite title/price of another tenant’s listing; **DELETE** removes the row including `owner_name` / `owner_phone`. Same blast class as #961 (app layer forgot session `agency_id` under multi-agency RLS). |
| **Why not duplicate** | `/api/properties/[id]` PATCH/DELETE already use `sameAgency` + store agency filter (#569 era). Collection `PUT`/`DELETE` on `route.ts` were left as raw id-only mutations. Not covered by #961 (leads import) or #948 (match wipe). |

## Fix in this PR

- Route PUT/DELETE: resolve caller `agency_id`, `getProperty` + `sameAgency` fail-closed, mutate only via `updateProperty` / `deleteProperty` (store already `.eq("agency_id", sessionAgency)`).
- Unit: `src/app/api/properties/__tests__/route.agency-scope.test.ts`

## Cleared at CRITICAL bar (this pass)

- Gmail connect/callback: state bound to profile agency; no body agencyId.
- acquire/email: shared secret fail-closed; agency from Worker payload (gateway trust).
- leads/inbound form: slug+token → agency; service role insert scoped.
- recommendations `[id]` PATCH: sameAgency gate present; bulk still relies on RLS + browser-client footgun (not proven live cross-tenant write).
- ai-control-tower snapshots: `requirePlatformAdmin`.
- team users/teams/assign-lead: owner/agency gates present on main.
- universal-import runner: email dedup already `.eq("agency_id", job.agencyId)`.

## Evidence

- Plan lint: `docs/briefs/plans/2026-11-27-properties-put-delete-agency-scope.md` → PLAN OK
- Unit: `npx vitest run src/app/api/properties/__tests__/route.agency-scope.test.ts`
