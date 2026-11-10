import { estimateMaxCostEur } from "./pricing.ts";
import type { ModelGatewayConfig } from "./config.ts";
import type { GatewayProviderId } from "./types.ts";
import { GatewayError } from "./types.ts";
import type { SpendSummary } from "./ledger.ts";

export interface PreflightInput {
  provider: GatewayProviderId;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  taskMaxCostEur: number;
  spent: SpendSummary;
}

export function preflightCost(config: ModelGatewayConfig, input: PreflightInput): number {
  if (input.provider === "xai") {
    throw new GatewayError("xai_disabled", "xAI paid fallback is disabled");
  }
  if (input.provider === "gemini" || input.provider === "deepseek") {
    throw new GatewayError("provider_not_configured", `${input.provider} is not configured for paid calls`);
  }
  const estimate = estimateMaxCostEur(
    input.provider,
    input.model,
    input.maxInputTokens,
    input.maxOutputTokens,
  );
  if (estimate === null) {
    throw new GatewayError("unknown_price", `No verified EUR price for ${input.provider}:${input.model}`);
  }
  if (estimate > input.taskMaxCostEur) {
    throw new GatewayError(
      "task_budget",
      `Estimated max ${estimate} EUR exceeds task limit ${input.taskMaxCostEur} EUR`,
    );
  }
  if (input.spent.dailyEur + estimate > config.limits.dailyEur) {
    throw new GatewayError("daily_budget", "Daily EUR limit would be exceeded");
  }
  if (input.spent.monthlyEur + estimate > config.limits.monthlyEur) {
    throw new GatewayError("monthly_budget", "Monthly EUR limit would be exceeded");
  }
  return estimate;
}
