import type { SalesBrainSignals } from "./signals";

/**
 * AI Confidence Engine — istota výstupu z kvality signálov (0–100).
 */
export function calculateConfidence(signals: SalesBrainSignals): number {
  let confidence = 0;

  const signalCount = Object.values({
    opened: signals.emailOpened > 0,
    clicked: signals.emailClicked > 0,
    views: signals.propertyViews > 0,
    responded: signals.responded,
    viewing: signals.scheduledViewing,
    fresh: signals.daysSinceLastContact <= 3,
  }).filter(Boolean).length;

  confidence += Math.min(signalCount * 10, 50);

  if (signals.responded) confidence += 20;
  if (signals.scheduledViewing) confidence += 20;

  if (signals.daysSinceLastContact > 5) confidence -= 10;
  if (signals.daysSinceLastContact > 14) confidence -= 10;

  return Math.max(0, Math.min(100, Math.round(confidence)));
}

export function confidenceTier(confidence: number): "vysoká" | "stredná" | "nízka" {
  if (confidence >= 72) return "vysoká";
  if (confidence >= 45) return "stredná";
  return "nízka";
}
