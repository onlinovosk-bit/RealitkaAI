import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileBusStore } from "../../bus-core/src/store.ts";
import {
  AppendOnlyJsonlLedger,
  createModelGateway,
  decidePreflight,
  GatewayError,
  MemoryAlertDedup,
  aggregatePools,
  aggregateSharedPool,
  buildControlTowerView,
  emitThresholdAlerts,
  evaluateAlerts,
  forecastToReset,
  mergeSamples,
  publishUsageAlerts,
  rateLimitFromHeaders,
  snapshotConfidence,
  type ModelGatewayConfig,
  type ModelProvider,
} from "../src/index.ts";
import type { PoolAlert, UsageSample } from "../src/usage.ts";
import type { ProviderCallRequest, ProviderCallResult } from "../src/types.ts";
import type { SpendSummary } from "../src/ledger.ts";

const NOW = new Date("2026-11-10T12:00:00.000Z");

function budgets(over: Partial<ModelGatewayConfig["budgets"]> = {}): ModelGatewayConfig["budgets"] {
  return { revolisEur: 15, onlinovoEur: 7, otherEur: 5, urgentReserveEur: 1, ...over };
}

function config(over: Partial<ModelGatewayConfig> = {}): ModelGatewayConfig {
  return {
    primaryProvider: "openai",
    openaiModel: "gpt-4o-mini",
    anthropicModel: "claude-3-5-haiku-latest",
    openaiApiKey: "test-openai",
    anthropicApiKey: "test-anthropic",
    anthropicFallbackEnabled: false,
    xaiEnabled: false,
    limits: { perTaskEur: 0.25, dailyEur: 5, monthlyEur: 50 },
    budgets: budgets(),
    defaults: { maxInputTokens: 512, maxOutputTokens: 128 },
    maxAttempts: 3,
    ledgerPath: "var/model-gateway/test-ledger.jsonl",
    ...over,
  };
}

function spent(monthly = 0, project: SpendSummary["monthlyByProject"] = { revolis: 0, onlinovo: 0, other: 0 }): SpendSummary {
  return { dailyEur: 0, monthlyEur: monthly, monthlyByProject: project };
}

function sample(over: Partial<UsageSample> & Pick<UsageSample, "dedupKey" | "costEur" | "projectId">): UsageSample {
  return {
    id: over.dedupKey,
    ts: "2026-11-10T09:00:00.000Z",
    provider: "openai",
    model: "gpt-4o-mini",
    poolId: "openai:default",
    agentId: null,
    tokensIn: 10,
    tokensOut: 5,
    source: "gateway_ledger",
    ...over,
  };
}

test("shared pool counts each sample once across projects", () => {
  const samples = mergeSamples([
    [
      sample({ dedupKey: "task:a", costEur: 1, projectId: "revolis", provider: "openai" }),
      sample({ dedupKey: "task:b", costEur: 2, projectId: "onlinovo", provider: "openai" }),
      sample({ dedupKey: "task:a", costEur: 9, projectId: "revolis", provider: "openai", source: "ai_action_audit" }),
    ],
  ]);
  const pools = aggregatePools(samples);
  assert.equal(pools.length, 1);
  const pool = pools[0];
  assert.ok(pool);
  assert.equal(pool.totalEur, 3);
  assert.equal(pool.byProject.revolis, 1);
  assert.equal(pool.byProject.onlinovo, 2);
  const projectSum = pool.byProject.revolis + pool.byProject.onlinovo + pool.byProject.other;
  assert.equal(projectSum, pool.totalEur);
  assert.notEqual(pool.totalEur + projectSum, pool.totalEur);
  const shared = aggregateSharedPool(samples);
  assert.equal(shared.totalEur, 3);
  assert.equal(shared.byProvider.openai, 3);
  assert.equal(shared.byProject.revolis + shared.byProject.onlinovo + shared.byProject.other, shared.totalEur);
});

test("decidePreflight ALLOW, BLOCK, and DEFER", () => {
  const allow = decidePreflight(config(), {
    provider: "openai",
    model: "gpt-4o-mini",
    maxInputTokens: 100,
    maxOutputTokens: 50,
    taskMaxCostEur: 0.25,
    spent: spent(),
    projectId: "revolis",
    priority: "normal",
  });
  assert.equal(allow.decision, "ALLOW");

  const blocked = decidePreflight(config({ budgets: budgets({ revolisEur: 0.0000001 }) }), {
    provider: "openai",
    model: "gpt-4o-mini",
    maxInputTokens: 512,
    maxOutputTokens: 128,
    taskMaxCostEur: 1,
    spent: spent(),
    projectId: "revolis",
    priority: "urgent",
  });
  assert.equal(blocked.decision, "BLOCK");
  assert.equal(blocked.code, "project_budget");

  const xai = decidePreflight(config(), {
    provider: "xai",
    model: "grok",
    maxInputTokens: 10,
    maxOutputTokens: 10,
    taskMaxCostEur: 1,
    spent: spent(),
  });
  assert.equal(xai.decision, "BLOCK");
  assert.equal(xai.code, "xai_disabled");

  const deferred = decidePreflight(
    config({ limits: { perTaskEur: 1, dailyEur: 50, monthlyEur: 50 }, budgets: budgets({ otherEur: 50, urgentReserveEur: 1 }) }),
    {
      provider: "openai",
      model: "gpt-4o-mini",
      maxInputTokens: 100,
      maxOutputTokens: 20,
      taskMaxCostEur: 1,
      spent: spent(49.2, { revolis: 0, onlinovo: 0, other: 49.2 }),
      projectId: "other",
      priority: "normal",
    },
  );
  assert.equal(deferred.decision, "DEFER");

  const urgent = decidePreflight(
    config({ limits: { perTaskEur: 1, dailyEur: 50, monthlyEur: 50 }, budgets: budgets({ otherEur: 50, urgentReserveEur: 1 }) }),
    {
      provider: "openai",
      model: "gpt-4o-mini",
      maxInputTokens: 100,
      maxOutputTokens: 20,
      taskMaxCostEur: 1,
      spent: spent(49.2, { revolis: 0, onlinovo: 0, other: 49.2 }),
      projectId: "other",
      priority: "urgent",
    },
  );
  assert.equal(urgent.decision, "ALLOW");
});

test("fail closed when the usage store cannot be read", () => {
  const decision = decidePreflight(config(), {
    provider: "openai",
    model: "gpt-4o-mini",
    maxInputTokens: 10,
    maxOutputTokens: 10,
    taskMaxCostEur: 1,
    spent: spent(0),
    usageReadable: false,
  });
  assert.equal(decision.decision, "BLOCK");
  assert.equal(decision.code, "ledger_unavailable");
});

test("gateway does not call the provider when the ledger cannot be read", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mgw-"));
  const ledger = new AppendOnlyJsonlLedger(path.join(dir, "ledger.jsonl"));
  ledger.summarize = async () => {
    throw new Error("EIO");
  };
  let calls = 0;
  const openai: ModelProvider = {
    id: "openai",
    model: "gpt-4o-mini",
    call: async () => {
      calls += 1;
      return { text: "no", tokensIn: 1, tokensOut: 1 };
    },
  };
  const gw = createModelGateway({ config: config(), ledger, openai, now: () => NOW });
  await assert.rejects(
    () => gw.complete({ taskId: "t-eio", prompt: "x" }),
    (err: unknown) => err instanceof GatewayError && err.code === "ledger_unavailable",
  );
  assert.equal(calls, 0);
});

test("gateway defers non-urgent work onto the bus and does not call the provider", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "mgw-defer-"));
  const ledger = new AppendOnlyJsonlLedger(path.join(dir, "ledger.jsonl"));
  await ledger.append({
    ts: "2026-11-10T10:00:00.000Z",
    taskId: "seed",
    status: "ok",
    provider: "openai",
    model: "gpt-4o-mini",
    tokensIn: 1,
    tokensOut: 1,
    costEur: 49.2,
    ms: 1,
    attempts: 1,
    projectId: "other",
  });
  const bus = new FileBusStore(path.join(dir, "bus"));
  let calls = 0;
  const openai: ModelProvider = {
    id: "openai",
    model: "gpt-4o-mini",
    call: async (_req: ProviderCallRequest): Promise<ProviderCallResult> => {
      calls += 1;
      return { text: "no", tokensIn: 1, tokensOut: 1 };
    },
  };
  const gw = createModelGateway({
    config: config({
      limits: { perTaskEur: 1, dailyEur: 50, monthlyEur: 50 },
      budgets: budgets({ otherEur: 50, revolisEur: 50, onlinovoEur: 50, urgentReserveEur: 1 }),
    }),
    ledger,
    openai,
    bus,
    now: () => NOW,
  });
  await assert.rejects(
    () => gw.complete({ taskId: "t-defer", prompt: "later", projectId: "other", priority: "normal" }),
    (err: unknown) => err instanceof GatewayError && err.code === "deferred",
  );
  assert.equal(calls, 0);
  const queued = await bus.readBox("tasks");
  assert.equal(queued.length, 1);
  assert.equal(queued[0]?.envelope?.type, "task");
  assert.match(queued[0]?.envelope?.summary ?? "", /Odložená AI úloha t-defer/);
});

test("forecast uses real samples and refuses a date when data is thin", () => {
  const start = Date.parse("2026-11-01T00:00:00.000Z");
  const end = Date.parse("2026-12-01T00:00:00.000Z");
  const now = Date.parse("2026-11-10T12:00:00.000Z");
  const enough = forecastToReset({
    samples: [
      { ts: "2026-11-10T08:00:00.000Z", costEur: 1 },
      { ts: "2026-11-10T10:00:00.000Z", costEur: 1 },
      { ts: "2026-11-10T12:00:00.000Z", costEur: 1 },
    ],
    limitEur: 10,
    periodStartMs: start,
    periodEndMs: end,
    nowMs: now,
  });
  assert.equal(enough.status, "available");
  if (enough.status !== "available") return;
  assert.equal(enough.burnEurPerHour, 0.75);
  assert.equal(enough.remainingEur, 7);
  assert.equal(enough.projectedExhaustionAt, new Date(now + (7 / 0.75) * 3_600_000).toISOString());

  const thin = forecastToReset({
    samples: [
      { ts: "2026-11-10T08:00:00.000Z", costEur: 1 },
      { ts: "2026-11-10T09:00:00.000Z", costEur: 1 },
    ],
    limitEur: 10,
    periodStartMs: start,
    periodEndMs: end,
    nowMs: now,
  });
  assert.equal(thin.status, "unavailable");
  if (thin.status === "unavailable") assert.equal(thin.reason, "insufficient_samples");

  const shortSpan = forecastToReset({
    samples: [
      { ts: "2026-11-10T12:00:00.000Z", costEur: 1 },
      { ts: "2026-11-10T12:10:00.000Z", costEur: 1 },
      { ts: "2026-11-10T12:20:00.000Z", costEur: 1 },
    ],
    limitEur: 10,
    periodStartMs: start,
    periodEndMs: end,
    nowMs: Date.parse("2026-11-10T12:30:00.000Z"),
  });
  assert.equal(shortSpan.status, "unavailable");
  if (shortSpan.status === "unavailable") assert.equal(shortSpan.reason, "insufficient_span");
});

test("manual snapshot stays manual and does not invent consumption", () => {
  const fresh = snapshotConfidence(
    {
      poolId: "xai:default",
      provider: "xai",
      source: "manual_snapshot",
      limitEur: 40,
      consumedEur: null,
      resetAt: null,
      updatedAt: "2026-11-10T11:00:00.000Z",
      modelCount: null,
      note: null,
    },
    NOW,
  );
  assert.equal(fresh, "manual");

  const view = buildControlTowerView({
    now: NOW,
    monthlyLimitEur: 25,
    budgets: budgets(),
    samples: [],
    snapshots: [
      {
        poolId: "xai:default",
        provider: "xai",
        source: "manual_snapshot",
        limitEur: 40,
        consumedEur: null,
        resetAt: "2026-12-01T00:00:00.000Z",
        updatedAt: "2026-11-10T11:00:00.000Z",
        modelCount: 2,
        note: "ručný import",
      },
    ],
    ledgerState: "unavailable",
    auditState: "unavailable",
    snapshotState: "ok",
    dedupState: "unavailable",
  });
  const xai = view.cards.find((card) => card.provider === "xai");
  assert.ok(xai);
  assert.equal(xai.consumption.value, null);
  assert.equal(xai.consumption.display, "Nedostupné");
  assert.equal(xai.vendorLimit.value, 40);
  assert.equal(xai.vendorLimit.confidence, "manual");
  assert.equal(view.sharedPool.consumption.value, null);
  assert.equal(view.sharedPool.consumption.display, "Nedostupné");

  const stale = buildControlTowerView({
    now: NOW,
    monthlyLimitEur: null,
    budgets: null,
    samples: [],
    snapshots: [
      {
        poolId: "xai:default",
        provider: "xai",
        source: "manual_snapshot",
        limitEur: 40,
        consumedEur: 12,
        resetAt: null,
        updatedAt: "2026-10-01T00:00:00.000Z",
        modelCount: null,
        note: null,
      },
    ],
    ledgerState: "unavailable",
    auditState: "unavailable",
    snapshotState: "ok",
    dedupState: "ok",
  });
  const staleCard = stale.cards.find((card) => card.provider === "xai");
  assert.equal(staleCard?.status, "stale");
  assert.equal(staleCard?.consumption.value, 12);
  assert.notEqual(staleCard?.consumption.confidence, "live");
});

test("alert thresholds 50/70/85/95 and burn fire once", async () => {
  const periodEnd = Date.parse("2026-12-01T00:00:00.000Z");
  const quietForecast = {
    status: "available" as const,
    burnEurPerHour: 0.1,
    remainingEur: 4,
    projectedExhaustionAt: "2026-12-20T00:00:00.000Z",
    sampleCount: 3,
    spanMs: 5 * 3_600_000,
  };
  const first = evaluateAlerts({
    poolId: "gateway:month",
    period: "2026-11",
    consumedEur: 96,
    limitEur: 100,
    forecast: quietForecast,
    periodEndMs: periodEnd,
    alreadyFired: new Set(),
  });
  assert.deepEqual(
    first.map((alert) => alert.kind),
    ["pct_50", "pct_70", "pct_85", "pct_95"],
  );
  const again = evaluateAlerts({
    poolId: "gateway:month",
    period: "2026-11",
    consumedEur: 96,
    limitEur: 100,
    forecast: quietForecast,
    periodEndMs: periodEnd,
    alreadyFired: new Set(first.map((alert) => alert.key)),
  });
  assert.equal(again.length, 0);

  const burn = evaluateAlerts({
    poolId: "gateway:month",
    period: "2026-11",
    consumedEur: 10,
    limitEur: 100,
    forecast: {
      ...quietForecast,
      projectedExhaustionAt: "2026-11-20T00:00:00.000Z",
    },
    periodEndMs: periodEnd,
    alreadyFired: new Set(),
  });
  assert.deepEqual(burn.map((alert) => alert.kind), ["burn_critical"]);

  const dedup = new MemoryAlertDedup();
  const published: PoolAlert[][] = [];
  const input = {
    poolId: "gateway:month",
    period: "2026-11",
    consumedEur: 96,
    limitEur: 100,
    forecast: quietForecast,
    periodEndMs: periodEnd,
    dedup,
    publish: async (alerts: PoolAlert[]) => {
      published.push(alerts);
    },
  };
  const sent = await emitThresholdAlerts(input);
  assert.equal(sent.length, 4);
  const second = await emitThresholdAlerts(input);
  assert.equal(second.length, 0);
  assert.equal(published.length, 1);

  const dir = await mkdtemp(path.join(tmpdir(), "mgw-alert-"));
  const bus = new FileBusStore(path.join(dir, "bus"));
  const ids = await publishUsageAlerts(bus, sent, NOW);
  assert.equal(ids.length, 4);
  const stored = await bus.readBox("state");
  assert.equal(stored.length, 4);
  await publishUsageAlerts(bus, [], NOW);
  assert.equal((await bus.readBox("state")).length, 4);
});

test("rate limit headers are parsed and missing headers stay null", () => {
  const headers = new Map<string, string>([
    ["x-ratelimit-limit-requests", "500"],
    ["x-ratelimit-remaining-requests", "499"],
    ["x-ratelimit-reset-requests", "1s"],
  ]);
  const parsed = rateLimitFromHeaders("openai", (name) => headers.get(name) ?? null);
  assert.equal(parsed?.requestsLimit, 500);
  assert.equal(parsed?.requestsRemaining, 499);
  assert.equal(parsed?.tokensLimit, null);
  assert.equal(rateLimitFromHeaders("anthropic", () => null), null);
});
