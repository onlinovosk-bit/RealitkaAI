import type { GatewayProviderId } from "./types.ts";

/**
 * Project slices of the single monthly governor ceiling, plus the EUR that
 * stays reserved for urgent work. These numbers are operator policy.
 * They are not a vendor invoice and they are not a second pool of money.
 */
export interface ProjectBudgets {
  revolisEur: number;
  onlinovoEur: number;
  otherEur: number;
  urgentReserveEur: number;
}

export interface ModelGatewayConfig {
  primaryProvider: GatewayProviderId;
  openaiModel: string | null;
  anthropicModel: string | null;
  openaiApiKey: string | null;
  anthropicApiKey: string | null;
  anthropicFallbackEnabled: boolean;
  xaiEnabled: boolean;
  limits: {
    perTaskEur: number;
    dailyEur: number;
    monthlyEur: number;
  };
  /** Read by `preflightCost`. Not a parallel policy engine. */
  budgets: ProjectBudgets;
  defaults: {
    maxInputTokens: number;
    maxOutputTokens: number;
  };
  maxAttempts: number;
  ledgerPath: string;
  langfuse?: {
    publicKey: string;
    secretKey: string;
    baseUrl: string;
  };
}

function readBool(raw: string | undefined, defaultValue: boolean): boolean {
  if (raw === undefined || raw === "") return defaultValue;
  const normalized = raw.trim().toLowerCase();
  if (normalized === "1" || normalized === "true" || normalized === "yes") return true;
  if (normalized === "0" || normalized === "false" || normalized === "no") return false;
  return defaultValue;
}

function readPositiveNumber(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) return fallback;
  return value;
}

export function loadConfigFromEnv(env: NodeJS.ProcessEnv = process.env): ModelGatewayConfig {
  const openaiModel =
    env.MODEL_GATEWAY_OPENAI_MODEL?.trim() ||
    env.OPENAI_MODEL?.trim() ||
    null;
  const anthropicModel =
    env.MODEL_GATEWAY_ANTHROPIC_MODEL?.trim() ||
    env.ANTHROPIC_MODEL?.trim() ||
    null;

  const langfusePublic = env.LANGFUSE_PUBLIC_KEY?.trim();
  const langfuseSecret = env.LANGFUSE_SECRET_KEY?.trim();
  const langfuseBase = env.LANGFUSE_BASE_URL?.trim() || "https://cloud.langfuse.com";

  return {
    primaryProvider: "openai",
    openaiModel,
    anthropicModel,
    openaiApiKey: env.OPENAI_API_KEY?.trim() || null,
    anthropicApiKey: env.ANTHROPIC_API_KEY?.trim() || null,
    anthropicFallbackEnabled: readBool(env.MODEL_GATEWAY_ANTHROPIC_FALLBACK_ENABLED, false),
    xaiEnabled: false,
    limits: {
      perTaskEur: readPositiveNumber(env.MODEL_GATEWAY_PER_TASK_LIMIT_EUR, 0.25),
      dailyEur: readPositiveNumber(env.MODEL_GATEWAY_DAILY_LIMIT_EUR, 2.0),
      monthlyEur: readPositiveNumber(env.MODEL_GATEWAY_MONTHLY_LIMIT_EUR, 25.0),
    },
    budgets: {
      revolisEur: readPositiveNumber(env.MODEL_GATEWAY_BUDGET_REVOLIS_EUR, 15),
      onlinovoEur: readPositiveNumber(env.MODEL_GATEWAY_BUDGET_ONLINOVO_EUR, 7),
      otherEur: readPositiveNumber(env.MODEL_GATEWAY_BUDGET_OTHER_EUR, 3),
      urgentReserveEur: readPositiveNumber(env.MODEL_GATEWAY_URGENT_RESERVE_EUR, 1),
    },
    defaults: {
      maxInputTokens: readPositiveNumber(env.MODEL_GATEWAY_MAX_INPUT_TOKENS, 4096),
      maxOutputTokens: readPositiveNumber(env.MODEL_GATEWAY_MAX_OUTPUT_TOKENS, 1024),
    },
    maxAttempts: readPositiveNumber(env.MODEL_GATEWAY_MAX_ATTEMPTS, 3),
    ledgerPath:
      env.MODEL_GATEWAY_LEDGER_PATH?.trim() ||
      "var/model-gateway/ledger.jsonl",
    ...(langfusePublic && langfuseSecret
      ? {
          langfuse: {
            publicKey: langfusePublic,
            secretKey: langfuseSecret,
            baseUrl: langfuseBase,
          },
        }
      : {}),
  };
}
