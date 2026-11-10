import type { GatewayProviderId } from "./types.ts";

const USD_TO_EUR = 0.92;

/** Operator snapshot — not a live vendor price list. Unknown pairs return null. */
const RATES_USD_PER_M: Partial<
  Record<GatewayProviderId, Record<string, { input: number; output: number }>>
> = {
  openai: {
    "gpt-4o": { input: 2.5, output: 10.0 },
    "gpt-4o-mini": { input: 0.15, output: 0.6 },
    "gpt-4.1": { input: 2.0, output: 8.0 },
    "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  },
  anthropic: {
    "claude-sonnet-4-20250514": { input: 3.0, output: 15.0 },
    "claude-3-5-haiku-latest": { input: 0.8, output: 4.0 },
    "claude-3-5-sonnet-latest": { input: 3.0, output: 15.0 },
  },
};

function toEur(usd: number): number {
  return Math.round(usd * USD_TO_EUR * 1_000_000) / 1_000_000;
}

export function estimateMaxCostEur(
  provider: GatewayProviderId,
  model: string,
  maxInputTokens: number,
  maxOutputTokens: number,
): number | null {
  const table = RATES_USD_PER_M[provider];
  if (!table) return null;
  const rates = table[model];
  if (!rates) return null;
  const usd =
    (maxInputTokens * rates.input + maxOutputTokens * rates.output) / 1_000_000;
  return toEur(usd);
}

export function actualCostEur(
  provider: GatewayProviderId,
  model: string,
  tokensIn: number,
  tokensOut: number,
): number | null {
  return estimateMaxCostEur(provider, model, tokensIn, tokensOut);
}
