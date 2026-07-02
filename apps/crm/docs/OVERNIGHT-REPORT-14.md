# OVERNIGHT REPORT 14 — UC Export Mapper

**Branch:** `feat/brief14-uc-export-mapper`  
**Status:** ready for PR / CI

## Delivered

- `POST /api/uc/import` + `/api/realsoft/import` (shared UC protocol handler)
- `mapper-agent.ts` + `mapper-listing.ts` from documented UC fields (fixtures in `fixtures.ts`)
- Persist to `profiles` (action=2) and `properties` (action=1) with dedupe + soft-delete
- Audit via `realsoft_import_logs` + `result_code`
- Migration `20260617120000_uc_export_mapper.sql` (profiles import columns, tenant-scoped property unique index)
- Denylist: `uc/`, `realsoft/` in automerge policy
- Unit tests (mapper, handler, persist scope) + RLS test column `result_code`

## Kontrolór gate (pre-merge)

| Check | Verdict |
|-------|---------|
| Schema from UC docs (not guessed) | PASS — fixtures from plt.unitedclassifieds.sk docs |
| No lead/client mapping | PASS — listings + agents only |
| Tenant isolation on persist | PASS — agency_id from auth RPC; property lookup scoped |
| RLS on import logs | PASS — existing test extended; writes via service_role (receiver pattern) |
| CI build + unit tests | PASS — local green |
| Schema Governance Guard secrets | FLAG — `SCHEMA_GUARD_*` not in GitHub secrets yet |
| Staging migration applied | FLAG — requires `supabase db push` on linked project |
| Production DPA / rollout | FLAG — legal gate per Brief 10 |

## Post-merge ops

1. Apply migration on staging then production Supabase.
2. Set GitHub secrets: `SCHEMA_GUARD_SUPABASE_URL`, `SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY`.
3. Configure agency `realsoft_export_user` + bcrypt password hash for pilot RK.
4. Point UC export URL to `/api/uc/import` (or `/api/realsoft/import`).
