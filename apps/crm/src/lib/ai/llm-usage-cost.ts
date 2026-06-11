import { CLAUDE_HAIKU, CLAUDE_SONNET } from './claude'

const USD_TO_EUR = 0.92

const CLAUDE_RATES_USD_PER_M: Record<string, { input: number; output: number }> = {
  [CLAUDE_HAIKU]: { input: 0.8, output: 4.0 },
  [CLAUDE_SONNET]: { input: 3.0, output: 15.0 },
}

function claudeRates(model: string) {
  if (CLAUDE_RATES_USD_PER_M[model]) return CLAUDE_RATES_USD_PER_M[model]
  if (model.includes('haiku')) return CLAUDE_RATES_USD_PER_M[CLAUDE_HAIKU]
  return CLAUDE_RATES_USD_PER_M[CLAUDE_SONNET]
}

export function estimateClaudeCostEur(
  model: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const rates = claudeRates(model)
  const usd = (inputTokens * rates.input + outputTokens * rates.output) / 1_000_000
  return Math.round(usd * USD_TO_EUR * 10_000) / 10_000
}
