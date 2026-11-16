import { actualCostEur } from "./pricing.ts";
import { preflightCost } from "./governor.ts";
import type { ModelGatewayConfig } from "./config.ts";
import { loadConfigFromEnv } from "./config.ts";
import { AppendOnlyJsonlLedger, emptySpend, type SpendSummary } from "./ledger.ts";
import { mirrorToLangfuse } from "./langfuse.ts";
import { createOpenAiProvider } from "./providers/http-openai.ts";
import { createAnthropicProvider } from "./providers/http-anthropic.ts";
import { deferEnvelope, FileAlertDedup, publishUsageAlerts } from "./alerts.ts";
import {
  aggregateSharedPool,
  emitThresholdAlerts,
  forecastToReset,
  samplesFromLedger,
  SHARED_POOL_ID,
  utcMonthWindow,
} from "./usage.ts";
import type { BusStore } from "../../bus-core/src/store.ts";
import type {
  GatewayCompletion,
  GatewayLedgerRecord,
  GatewayProviderId,
  GatewayTask,
  ModelProvider,
  ProviderCallRequest,
  ProviderRateLimit,
} from "./types.ts";
import { GatewayError, ProviderCallError } from "./types.ts";
import { asProjectId } from "./usage.ts";

export interface ModelGatewayDeps {
  config: ModelGatewayConfig;
  ledger: AppendOnlyJsonlLedger;
  openai?: ModelProvider;
  anthropic?: ModelProvider;
  now?: () => Date;
  /** Existing bus. Deferred work is a task envelope, not a new queue. */
  bus?: BusStore;
}

function isRetriable(err: ProviderCallError): boolean {
  return err.kind === "rate_limit" || err.kind === "unavailable";
}

async function invokeProvider(
  provider: ModelProvider,
  req: ProviderCallRequest,
): Promise<{ result: Awaited<ReturnType<ModelProvider["call"]>>; ms: number }> {
  const start = Date.now();
  const result = await provider.call(req);
  return { result, ms: Date.now() - start };
}

function buildRecorder(config: ModelGatewayConfig, ledger: AppendOnlyJsonlLedger) {
  return async (row: GatewayLedgerRecord): Promise<void> => {
    await ledger.append(row);
    await mirrorToLangfuse(config, row);
  };
}

export function createModelGateway(deps: Partial<ModelGatewayDeps> = {}): {
  complete: (task: GatewayTask) => Promise<GatewayCompletion>;
} {
  const config = deps.config ?? loadConfigFromEnv();
  const ledger = deps.ledger ?? new AppendOnlyJsonlLedger(config.ledgerPath);
  const now = deps.now ?? (() => new Date());

  const openai =
    deps.openai ??
    (config.openaiModel && config.openaiApiKey
      ? createOpenAiProvider(config.openaiModel, config.openaiApiKey)
      : undefined);
  const anthropic =
    deps.anthropic ??
    (config.anthropicModel && config.anthropicApiKey
      ? createAnthropicProvider(config.anthropicModel, config.anthropicApiKey)
      : undefined);
  const record = buildRecorder(config, ledger);
  const bus = deps.bus;

  async function enforcePreflight(
    task: GatewayTask,
    provider: GatewayProviderId,
    model: string,
    maxInput: number,
    maxOutput: number,
    taskMax: number,
    spent: SpendSummary,
    usageReadable: boolean,
    attempts: number,
  ): Promise<void> {
    const projectId = asProjectId(task.projectId);
    try {
      preflightCost(config, {
        provider,
        model,
        maxInputTokens: maxInput,
        maxOutputTokens: maxOutput,
        taskMaxCostEur: taskMax,
        spent,
        usageReadable,
        projectId,
        priority: task.priority ?? "normal",
        poolSpentEur: spent.monthlyEur,
        projectSpentEur: spent.monthlyByProject[projectId],
      });
    } catch (err) {
      if (err instanceof GatewayError && err.code === "deferred") {
        const queued = await enqueueDeferred(bus, task, err.message, now());
        if (!queued) {
          const blocked = new GatewayError(
            "defer_queue_unavailable",
            "Non-urgent work was not called and could not be queued",
            attempts,
          );
          await record(
            ledgerRow(now(), task, "blocked", provider, model, 0, 0, 0, 0, blocked.code, attempts),
          );
          throw blocked;
        }
        await record(ledgerRow(now(), task, "deferred", provider, model, 0, 0, 0, 0, err.code, attempts));
      } else if (err instanceof GatewayError) {
        await record(ledgerRow(now(), task, "blocked", provider, model, 0, 0, 0, 0, err.code, attempts));
      }
      throw err;
    }
  }

  async function complete(task: GatewayTask): Promise<GatewayCompletion> {
    const maxInput = task.maxInputTokens ?? config.defaults.maxInputTokens;
    const maxOutput = task.maxOutputTokens ?? config.defaults.maxOutputTokens;
    const taskMax = task.maxCostEur ?? config.limits.perTaskEur;

    if (!config.openaiModel) {
      const err = new GatewayError("openai_model_required", "OPENAI model must be explicitly configured");
      await record(ledgerRow(now(), task, "blocked", "openai", "", 0, 0, 0, 0, err.code));
      throw err;
    }
    if (!openai) {
      const err = new GatewayError("openai_not_ready", "OpenAI provider is not configured");
      await record(ledgerRow(now(), task, "blocked", "openai", config.openaiModel, 0, 0, 0, 0, err.code));
      throw err;
    }

    let spent = emptySpend();
    let usageReadable = true;
    try {
      spent = await ledger.summarize(now());
    } catch {
      usageReadable = false;
    }
    await enforcePreflight(
      task,
      "openai",
      config.openaiModel,
      maxInput,
      maxOutput,
      taskMax,
      spent,
      usageReadable,
      0,
    );

    const callReq: ProviderCallRequest = {
      model: openai.model,
      prompt: task.prompt,
      maxOutputTokens: maxOutput,
    };

    let attempts = 0;
    let totalMs = 0;

    attempts += 1;
    try {
      const { result, ms } = await invokeProvider(openai, callReq);
      totalMs += ms;
      const cost =
        actualCostEur("openai", openai.model, result.tokensIn, result.tokensOut) ?? 0;
      const out: GatewayCompletion = {
        text: result.text,
        provider: "openai",
        model: openai.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costEur: cost,
        ms: totalMs,
        attempts,
      };
      await record(
        ledgerRow(
          now(),
          task,
          "ok",
          out.provider,
          out.model,
          out.tokensIn,
          out.tokensOut,
          out.costEur,
          out.ms,
          undefined,
          attempts,
          result.rateLimit ?? null,
        ),
      );
      await notifySharedPool(config, ledger, bus, now);
      return out;
    } catch (first) {
      if (first instanceof GatewayError) throw first;
      if (!(first instanceof ProviderCallError)) throw first;
      if (first.kind === "auth") {
        await record(
          ledgerRow(now(), task, "error", "openai", openai.model, 0, 0, 0, totalMs, "auth", attempts),
        );
        throw new GatewayError("auth", first.message, attempts);
      }
      if (!isRetriable(first)) {
        await record(
          ledgerRow(now(), task, "error", "openai", openai.model, 0, 0, 0, totalMs, first.kind, attempts),
        );
        throw new GatewayError(first.kind, first.message, attempts);
      }
    }

    if (!config.anthropicFallbackEnabled || !config.anthropicModel || !anthropic) {
      throw new GatewayError("fallback_unavailable", "Anthropic fallback is not enabled", attempts);
    }
    if (attempts >= config.maxAttempts) {
      throw new GatewayError("max_attempts", "Maximum attempts reached", attempts);
    }

    let fallbackSpent = emptySpend();
    let fallbackReadable = true;
    try {
      fallbackSpent = await ledger.summarize(now());
    } catch {
      fallbackReadable = false;
    }
    await enforcePreflight(
      task,
      "anthropic",
      config.anthropicModel,
      maxInput,
      maxOutput,
      taskMax,
      fallbackSpent,
      fallbackReadable,
      attempts,
    );

    attempts += 1;
    try {
      const { result, ms } = await invokeProvider(anthropic, {
        model: anthropic.model,
        prompt: task.prompt,
        maxOutputTokens: maxOutput,
      });
      totalMs += ms;
      const cost =
        actualCostEur("anthropic", anthropic.model, result.tokensIn, result.tokensOut) ?? 0;
      const out: GatewayCompletion = {
        text: result.text,
        provider: "anthropic",
        model: anthropic.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        costEur: cost,
        ms: totalMs,
        attempts,
      };
      await record(
        ledgerRow(
          now(),
          task,
          "ok",
          out.provider,
          out.model,
          out.tokensIn,
          out.tokensOut,
          out.costEur,
          out.ms,
          undefined,
          attempts,
          result.rateLimit ?? null,
        ),
      );
      await notifySharedPool(config, ledger, bus, now);
      return out;
    } catch (second) {
      if (second instanceof GatewayError) throw second;
      if (second instanceof ProviderCallError) {
        await record(
          ledgerRow(now(), task, "error", "anthropic", anthropic.model, 0, 0, 0, totalMs, second.kind, attempts),
        );
        throw new GatewayError(second.kind, second.message, attempts);
      }
      throw second;
    }
  }

  return { complete };
}

async function notifySharedPool(
  config: ModelGatewayConfig,
  ledger: AppendOnlyJsonlLedger,
  bus: BusStore | undefined,
  now: () => Date,
): Promise<void> {
  if (!bus) return;
  try {
    const at = now();
    const window = utcMonthWindow(at);
    const samples = samplesFromLedger(await ledger.records()).filter((sample) => {
      const ms = Date.parse(sample.ts);
      return Number.isFinite(ms) && ms >= window.startMs && ms < at.getTime() + 1;
    });
    const shared = aggregateSharedPool(samples);
    const forecast = forecastToReset({
      samples: samples.map((sample) => ({ ts: sample.ts, costEur: sample.costEur })),
      limitEur: config.limits.monthlyEur,
      periodStartMs: window.startMs,
      periodEndMs: window.endMs,
      nowMs: at.getTime(),
    });
    await emitThresholdAlerts({
      poolId: SHARED_POOL_ID,
      period: window.key,
      consumedEur: shared.totalEur,
      limitEur: config.limits.monthlyEur,
      forecast,
      periodEndMs: window.endMs,
      dedup: new FileAlertDedup(`${ledger.filePath}.alerts.json`),
      publish: async (alerts) => {
        await publishUsageAlerts(bus, alerts, at);
      },
    });
  } catch {
    // A failed alert must not turn a finished call into an error.
  }
}

async function enqueueDeferred(
  bus: BusStore | undefined,
  task: GatewayTask,
  reason: string,
  at: Date,
): Promise<boolean> {
  if (!bus) return false;
  try {
    await bus.write("tasks", deferEnvelope({ taskId: task.taskId, reason, now: at }));
    return true;
  } catch {
    return false;
  }
}

function ledgerRow(
  at: Date,
  task: GatewayTask,
  status: GatewayLedgerRecord["status"],
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  costEur: number,
  ms: number,
  errorCode?: string,
  attempts = 0,
  rateLimit?: ProviderRateLimit | null,
): GatewayLedgerRecord {
  const row: GatewayLedgerRecord = {
    ts: at.toISOString(),
    taskId: task.taskId,
    status,
    provider,
    model,
    tokensIn,
    tokensOut,
    costEur,
    ms,
    attempts,
    projectId: asProjectId(task.projectId),
    poolId: `${provider}:default`,
  };
  if (task.agentId) row.agentId = task.agentId;
  if (errorCode) row.errorCode = errorCode;
  if (rateLimit) row.rateLimit = rateLimit;
  return row;
}
