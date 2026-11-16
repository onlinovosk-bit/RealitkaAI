import type {
  GatewayLedgerRecord,
  GatewayProjectId,
  ProviderRateLimit,
} from "./types.ts";

export const STALE_AFTER_MS = 36 * 60 * 60 * 1000;
export const MIN_FORECAST_SAMPLES = 3;
export const MIN_FORECAST_SPAN_MS = 60 * 60 * 1000;
export const POOL_ALERT_THRESHOLDS = [50, 70, 85, 95] as const;
export const SHARED_POOL_ID = "gateway:month";

export type CardConfidence = "live" | "manual" | "stale" | "unavailable";
export type SourceState = "ok" | "empty" | "unavailable";

export interface UsageSample {
  id: string;
  /** Same key from ledger and audit collapses to one sample. */
  dedupKey: string;
  ts: string;
  provider: string;
  model: string | null;
  poolId: string;
  projectId: GatewayProjectId;
  agentId: string | null;
  costEur: number;
  tokensIn: number;
  tokensOut: number;
  source: "gateway_ledger" | "ai_action_audit" | "manual_snapshot";
  rateLimit?: ProviderRateLimit | null;
}

export interface AuditCostRow {
  id: string;
  createdAt: string;
  costEur: number | null;
  model: string | null;
  meta?: Record<string, unknown> | null;
}

export interface ManualQuotaSnapshot {
  poolId: string;
  provider: string;
  source: "provider_api" | "manual_snapshot";
  limitEur: number | null;
  consumedEur: number | null;
  resetAt: string | null;
  updatedAt: string | null;
  modelCount: number | null;
  note: string | null;
}

export interface PoolAggregate {
  poolId: string;
  totalEur: number;
  byProject: Record<GatewayProjectId, number>;
  byProvider: Record<string, number>;
  models: string[];
}

export type ForecastResult =
  | {
      status: "available";
      burnEurPerHour: number;
      remainingEur: number;
      projectedExhaustionAt: string | null;
      sampleCount: number;
      spanMs: number;
    }
  | {
      status: "unavailable";
      reason: "insufficient_samples" | "insufficient_span" | "no_limit" | "no_burn";
      sampleCount: number;
    };

export type AlertKind = "pct_50" | "pct_70" | "pct_85" | "pct_95" | "burn_critical";

export interface PoolAlert {
  key: string;
  poolId: string;
  period: string;
  kind: AlertKind;
  threshold: number | null;
  consumedEur: number;
  limitEur: number;
}

export interface Figure {
  value: number | null;
  display: string;
  source: string;
  updatedAt: string | null;
  confidence: CardConfidence;
}

export interface ProviderCard {
  provider: string;
  label: string;
  status: CardConfidence;
  statusLabel: string;
  consumption: Figure;
  vendorLimit: Figure;
  reset: Figure;
  modelCount: Figure;
  rateLimitLabel: string;
  critical: boolean;
  blocked: boolean;
  blockedLabel: string | null;
  forecastLabel: string;
  note: string;
}

export interface ProjectRow {
  id: string;
  label: string;
  consumed: Figure;
  budget: Figure;
}

export interface ControlTowerView {
  generatedAt: string;
  periodKey: string;
  sharedPool: {
    poolId: string;
    status: CardConfidence;
    statusLabel: string;
    consumption: Figure;
    limit: Figure;
    reset: Figure;
    forecastLabel: string;
    critical: boolean;
    blocked: boolean;
    note: string;
  };
  cards: ProviderCard[];
  projects: ProjectRow[];
  urgentReserve: Figure;
  alerts: Array<{ key: string; label: string; kind: AlertKind }>;
  alertDelivery: Figure;
  ledgerState: SourceState;
  auditState: SourceState;
  snapshotState: SourceState;
  empty: boolean;
}

const PROJECTS: GatewayProjectId[] = ["revolis", "onlinovo", "other"];

const PROVIDERS: Array<{ id: string; label: string; calls: "on" | "fallback" | "disabled" }> = [
  { id: "openai", label: "OpenAI", calls: "on" },
  { id: "anthropic", label: "Anthropic", calls: "fallback" },
  { id: "xai", label: "Grok (xAI)", calls: "disabled" },
  { id: "gemini", label: "Gemini", calls: "disabled" },
  { id: "deepseek", label: "DeepSeek", calls: "disabled" },
];

export function asProjectId(value: unknown): GatewayProjectId {
  if (value === "revolis" || value === "onlinovo" || value === "other") return value;
  return "other";
}

export function round6(n: number): number {
  return Math.round(n * 1_000_000) / 1_000_000;
}

export function utcMonthWindow(now: Date): { startMs: number; endMs: number; key: string } {
  const startMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1);
  const endMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1);
  return { startMs, endMs, key: now.toISOString().slice(0, 7) };
}

export function statusLabel(status: CardConfidence): string {
  if (status === "live") return "Živé";
  if (status === "manual") return "Manuálne";
  if (status === "stale") return "Zastarané";
  return "Nedostupné";
}

export function formatEur(value: number): string {
  return `${value.toLocaleString("sk-SK", { minimumFractionDigits: 2, maximumFractionDigits: 4 })} €`;
}

function unavailableFigure(source: string): Figure {
  return {
    value: null,
    display: "Nedostupné",
    source,
    updatedAt: null,
    confidence: "unavailable",
  };
}

function countFigure(
  value: number,
  source: string,
  updatedAt: string | null,
  confidence: CardConfidence,
): Figure {
  return { value, display: String(value), source, updatedAt, confidence };
}

function figure(
  value: number | null,
  source: string,
  updatedAt: string | null,
  confidence: CardConfidence,
): Figure {
  if (value === null || !Number.isFinite(value) || confidence === "unavailable") {
    return { value: null, display: "Nedostupné", source, updatedAt, confidence: "unavailable" };
  }
  return { value: round6(value), display: formatEur(value), source, updatedAt, confidence };
}

export function parseLedgerJsonl(raw: string): GatewayLedgerRecord[] {
  const rows: GatewayLedgerRecord[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed) as GatewayLedgerRecord);
    } catch {
      continue;
    }
  }
  return rows;
}

export function isBillableLedgerRow(row: GatewayLedgerRecord): boolean {
  return row.status === "ok" && Number.isFinite(row.costEur);
}

export function inferProvider(model: string | null, explicit?: unknown): string | null {
  if (typeof explicit === "string" && explicit.trim() !== "") return explicit.trim().toLowerCase();
  if (!model) return null;
  const value = model.toLowerCase();
  if (value.startsWith("gpt-") || value.startsWith("o1") || value.startsWith("o3") || value.startsWith("o4")) {
    return "openai";
  }
  if (value.includes("claude")) return "anthropic";
  if (value.includes("gemini")) return "gemini";
  if (value.includes("deepseek")) return "deepseek";
  if (value.includes("grok")) return "xai";
  return null;
}

function emptyProjects(): Record<GatewayProjectId, number> {
  return { revolis: 0, onlinovo: 0, other: 0 };
}

export function samplesFromLedger(records: readonly GatewayLedgerRecord[]): UsageSample[] {
  const out: UsageSample[] = [];
  for (const row of records) {
    if (!isBillableLedgerRow(row)) continue;
    const provider = inferProvider(row.model, row.provider) ?? "unattributed";
    out.push({
      id: `ledger:${row.taskId}:${row.ts}`,
      dedupKey: row.taskId ? `task:${row.taskId}` : `ledger:${row.ts}:${provider}`,
      ts: row.ts,
      provider,
      model: row.model?.trim() ? row.model : null,
      poolId: row.poolId?.trim() || `${provider}:default`,
      projectId: asProjectId(row.projectId),
      agentId: row.agentId?.trim() ? row.agentId : null,
      costEur: row.costEur,
      tokensIn: Number.isFinite(row.tokensIn) ? row.tokensIn : 0,
      tokensOut: Number.isFinite(row.tokensOut) ? row.tokensOut : 0,
      source: "gateway_ledger",
      rateLimit: row.rateLimit ?? null,
    });
  }
  return out;
}

export function samplesFromAudit(rows: readonly AuditCostRow[]): UsageSample[] {
  const out: UsageSample[] = [];
  for (const row of rows) {
    if (typeof row.costEur !== "number" || !Number.isFinite(row.costEur)) continue;
    const meta = row.meta ?? {};
    const provider = inferProvider(row.model, meta.provider);
    if (!provider) continue;
    const explicitDedup = typeof meta.dedupKey === "string" ? meta.dedupKey : "";
    const taskId = typeof meta.gatewayTaskId === "string" ? meta.gatewayTaskId : null;
    const projectRaw = meta.project ?? meta.projectId;
    out.push({
      id: `audit:${row.id}`,
      dedupKey: explicitDedup.trim() !== ""
        ? explicitDedup
        : taskId
          ? `task:${taskId}`
          : `audit:${row.id}`,
      ts: row.createdAt,
      provider,
      model: row.model?.trim() ? row.model : null,
      poolId: typeof meta.poolId === "string" && meta.poolId.trim() ? meta.poolId : `${provider}:default`,
      projectId: asProjectId(projectRaw),
      agentId: typeof meta.agentId === "string" && meta.agentId.trim() ? meta.agentId : null,
      costEur: row.costEur,
      tokensIn: 0,
      tokensOut: 0,
      source: "ai_action_audit",
    });
  }
  return out;
}

/** First sample for a dedup key wins. Later copies do not add EUR. */
export function mergeSamples(groups: readonly (readonly UsageSample[])[]): UsageSample[] {
  const map = new Map<string, UsageSample>();
  for (const group of groups) {
    for (const sample of group) {
      if (!map.has(sample.dedupKey)) map.set(sample.dedupKey, sample);
    }
  }
  return [...map.values()];
}

export function aggregatePools(samples: readonly UsageSample[]): PoolAggregate[] {
  const pools = new Map<string, PoolAggregate>();
  for (const sample of samples) {
    let pool = pools.get(sample.poolId);
    if (!pool) {
      pool = {
        poolId: sample.poolId,
        totalEur: 0,
        byProject: emptyProjects(),
        byProvider: {},
        models: [],
      };
      pools.set(sample.poolId, pool);
    }
    pool.byProject[sample.projectId] = round6(pool.byProject[sample.projectId] + sample.costEur);
    pool.byProvider[sample.provider] = round6((pool.byProvider[sample.provider] ?? 0) + sample.costEur);
    if (sample.model && !pool.models.includes(sample.model)) pool.models.push(sample.model);
  }
  for (const pool of pools.values()) {
    pool.totalEur = round6(PROJECTS.reduce((sum, id) => sum + pool.byProject[id], 0));
  }
  return [...pools.values()];
}

/**
 * One shared EUR pool. Provider and project maps are partitions of `totalEur`.
 * Adding them again would double-count.
 */
export function aggregateSharedPool(samples: readonly UsageSample[]): PoolAggregate {
  const byProject = emptyProjects();
  const byProvider: Record<string, number> = {};
  const models: string[] = [];
  for (const sample of samples) {
    byProject[sample.projectId] = round6(byProject[sample.projectId] + sample.costEur);
    byProvider[sample.provider] = round6((byProvider[sample.provider] ?? 0) + sample.costEur);
    if (sample.model && !models.includes(sample.model)) models.push(sample.model);
  }
  const totalEur = round6(PROJECTS.reduce((sum, id) => sum + byProject[id], 0));
  return { poolId: SHARED_POOL_ID, totalEur, byProject, byProvider, models };
}

export function inPeriod(ts: string, startMs: number, endMs: number): boolean {
  const ms = Date.parse(ts);
  return Number.isFinite(ms) && ms >= startMs && ms < endMs;
}

export function forecastToReset(input: {
  samples: readonly { ts: string; costEur: number }[];
  limitEur: number | null;
  periodStartMs: number;
  periodEndMs: number;
  nowMs: number;
}): ForecastResult {
  const inWindow = input.samples.filter((sample) => {
    const ms = Date.parse(sample.ts);
    return Number.isFinite(ms) && ms >= input.periodStartMs && ms <= input.nowMs && Number.isFinite(sample.costEur);
  });
  if (input.limitEur === null || !Number.isFinite(input.limitEur) || input.limitEur <= 0) {
    return { status: "unavailable", reason: "no_limit", sampleCount: inWindow.length };
  }
  if (inWindow.length < MIN_FORECAST_SAMPLES) {
    return { status: "unavailable", reason: "insufficient_samples", sampleCount: inWindow.length };
  }
  const ordered = [...inWindow].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const first = ordered[0];
  const last = ordered[ordered.length - 1];
  if (!first || !last) {
    return { status: "unavailable", reason: "insufficient_samples", sampleCount: 0 };
  }
  const spanMs = Date.parse(last.ts) - Date.parse(first.ts);
  if (!Number.isFinite(spanMs) || spanMs < MIN_FORECAST_SPAN_MS) {
    return { status: "unavailable", reason: "insufficient_span", sampleCount: ordered.length };
  }
  const consumed = ordered.reduce((sum, sample) => sum + sample.costEur, 0);
  const burnEurPerHour = consumed / (spanMs / 3_600_000);
  const remainingEur = round6(input.limitEur - consumed);
  if (!(burnEurPerHour > 0)) {
    return { status: "unavailable", reason: "no_burn", sampleCount: ordered.length };
  }
  const hoursLeft = remainingEur / burnEurPerHour;
  const projectedExhaustionAt =
    remainingEur <= 0 ? new Date(Date.parse(last.ts)).toISOString() : new Date(input.nowMs + hoursLeft * 3_600_000).toISOString();
  return {
    status: "available",
    burnEurPerHour: round6(burnEurPerHour),
    remainingEur,
    projectedExhaustionAt,
    sampleCount: ordered.length,
    spanMs,
  };
}

export function alertKey(poolId: string, period: string, kind: AlertKind): string {
  return `${poolId}|${period}|${kind}`;
}

export function evaluateAlerts(input: {
  poolId: string;
  period: string;
  consumedEur: number;
  limitEur: number | null;
  forecast: ForecastResult;
  periodEndMs: number;
  alreadyFired: ReadonlySet<string>;
}): PoolAlert[] {
  if (input.limitEur === null || !Number.isFinite(input.limitEur) || input.limitEur <= 0) return [];
  if (!Number.isFinite(input.consumedEur) || input.consumedEur < 0) return [];
  const ratio = input.consumedEur / input.limitEur;
  const alerts: PoolAlert[] = [];
  for (const threshold of POOL_ALERT_THRESHOLDS) {
    const kind = `pct_${threshold}` as AlertKind;
    const key = alertKey(input.poolId, input.period, kind);
    if (ratio + 1e-9 >= threshold / 100 && !input.alreadyFired.has(key)) {
      alerts.push({
        key,
        poolId: input.poolId,
        period: input.period,
        kind,
        threshold,
        consumedEur: round6(input.consumedEur),
        limitEur: input.limitEur,
      });
    }
  }
  if (input.forecast.status === "available" && input.forecast.projectedExhaustionAt) {
    const when = Date.parse(input.forecast.projectedExhaustionAt);
    const kind: AlertKind = "burn_critical";
    const key = alertKey(input.poolId, input.period, kind);
    if (Number.isFinite(when) && when < input.periodEndMs && !input.alreadyFired.has(key)) {
      alerts.push({
        key,
        poolId: input.poolId,
        period: input.period,
        kind,
        threshold: null,
        consumedEur: round6(input.consumedEur),
        limitEur: input.limitEur,
      });
    }
  }
  return alerts;
}

export interface AlertDedup {
  has(key: string): Promise<boolean>;
  mark(key: string): Promise<void>;
}

export class MemoryAlertDedup implements AlertDedup {
  private readonly keys = new Set<string>();

  async has(key: string): Promise<boolean> {
    return this.keys.has(key);
  }

  async mark(key: string): Promise<void> {
    this.keys.add(key);
  }
}

export async function emitThresholdAlerts(input: {
  poolId: string;
  period: string;
  consumedEur: number;
  limitEur: number | null;
  forecast: ForecastResult;
  periodEndMs: number;
  dedup: AlertDedup;
  publish: (alerts: PoolAlert[]) => Promise<void>;
}): Promise<PoolAlert[]> {
  const already = new Set<string>();
  const candidates = evaluateAlerts({ ...input, alreadyFired: already });
  const fresh: PoolAlert[] = [];
  for (const alert of candidates) {
    if (await input.dedup.has(alert.key)) continue;
    fresh.push(alert);
  }
  if (fresh.length === 0) return [];
  await input.publish(fresh);
  for (const alert of fresh) await input.dedup.mark(alert.key);
  return fresh;
}

export function snapshotConfidence(snapshot: ManualQuotaSnapshot, now: Date): CardConfidence {
  if (snapshot.updatedAt === null) return "unavailable";
  const updated = Date.parse(snapshot.updatedAt);
  if (!Number.isFinite(updated)) return "unavailable";
  const age = now.getTime() - updated;
  if (age < 0) return "unavailable";
  if (age > STALE_AFTER_MS) return "stale";
  if (snapshot.source === "provider_api") return "live";
  if (snapshot.source === "manual_snapshot") return "manual";
  return "unavailable";
}

function newest(samples: readonly UsageSample[]): UsageSample | null {
  let best: UsageSample | null = null;
  let bestMs = -Infinity;
  for (const sample of samples) {
    const ms = Date.parse(sample.ts);
    if (Number.isFinite(ms) && ms >= bestMs) {
      best = sample;
      bestMs = ms;
    }
  }
  return best;
}

function consumptionConfidence(samples: readonly UsageSample[], nowMs: number): CardConfidence {
  const last = newest(samples);
  if (!last) return "unavailable";
  const ms = Date.parse(last.ts);
  if (!Number.isFinite(ms)) return "unavailable";
  return nowMs - ms > STALE_AFTER_MS ? "stale" : "live";
}

function forecastLabel(result: ForecastResult): string {
  if (result.status === "unavailable") {
    if (result.reason === "insufficient_samples" || result.reason === "insufficient_span") {
      return "Nedostupné — málo vzoriek v období";
    }
    if (result.reason === "no_burn") return "Nedostupné — spotreba nerastie, dátum sa nedá spočítať";
    return "Nedostupné — chýba limit, z ktorého sa dá počítať";
  }
  if (!result.projectedExhaustionAt) return "Nedostupné";
  return `Vyčerpanie ${result.projectedExhaustionAt} · ${formatEur(result.burnEurPerHour)}/h · zostáva ${formatEur(result.remainingEur)}`;
}

function rateLimitLabel(sample: UsageSample | null): string {
  const limit = sample?.rateLimit;
  if (!limit) return "Nedostupné — posledná odpoveď nemala hlavičky limitu";
  const tokens =
    limit.tokensRemaining !== null && limit.tokensLimit !== null
      ? `${limit.tokensRemaining} / ${limit.tokensLimit} tokenov`
      : null;
  const requests =
    limit.requestsRemaining !== null && limit.requestsLimit !== null
      ? `${limit.requestsRemaining} / ${limit.requestsLimit} požiadaviek`
      : null;
  const reset = limit.tokensReset ?? limit.requestsReset;
  const parts = [tokens, requests].filter((part): part is string => part !== null);
  if (parts.length === 0) return "Nedostupné — hlavičky limitu boli prázdne";
  return `${parts.join(" · ")}${reset ? ` · reset ${reset}` : ""}`;
}

function alertLabel(alert: PoolAlert): string {
  if (alert.kind === "burn_critical") {
    return `${alert.poolId}: kritické tempo čerpania (raz za obdobie ${alert.period})`;
  }
  return `${alert.poolId}: ${alert.threshold} % stropu (raz za obdobie ${alert.period})`;
}

export interface TowerBudgets {
  revolisEur: number;
  onlinovoEur: number;
  otherEur: number;
  urgentReserveEur: number;
}

export function buildControlTowerView(input: {
  now: Date;
  monthlyLimitEur: number | null;
  budgets: TowerBudgets | null;
  samples: readonly UsageSample[];
  snapshots: readonly ManualQuotaSnapshot[];
  ledgerState: SourceState;
  auditState: SourceState;
  snapshotState: SourceState;
  dedupState: SourceState;
  firedAlertKeys?: readonly string[];
}): ControlTowerView {
  const now = input.now;
  const window = utcMonthWindow(now);
  const periodSamples = input.samples.filter((sample) => {
    const ms = Date.parse(sample.ts);
    return Number.isFinite(ms) && ms >= window.startMs && ms <= now.getTime();
  });
  const sourcesComplete =
    (input.ledgerState === "ok" || input.ledgerState === "empty") &&
    (input.auditState === "ok" || input.auditState === "empty");
  const shared = aggregateSharedPool(sourcesComplete ? periodSamples : []);
  const spendConfidence: CardConfidence = !sourcesComplete
    ? "unavailable"
    : periodSamples.length === 0
      ? "live"
      : consumptionConfidence(periodSamples, now.getTime());
  const spendSource = !sourcesComplete
    ? "ledger alebo ai_action_audit sa nepodarilo prečítať — súčet poolu by bol neúplný"
    : periodSamples.length === 0
      ? "prečítaný ledger a ai_action_audit, v období žiadna spotreba"
      : [...new Set(periodSamples.map((sample) => sample.source))].join("+");
  const updatedAt = newest(periodSamples)?.ts ?? (sourcesComplete ? now.toISOString() : null);
  const limitKnown = input.monthlyLimitEur !== null && Number.isFinite(input.monthlyLimitEur) && input.monthlyLimitEur > 0;
  const consumption = sourcesComplete
    ? figure(shared.totalEur, spendSource, updatedAt, spendConfidence)
    : unavailableFigure(spendSource);
  const limit = limitKnown
    ? figure(input.monthlyLimitEur, "konfigurácia governora (MODEL_GATEWAY_MONTHLY_LIMIT_EUR)", null, "manual")
    : unavailableFigure("mesačný strop governora nie je nastavený");
  const resetFigure: Figure = {
    value: null,
    display: new Date(window.endMs).toISOString(),
    source: "UTC kalendárny mesiac governora, nie vendor reset",
    updatedAt: null,
    confidence: "manual",
  };

  const forecast = forecastToReset({
    samples: sourcesComplete ? periodSamples.map((sample) => ({ ts: sample.ts, costEur: sample.costEur })) : [],
    limitEur: sourcesComplete && limitKnown ? input.monthlyLimitEur : null,
    periodStartMs: window.startMs,
    periodEndMs: window.endMs,
    nowMs: now.getTime(),
  });
  const ratio =
    consumption.value !== null && limit.value !== null && limit.value > 0 ? consumption.value / limit.value : null;
  const sharedCritical = ratio !== null && ratio >= 0.95;
  const sharedBlocked = ratio !== null && ratio >= 1;

  const fired = new Set(input.firedAlertKeys ?? []);
  const pending = evaluateAlerts({
    poolId: SHARED_POOL_ID,
    period: window.key,
    consumedEur: consumption.value ?? 0,
    limitEur: consumption.value === null ? null : limit.value,
    forecast,
    periodEndMs: window.endMs,
    alreadyFired: fired,
  });

  const cards: ProviderCard[] = PROVIDERS.map((provider) => {
    const mine = sourcesComplete ? periodSamples.filter((sample) => sample.provider === provider.id) : [];
    const snap = input.snapshots.find((item) => item.provider === provider.id) ?? null;
    const snapConfidence = snap && input.snapshotState !== "unavailable" ? snapshotConfidence(snap, now) : "unavailable";
    const last = newest(mine);
    let status: CardConfidence = "unavailable";
    let cardConsumption = unavailableFigure("žiadna telemetria spotreby tohto poskytovateľa");
    if (mine.length > 0) {
      status = consumptionConfidence(mine, now.getTime());
      const part = aggregateSharedPool(mine);
      cardConsumption = figure(part.totalEur, mine[0]?.source ?? "gateway_ledger", last?.ts ?? null, status);
    } else if (snap && snap.consumedEur !== null && snapConfidence !== "unavailable") {
      status = snapConfidence;
      cardConsumption = figure(snap.consumedEur, snap.source, snap.updatedAt, snapConfidence);
    } else if (sourcesComplete && mine.length === 0 && provider.calls !== "disabled") {
      status = "live";
      cardConsumption = figure(0, "prečítané zdroje, v období žiadny záznam tohto poskytovateľa", updatedAt, "live");
    }

    const vendorLimit =
      snap && snap.limitEur !== null && snapConfidence !== "unavailable"
        ? figure(snap.limitEur, snap.source === "provider_api" ? "oficiálna odpoveď API" : "manuálny snímok", snap.updatedAt, snapConfidence)
        : unavailableFigure("v repe nie je kvótové API ani snímok limitu");

    const vendorReset =
      snap && snap.resetAt && snapConfidence !== "unavailable"
        ? {
            value: null,
            display: snap.resetAt,
            source: snap.source === "provider_api" ? "oficiálna odpoveď API" : "manuálny snímok",
            updatedAt: snap.updatedAt,
            confidence: snapConfidence,
          }
        : unavailableFigure("reset kvóty poskytovateľa nie je v telemetrii");

    const models = [...new Set(mine.map((sample) => sample.model).filter((model): model is string => !!model))];
    const modelCount =
      models.length > 0
        ? countFigure(models.length, "modely v prečítaných vzorkách", last?.ts ?? null, status === "unavailable" ? "live" : status)
        : unavailableFigure("žiadny model v telemetrii");

    const providerForecast = forecastToReset({
      samples: mine.map((sample) => ({ ts: sample.ts, costEur: sample.costEur })),
      limitEur: vendorLimit.value,
      periodStartMs: window.startMs,
      periodEndMs: window.endMs,
      nowMs: now.getTime(),
    });
    const vendorRatio =
      cardConsumption.value !== null && vendorLimit.value !== null && vendorLimit.value > 0
        ? cardConsumption.value / vendorLimit.value
        : null;
    const blocked = provider.calls === "disabled";
    return {
      provider: provider.id,
      label: provider.label,
      status,
      statusLabel: statusLabel(status),
      consumption: cardConsumption,
      vendorLimit,
      reset: vendorReset,
      modelCount,
      rateLimitLabel: rateLimitLabel(last),
      critical: vendorRatio !== null && vendorRatio >= 0.95,
      blocked,
      blockedLabel: blocked ? "Platené volanie je v governore vypnuté" : null,
      forecastLabel: forecastLabel(providerForecast),
      note:
        provider.id === "xai" || provider.id === "gemini" || provider.id === "deepseek"
          ? "Bez snímku alebo hlavičky API sa kvóta nevymýšľa."
          : "Spotreba je súčet reálnych vzoriek. Limit vendora len zo snímku alebo hlavičky.",
    };
  });

  const budgetSource = "konfigurácia governora";
  const projects: ProjectRow[] = [
    { id: "revolis", label: "Revolis.AI", cap: input.budgets?.revolisEur ?? null },
    { id: "onlinovo", label: "Onlinovo.sk", cap: input.budgets?.onlinovoEur ?? null },
    { id: "other", label: "Ostatné", cap: input.budgets?.otherEur ?? null },
  ].map((project) => ({
    id: project.id,
    label: project.label,
    consumed: sourcesComplete
      ? figure(
          shared.byProject[project.id as GatewayProjectId],
          "podiel spoločného poolu, nie druhý súčet",
          updatedAt,
          consumption.confidence,
        )
      : unavailableFigure("spotreba projektu sa bez oboch zdrojov nedá spočítať"),
    budget:
      project.cap === null
        ? unavailableFigure("projektový strop nie je v konfigurácii")
        : figure(project.cap, budgetSource, null, "manual"),
  }));

  const empty = !sourcesComplete && input.snapshotState !== "ok" && cards.every((card) => card.consumption.value === null);

  return {
    generatedAt: now.toISOString(),
    periodKey: window.key,
    sharedPool: {
      poolId: SHARED_POOL_ID,
      status: consumption.confidence,
      statusLabel: statusLabel(consumption.confidence),
      consumption,
      limit,
      reset: resetFigure,
      forecastLabel: forecastLabel(forecast),
      critical: sharedCritical || pending.some((alert) => alert.kind === "burn_critical"),
      blocked: sharedBlocked,
      note: "Poskytovatelia a projekty sú rozpad tohto jedného poolu. Nesčítavajú sa k nemu znova.",
    },
    cards,
    projects,
    urgentReserve:
      input.budgets === null
        ? unavailableFigure("urgentná rezerva nie je v konfigurácii")
        : figure(input.budgets.urgentReserveEur, "konfigurácia governora, nie meraná spotreba", null, "manual"),
    alerts: pending.map((alert) => ({ key: alert.key, label: alertLabel(alert), kind: alert.kind })),
    alertDelivery:
      input.dedupState === "unavailable"
        ? unavailableFigure("dedup alertov sa nečítal — toto nie je potvrdenie doručenia")
        : countFigure(
            pending.length,
            "výpočet prahov z prečítanej spotreby; doručenie rieši BUS pri volaní governora",
            updatedAt,
            "manual",
          ),
    ledgerState: input.ledgerState,
    auditState: input.auditState,
    snapshotState: input.snapshotState,
    empty,
  };
}
