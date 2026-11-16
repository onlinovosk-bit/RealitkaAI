import { readFile } from "node:fs/promises";
import path from "node:path";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { loadConfigFromEnv } from "@revolis/model-gateway/config";
import {
  buildControlTowerView,
  mergeSamples,
  parseLedgerJsonl,
  samplesFromAudit,
  samplesFromLedger,
  utcMonthWindow,
  type AuditCostRow,
  type ControlTowerView,
  type ManualQuotaSnapshot,
  type SourceState,
} from "@revolis/model-gateway/usage";
function isEnoent(err: unknown): boolean {
  return !!err && typeof err === "object" && "code" in err && (err as { code?: string }).code === "ENOENT";
}

async function readLedger(rel: string): Promise<{ state: SourceState; rows: ReturnType<typeof parseLedgerJsonl> }> {
  const candidates = path.isAbsolute(rel)
    ? [rel]
    : [path.resolve(process.cwd(), rel), path.resolve(process.cwd(), "../..", rel)];
  let missing = 0;
  for (const file of candidates) {
    try {
      const raw = await readFile(file, "utf8");
      const rows = parseLedgerJsonl(raw);
      return { state: rows.length > 0 ? "ok" : "empty", rows };
    } catch (err) {
      if (isEnoent(err)) {
        missing += 1;
        continue;
      }
      return { state: "unavailable", rows: [] };
    }
  }
  return missing === candidates.length ? { state: "empty", rows: [] } : { state: "unavailable", rows: [] };
}

async function readAudit(): Promise<{ state: SourceState; rows: AuditCostRow[] }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { state: "unavailable", rows: [] };
  const { data, error } = await supabase
    .from("ai_action_audit")
    .select("id, created_at, cost_eur, model, meta")
    .limit(2000);
  if (error || !data) return { state: "unavailable", rows: [] };
  const rows: AuditCostRow[] = data.map((row) => ({
    id: String(row.id),
    createdAt: String(row.created_at),
    costEur: typeof row.cost_eur === "number" ? row.cost_eur : row.cost_eur === null ? null : Number(row.cost_eur),
    model: typeof row.model === "string" ? row.model : null,
    meta: row.meta && typeof row.meta === "object" ? (row.meta as Record<string, unknown>) : null,
  }));
  const priced = rows.filter((row) => typeof row.costEur === "number" && Number.isFinite(row.costEur));
  return { state: priced.length > 0 ? "ok" : "empty", rows: priced };
}

function asSnapshot(row: Record<string, unknown>): ManualQuotaSnapshot | null {
  const source = row.source === "provider_api" || row.source === "manual_snapshot" ? row.source : null;
  const provider = typeof row.provider === "string" ? row.provider : null;
  const poolId = typeof row.pool_id === "string" ? row.pool_id : null;
  if (!source || !provider || !poolId) return null;
  const num = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") return null;
    const parsed = typeof value === "number" ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return {
    poolId,
    provider,
    source,
    limitEur: num(row.limit_eur),
    consumedEur: num(row.consumed_eur),
    resetAt: typeof row.reset_at === "string" ? row.reset_at : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
    modelCount: num(row.model_count),
    note: typeof row.note === "string" ? row.note : null,
  };
}

async function readSnapshots(): Promise<{ state: SourceState; rows: ManualQuotaSnapshot[] }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { state: "unavailable", rows: [] };
  const { data, error } = await supabase
    .from("ai_quota_snapshots")
    .select("pool_id, provider, source, limit_eur, consumed_eur, reset_at, updated_at, model_count, note")
    .limit(200);
  if (error || !data) return { state: "unavailable", rows: [] };
  const rows = data
    .map((row) => asSnapshot(row as Record<string, unknown>))
    .filter((row): row is ManualQuotaSnapshot => row !== null);
  return { state: rows.length > 0 ? "ok" : "empty", rows };
}

async function readFired(periodKey: string): Promise<{ state: SourceState; keys: string[] }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { state: "unavailable", keys: [] };
  const { data, error } = await supabase
    .from("ai_pool_alert_firings")
    .select("alert_key")
    .eq("period_key", periodKey)
    .limit(200);
  if (error || !data) return { state: "unavailable", keys: [] };
  const keys = data
    .map((row) => (typeof row.alert_key === "string" ? row.alert_key : null))
    .filter((key): key is string => key !== null);
  return { state: keys.length > 0 ? "ok" : "empty", keys };
}

async function readStoredUsage(): Promise<{ state: SourceState; rows: AuditCostRow[] }> {
  const supabase = createServiceRoleClient();
  if (!supabase) return { state: "unavailable", rows: [] };
  const { data, error } = await supabase
    .from("ai_usage_entries")
    .select("id, dedup_key, provider, model, project_id, agent_id, cost_eur, occurred_at, source, pool_id")
    .limit(2000);
  if (error || !data) return { state: "unavailable", rows: [] };
  const rows: AuditCostRow[] = data.flatMap((row) => {
    const costEur = typeof row.cost_eur === "number"
      ? row.cost_eur
      : row.cost_eur === null || row.cost_eur === undefined
        ? null
        : Number(row.cost_eur);
    if (typeof costEur !== "number" || !Number.isFinite(costEur)) return [];
    return [{
      id: String(row.id),
      createdAt: String(row.occurred_at),
      costEur,
      model: typeof row.model === "string" ? row.model : null,
      meta: {
        provider: row.provider,
        project: row.project_id,
        agentId: row.agent_id,
        poolId: row.pool_id,
        gatewayTaskId: typeof row.dedup_key === "string" && row.dedup_key.startsWith("task:")
          ? row.dedup_key.slice("task:".length)
          : undefined,
      },
    }];
  });
  return { state: rows.length > 0 ? "ok" : "empty", rows };
}

export async function loadControlTower(now = new Date()): Promise<ControlTowerView> {
  const config = loadConfigFromEnv();
  const window = utcMonthWindow(now);
  const [ledger, audit, snapshots, fired, stored] = await Promise.all([
    readLedger(config.ledgerPath),
    readAudit(),
    readSnapshots(),
    readFired(window.key),
    readStoredUsage(),
  ]);
  const groups = [samplesFromLedger(ledger.rows), samplesFromAudit(audit.rows)];
  if (stored.state === "ok") groups.push(samplesFromAudit(stored.rows));
  return buildControlTowerView({
    now,
    monthlyLimitEur: config.limits.monthlyEur,
    budgets: config.budgets,
    samples: mergeSamples(groups),
    snapshots: snapshots.rows,
    ledgerState: ledger.state,
    auditState: audit.state,
    snapshotState: snapshots.state,
    dedupState: fired.state,
    firedAlertKeys: fired.keys,
  });
}
