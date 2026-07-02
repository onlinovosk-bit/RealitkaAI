import { randomUUID } from "crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { TenantTableDef } from "./tenant-table-registry";
import { scopeColumnFor } from "./tenant-table-registry";
import type { FixtureRowMap } from "./fixtures";
import { RLS_FIXTURE } from "./fixtures";

export interface IsolationOpResult {
  operation: "SELECT" | "INSERT" | "UPDATE" | "DELETE";
  blocked: boolean;
  detail: string;
}

export interface TableIsolationResult {
  table: string;
  rlsEnabled: boolean;
  seeded: boolean;
  isolationOk: boolean;
  operations: IsolationOpResult[];
  critical: boolean;
  note?: string;
}

export function assertLocalTestDb(): void {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const allowRemoteTest = process.env.ALLOW_REMOTE_TEST_SUPABASE === "1";
  const testUrl = process.env.TEST_SUPABASE_URL ?? "";
  const allowed =
    url.includes("127.0.0.1") ||
    url.includes("localhost") ||
    (allowRemoteTest && Boolean(testUrl) && url === testUrl);
  if (!allowed) {
    throw new Error(
      `RLS isolation tests require local Supabase or explicit TEST override (got ${url || "unset"}). ` +
        "Run local stack or set ALLOW_REMOTE_TEST_SUPABASE=1 with NEXT_PUBLIC_SUPABASE_URL=TEST_SUPABASE_URL",
    );
  }
}

export function createAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function signInAs(email: string, password: string): Promise<SupabaseClient> {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`signIn ${email}: ${error.message}`);
  return client;
}

export function rowKeyForTable(table: string, suffix: "a" | "b"): string {
  return `${table}_${suffix}`;
}

export function getOtherTenantRow(
  def: TenantTableDef,
  rows: FixtureRowMap,
): { id: string; row: Record<string, unknown> } | null {
  const key = rowKeyForTable(def.table, "b");
  const row = rows[key];
  if (!row || row._seedError) return null;
  return { id: String(row.id), row };
}

export function getOwnTenantRow(
  def: TenantTableDef,
  rows: FixtureRowMap,
): { id: string; row: Record<string, unknown> } | null {
  const key = rowKeyForTable(def.table, "a");
  const row = rows[key];
  if (!row || row._seedError) return null;
  return { id: String(row.id), row };
}

function pkColumn(def: TenantTableDef): string {
  return def.pk;
}

function crossTenantFilter(def: TenantTableDef, otherRow: Record<string, unknown>): Record<string, string> {
  const col = scopeColumnFor(def);
  if (def.scope === "agency_pk") {
    return { id: RLS_FIXTURE.agencyB };
  }
  const val = otherRow[col];
  if (val != null) return { [col]: String(val) };
  return { id: String(otherRow.id) };
}

export async function testCrossTenantIsolation(
  client: SupabaseClient,
  def: TenantTableDef,
  rows: FixtureRowMap,
): Promise<TableIsolationResult> {
  const other = getOtherTenantRow(def, rows);
  const seeded = other !== null;
  const ops: IsolationOpResult[] = [];

  if (!seeded || def.serviceRoleOnly) {
    return {
      table: def.table,
      rlsEnabled: true,
      seeded,
      isolationOk: def.serviceRoleOnly ? true : false,
      operations: ops,
      critical: false,
      note: def.serviceRoleOnly
        ? "service_role only — cross-tenant CRUD N/A"
        : "seed missing — check fixture",
    };
  }

  const pk = pkColumn(def);
  const otherId = other.id;
  const filter = crossTenantFilter(def, other.row);

  // SELECT must not return other tenant row
  const { data: selectData, error: selectError } = await client
    .from(def.table)
    .select(pk)
    .eq(pk, otherId)
    .maybeSingle();

  const selectBlocked =
    selectError != null || selectData == null;
  ops.push({
    operation: "SELECT",
    blocked: selectBlocked,
    detail: selectError?.message ?? (selectData ? "row visible" : "no row"),
  });

  // INSERT with other tenant scope must fail
  const insertPayload: Record<string, unknown> = {
    ...filter,
    ...(def.table === "leads"
      ? { id: `rls-probe-${Date.now()}`, name: "Probe", email: "probe@rls.test" }
      : {}),
    ...(def.table === "properties"
      ? { id: `rls-probe-p-${Date.now()}`, title: "Probe", price: 1 }
      : {}),
    ...(def.scope === "lead_id"
      ? { lead_id: RLS_FIXTURE.leadB, type: "probe", text: "x", title: "x" }
      : {}),
    ...(def.scope === "profile_id" ? { profile_id: RLS_FIXTURE.brokerB } : {}),
    ...(def.scope === "user_id"
      ? { user_id: rows.profiles_b?.user_id ?? RLS_FIXTURE.brokerB, type: "x", title: "x" }
      : {}),
  };
  if (!insertPayload.id && def.pk !== "agency_id") {
    insertPayload.id = randomUUID();
  }
  if (def.table === "credit_ledger") {
    insertPayload.delta = 1;
    insertPayload.reason = "rls_probe";
    insertPayload.idempotency_key = `rls-probe-${Date.now()}`;
    insertPayload.source = "grant";
  }
  if (def.table === "dashboard_insights_cache") {
    insertPayload.payload = {};
    insertPayload.generated_at = new Date().toISOString();
  }
  if (def.table === "outreach_logs") {
    insertPayload.campaign = "rls_probe";
    insertPayload.channel = "email";
    insertPayload.message_content = "probe";
  }

  const { error: insertError } = await client.from(def.table).insert(insertPayload);
  const insertBlocked = insertError != null;
  ops.push({
    operation: "INSERT",
    blocked: insertBlocked,
    detail: insertError?.message ?? "insert succeeded — LEAK",
  });

  // UPDATE other tenant row
  const updatePatch: Record<string, unknown> =
    def.table === "properties"
      ? { title: `RLS update probe ${Date.now()}` }
      : def.table === "outreach_logs"
        ? { message_content: `RLS update probe ${Date.now()}` }
        : { updated_at: new Date().toISOString() };

  const { data: updateData, error: updateError } = await client
    .from(def.table)
    .update(updatePatch)
    .eq(pk, otherId)
    .select(pk);

  const updateBlocked =
    updateError != null || !updateData || updateData.length === 0;
  ops.push({
    operation: "UPDATE",
    blocked: updateBlocked,
    detail: updateError?.message ?? `affected=${updateData?.length ?? 0}`,
  });

  // DELETE other tenant row
  const { data: deleteData, error: deleteError } = await client
    .from(def.table)
    .delete()
    .eq(pk, otherId)
    .select(pk);

  const deleteBlocked =
    deleteError != null || !deleteData || deleteData.length === 0;
  ops.push({
    operation: "DELETE",
    blocked: deleteBlocked,
    detail: deleteError?.message ?? `deleted=${deleteData?.length ?? 0}`,
  });

  const isolationOk = ops.every((o) => o.blocked);
  const critical = !isolationOk && ops.some((o) => !o.blocked);

  return {
    table: def.table,
    rlsEnabled: true,
    seeded,
    isolationOk,
    operations: ops,
    critical,
  };
}

export interface RlsAuditRow {
  table_name: string;
  rls_enabled: boolean;
  has_agency_id: boolean;
}

export async function fetchRlsAudit(admin: SupabaseClient): Promise<RlsAuditRow[]> {
  const { data, error } = await admin.rpc("rls_audit_snapshot");
  if (error) throw new Error(`rls_audit_snapshot: ${error.message}`);
  return (data ?? []) as RlsAuditRow[];
}

export function mergeRlsStatus(
  results: TableIsolationResult[],
  audit: RlsAuditRow[],
): TableIsolationResult[] {
  const auditMap = new Map(audit.map((r) => [r.table_name, r.rls_enabled]));
  return results.map((r) => {
    const rlsEnabled = auditMap.get(r.table) ?? r.rlsEnabled;
    return {
      ...r,
      rlsEnabled,
      isolationOk: rlsEnabled === false ? false : r.isolationOk,
      critical: rlsEnabled === false ? true : r.critical,
      note: rlsEnabled === false ? "RLS NOT ENABLED" : r.note,
    };
  });
}
