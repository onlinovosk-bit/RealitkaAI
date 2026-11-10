import { actualCostEur } from "./pricing.ts";
import { preflightCost } from "./governor.ts";
import type { ModelGatewayConfig } from "./config.ts";
import { loadConfigFromEnv } from "./config.ts";
import { AppendOnlyJsonlLedger } from "./ledger.ts";
import { mirrorToLangfuse } from "./langfuse.ts";
import { createOpenAiProvider } from "./providers/http-openai.ts";
import { createAnthropicProvider } from "./providers/http-anthropic.ts";
import type {
  GatewayCompletion,
  GatewayLedgerRecord,
  GatewayTask,
  ModelProvider,
  ProviderCallRequest,
} from "./types.ts";
import { GatewayError, ProviderCallError } from "./types.ts";

export interface ModelGatewayDeps {
  config: ModelGatewayConfig;
  ledger: AppendOnlyJsonlLedger;
  openai?: ModelProvider;
  anthropic?: ModelProvider;
  now?: () => Date;
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

  async function complete(task: GatewayTask): Promise<GatewayCompletion> {
    const maxInput = task.maxInputTokens ?? config.defaults.maxInputTokens;
    const maxOutput = task.maxOutputTokens ?? config.defaults.maxOutputTokens;
    const taskMax = task.maxCostEur ?? config.limits.perTaskEur;

    if (!config.openaiModel) {
      const err = new GatewayError("openai_model_required", "OPENAI model must be explicitly configured");
      await record(ledgerRow(now(), task.taskId, "blocked", "openai", "", 0, 0, 0, 0, err.code));
      throw err;
    }
    if (!openai) {
      const err = new GatewayError("openai_not_ready", "OpenAI provider is not configured");
      await record(ledgerRow(now(), task.taskId, "blocked", "openai", config.openaiModel, 0, 0, 0, 0, err.code));
      throw err;
    }

    const spent = await ledger.summarize(now());
    try {
      preflightCost(config, {
        provider: "openai",
        model: config.openaiModel,
        maxInputTokens: maxInput,
        maxOutputTokens: maxOutput,
        taskMaxCostEur: taskMax,
        spent,
      });
    } catch (err) {
      if (err instanceof GatewayError) {
        await record(
          ledgerRow(
            now(),
            task.taskId,
            "blocked",
            "openai",
            config.openaiModel,
            0,
            0,
            0,
            0,
            err.code,
          ),
        );
      }
      throw err;
    }

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
      await record(ledgerRow(now(), task.taskId, "ok", out.provider, out.model, out.tokensIn, out.tokensOut, out.costEur, out.ms, undefined, attempts));
      return out;
    } catch (first) {
      if (first instanceof GatewayError) throw first;
      if (!(first instanceof ProviderCallError)) throw first;
      if (first.kind === "auth") {
        await record(
          ledgerRow(now(), task.taskId, "error", "openai", openai.model, 0, 0, 0, totalMs, "auth", attempts),
        );
        throw new GatewayError("auth", first.message, attempts);
      }
      if (!isRetriable(first)) {
        await record(
          ledgerRow(now(), task.taskId, "error", "openai", openai.model, 0, 0, 0, totalMs, first.kind, attempts),
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

    try {
      preflightCost(config, {
        provider: "anthropic",
        model: config.anthropicModel,
        maxInputTokens: maxInput,
        maxOutputTokens: maxOutput,
        taskMaxCostEur: taskMax,
        spent: await ledger.summarize(now()),
      });
    } catch (err) {
      if (err instanceof GatewayError) {
        await record(
          ledgerRow(now(), task.taskId, "blocked", "anthropic", config.anthropicModel, 0, 0, 0, totalMs, err.code, attempts),
        );
      }
      throw err;
    }

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
        ledgerRow(now(), task.taskId, "ok", out.provider, out.model, out.tokensIn, out.tokensOut, out.costEur, out.ms, undefined, attempts),
      );
      return out;
    } catch (second) {
      if (second instanceof GatewayError) throw second;
      if (second instanceof ProviderCallError) {
        await record(
          ledgerRow(now(), task.taskId, "error", "anthropic", anthropic.model, 0, 0, 0, totalMs, second.kind, attempts),
        );
        throw new GatewayError(second.kind, second.message, attempts);
      }
      throw second;
    }
  }

  return { complete };
}

function ledgerRow(
  at: Date,
  taskId: string,
  status: GatewayLedgerRecord["status"],
  provider: string,
  model: string,
  tokensIn: number,
  tokensOut: number,
  costEur: number,
  ms: number,
  errorCode?: string,
  attempts = 0,
): GatewayLedgerRecord {
  const row: GatewayLedgerRecord = {
    ts: at.toISOString(),
    taskId,
    status,
    provider,
    model,
    tokensIn,
    tokensOut,
    costEur,
    ms,
    attempts,
  };
  if (errorCode) row.errorCode = errorCode;
  return row;
}
