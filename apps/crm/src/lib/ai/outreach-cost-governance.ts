/**
 * Outreach paid LLM calls go through @revolis/model-gateway (EUR preflight + ledger).
 * BUS USD governor and OUTREACH daily limits stay in outreach-store.
 */
import {
  AppendOnlyJsonlLedger,
  createModelGateway,
  GatewayError,
  loadConfigFromEnv,
  type ModelGatewayConfig,
  type ModelProvider,
} from "@revolis/model-gateway";

export class OutreachCostBlockedError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "OutreachCostBlockedError";
    this.code = code;
  }
}

function getNumberFromEnv(value: string | undefined, fallbackValue: number) {
  if (!value) return fallbackValue;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

export function buildOutreachGatewayConfig(model: string): ModelGatewayConfig {
  const base = loadConfigFromEnv();
  const maxOutput = getNumberFromEnv(
    process.env.OUTREACH_MAX_OUTPUT_TOKENS,
    base.defaults.maxOutputTokens,
  );
  return {
    ...base,
    primaryProvider: "openai",
    openaiModel: model,
    anthropicFallbackEnabled: false,
    xaiEnabled: false,
    maxAttempts: 1,
    defaults: {
      ...base.defaults,
      maxOutputTokens: maxOutput,
    },
    ledgerPath:
      process.env.MODEL_GATEWAY_LEDGER_PATH?.trim() ||
      "var/model-gateway/crm-outreach.jsonl",
  };
}

export type OutreachLlmCompletion = {
  text: string;
  costEur: number;
  ms: number;
  model: string;
  tokensIn: number;
  tokensOut: number;
  attempts: number;
};

export type OutreachGatewayDeps = {
  config?: ModelGatewayConfig;
  openai?: ModelProvider;
  ledger?: AppendOnlyJsonlLedger;
};

export async function completeOutreachLlm(
  input: {
    taskId: string;
    prompt: string;
    model: string;
  },
  deps: OutreachGatewayDeps = {},
): Promise<OutreachLlmCompletion> {
  const config = deps.config ?? buildOutreachGatewayConfig(input.model);

  if (!config.openaiApiKey?.trim()) {
    throw new OutreachCostBlockedError("openai_not_ready", "OPENAI_API_KEY is missing");
  }
  if (!config.openaiModel?.trim()) {
    throw new OutreachCostBlockedError("openai_model_required", "OpenAI model is required");
  }

  const ledger =
    deps.ledger ??
    new AppendOnlyJsonlLedger(config.ledgerPath);
  const gw = createModelGateway({
    config,
    ledger,
    openai: deps.openai,
  });

  try {
    const out = await gw.complete({
      taskId: input.taskId,
      prompt: input.prompt,
      maxOutputTokens: config.defaults.maxOutputTokens,
    });
    if (out.provider !== "openai") {
      throw new OutreachCostBlockedError(
        "provider_forbidden",
        `Unexpected provider ${out.provider}`,
      );
    }
    return {
      text: out.text,
      costEur: out.costEur,
      ms: out.ms,
      model: out.model,
      tokensIn: out.tokensIn,
      tokensOut: out.tokensOut,
      attempts: out.attempts,
    };
  } catch (err) {
    if (err instanceof OutreachCostBlockedError) throw err;
    if (err instanceof GatewayError) {
      throw new OutreachCostBlockedError(err.code, err.message);
    }
    throw err;
  }
}
