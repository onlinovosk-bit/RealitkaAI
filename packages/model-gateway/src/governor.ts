import { estimateMaxCostEur } from "./pricing.ts";
import type { ModelGatewayConfig } from "./config.ts";
import type { GatewayPriority, GatewayProjectId, GatewayProviderId } from "./types.ts";
import { GatewayError } from "./types.ts";
import type { SpendSummary } from "./ledger.ts";

export interface PreflightInput {
  provider: GatewayProviderId;
  model: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  taskMaxCostEur: number;
  spent: SpendSummary;
  /** False when the ledger or usage store could not be read. Fail closed. */
  usageReadable?: boolean;
  projectId?: GatewayProjectId;
  priority?: GatewayPriority;
  /** Defaults to `spent.monthlyEur` — the one shared pool, not a per-project sum. */
  poolSpentEur?: number;
  projectSpentEur?: number;
}

export type PreflightDecision =
  | { decision: "ALLOW"; code: "within_limit"; reason: string; estimateEur: number }
  | { decision: "BLOCK"; code: string; reason: string; estimateEur: number | null }
  | { decision: "DEFER"; code: "deferred"; reason: string; estimateEur: number };

function block(code: string, reason: string, estimateEur: number | null): PreflightDecision {
  return { decision: "BLOCK", code, reason, estimateEur };
}

function projectCap(config: ModelGatewayConfig, project: GatewayProjectId): number {
  if (project === "revolis") return config.budgets.revolisEur;
  if (project === "onlinovo") return config.budgets.onlinovoEur;
  return config.budgets.otherEur;
}

/**
 * Single preflight used by the gateway. Budgets come from `ModelGatewayConfig`.
 * xAI stays disabled. Unreadable usage is BLOCK, never an allow on zeros.
 */
export function decidePreflight(config: ModelGatewayConfig, input: PreflightInput): PreflightDecision {
  if (input.usageReadable === false) {
    return block("ledger_unavailable", "Usage store could not be read", null);
  }
  if (input.provider === "xai") {
    return block("xai_disabled", "xAI paid fallback is disabled", null);
  }
  if (input.provider === "gemini" || input.provider === "deepseek") {
    return block("provider_not_configured", `${input.provider} is not configured for paid calls`, null);
  }
  const estimate = estimateMaxCostEur(
    input.provider,
    input.model,
    input.maxInputTokens,
    input.maxOutputTokens,
  );
  if (estimate === null) {
    return block("unknown_price", `No verified EUR price for ${input.provider}:${input.model}`, null);
  }
  if (estimate > input.taskMaxCostEur) {
    return block(
      "task_budget",
      `Estimated max ${estimate} EUR exceeds task limit ${input.taskMaxCostEur} EUR`,
      estimate,
    );
  }
  if (input.spent.dailyEur + estimate > config.limits.dailyEur) {
    return block("daily_budget", "Daily EUR limit would be exceeded", estimate);
  }
  const poolSpent = input.poolSpentEur ?? input.spent.monthlyEur;
  if (poolSpent + estimate > config.limits.monthlyEur) {
    return block("monthly_budget", "Monthly EUR limit would be exceeded", estimate);
  }
  const project = input.projectId ?? "other";
  const projectSpent =
    input.projectSpentEur ?? input.spent.monthlyByProject?.[project] ?? 0;
  const cap = projectCap(config, project);
  if (projectSpent + estimate > cap) {
    return block("project_budget", `Project ${project} budget would be exceeded`, estimate);
  }
  const priority = input.priority ?? "normal";
  const remainingAfter = config.limits.monthlyEur - poolSpent - estimate;
  if (priority !== "urgent" && remainingAfter < config.budgets.urgentReserveEur) {
    return {
      decision: "DEFER",
      code: "deferred",
      reason: "Non-urgent work is queued; remaining capacity is the urgent reserve",
      estimateEur: estimate,
    };
  }
  return {
    decision: "ALLOW",
    code: "within_limit",
    reason: "within configured governor limits",
    estimateEur: estimate,
  };
}

export function preflightCost(config: ModelGatewayConfig, input: PreflightInput): number {
  const decision = decidePreflight(config, input);
  if (decision.decision === "ALLOW") return decision.estimateEur;
  throw new GatewayError(decision.code, decision.reason);
}
