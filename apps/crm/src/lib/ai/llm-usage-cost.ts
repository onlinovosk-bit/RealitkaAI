import { CLAUDE_HAIKU, CLAUDE_SONNET } from "./claude";

export const RETAIL_EUR_PER_CREDIT = 0.86;

const USD_TO_EUR = 0.92;

const CLAUDE_RATES_USD_PER_M: Record<string, { input: number; output: number }> = {
  [CLAUDE_HAIKU]: { input: 0.8, output: 4.0 },
  [CLAUDE_SONNET]: { input: 3.0, output: 15.0 },
};

const OPENAI_RATES_USD_PER_M: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10.0 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
};

function claudeRates(model: string) {
  if (CLAUDE_RATES_USD_PER_M[model]) return CLAUDE_RATES_USD_PER_M[model];
  if (model.includes("haiku")) return CLAUDE_RATES_USD_PER_M[CLAUDE_HAIKU];
  return CLAUDE_RATES_USD_PER_M[CLAUDE_SONNET];
}

function openaiRates(model: string) {
  if (OPENAI_RATES_USD_PER_M[model]) return OPENAI_RATES_USD_PER_M[model];
  if (model.includes("mini")) return OPENAI_RATES_USD_PER_M["gpt-4o-mini"];
  return OPENAI_RATES_USD_PER_M["gpt-4o"];
}

function toEur(usd: number): number {
  return Math.round(usd * USD_TO_EUR * 10_000) / 10_000;
}

export function estimateClaudeCostEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = claudeRates(model);
  const usd = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  return toEur(usd);
}

export function estimateOpenAiCostEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = openaiRates(model);
  const usd = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000;
  return toEur(usd);
}

export function estimateOpenAiCostFromTotalTokens(
  model: string,
  totalTokens: number,
): number {
  if (!totalTokens) return 0;
  const inputTokens = Math.round(totalTokens * 0.7);
  return estimateOpenAiCostEur(model, inputTokens, totalTokens - inputTokens);
}
