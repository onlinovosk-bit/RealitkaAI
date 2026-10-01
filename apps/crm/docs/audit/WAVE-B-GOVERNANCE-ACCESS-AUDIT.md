# Wave B Governance Access Audit

## Objective
- Eliminate ad-hoc production schema writes outside migration PR flow.
- Add recurring guard that detects unknown public tables in live schema.

## Findings (code/process)
- **Service-role access is widely available in server code paths** (`createServiceRoleClient`, cron routes, import jobs), which is expected for data writes but must remain DML-only in practice.
- **Operational docs contained direct `DROP TABLE` runbook snippets** for junk table cleanup, which is unsafe as a default pattern without founder approval.
- **No automated production schema drift check** existed in CI/scheduled workflows before this wave.

## Implemented controls
- Added **public schema allowlist**: `apps/crm/config/public-schema-allowlist.json`.
- Added **schema governance guard script**: `apps/crm/scripts/schema-governance-guard.mjs`.
  - Reads live table list via `rls_audit_snapshot()`.
  - Fails on unexpected tables or missing allowlisted tables.
- Added **scheduled/manual GitHub Action**: `.github/workflows/schema-governance-guard.yml`.
  - Requires dedicated secrets:
    - `SCHEMA_GUARD_SUPABASE_URL`
    - `SCHEMA_GUARD_SUPABASE_SERVICE_ROLE_KEY`
  - Intended for production/staging monitoring, not local ephemeral DB.

## Governance policy (enforced process)
- Schema changes only via `apps/crm/supabase/migrations/*` in PR.
- No ad-hoc `db push` / manual DDL on production.
- Junk table cleanup follows Wave D rule: inspect -> founder confirm -> migration proposal -> merge.

## Follow-up required
- Configure repo secrets for `schema-governance-guard.yml`.
- Optionally scope the guard key to a dedicated low-privilege DB role that can execute only schema-audit RPC and metadata reads.

