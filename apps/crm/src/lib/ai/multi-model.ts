import type { SalesBrainSignals } from "./signals";

export type MultiModelBreakdown = {
  engagement: number;
  intent: number;
  timing: number;
  behavioral: number;
};

function labelEngagement(raw: number): string {
  if (raw >= 18) return "vysoký";
  if (raw >= 10) return "stredný";
  return "nízky";
}

function labelIntent(raw: number): string {
  if (raw >= 24) return "veľmi vysoký";
  if (raw >= 16) return "vysoký";
  if (raw >= 8) return "stredný";
  return "nízky";
}

function labelTiming(s: SalesBrainSignals): string {
  if (s.daysSinceLastContact < 2) return "ideálny";
  if (s.daysSinceLastContact <= 5) return "vhodný";
  return "oneskorený";
}

function labelBehavioral(s: SalesBrainSignals): string {
  return s.scheduledViewing ? "aktívny záujem (obhliadka / ponuka)" : "čaká na aktiváciu";
}

/**
 * Multi-model scoring — segmentové „mozgy“ (0–100 každý komponent pred agregáciou).
 */
export function calculateMultiModelParts(signals: SalesBrainSignals): MultiModelBreakdown {
  const engagementRaw = signals.emailOpened * 2 + signals.emailClicked * 3;
  const intentRaw = signals.propertyViews * 2 + (signals.responded ? 10 : 0);
  const timingDisplay =
    signals.daysSinceLastContact < 2 ? 92 : signals.daysSinceLastContact <= 5 ? 68 : 38;
  const behavioralDisplay = signals.scheduledViewing ? 95 : 22;

  return {
    engagement: Math.max(0, Math.min(100, engagementRaw)),
    intent: Math.max(0, Math.min(100, intentRaw)),
    timing: timingDisplay,
    behavioral: behavioralDisplay,
  };
}

/** Jeden agregovaný multi-model skóre 0–100 (pôvodná heuristika zo špecifikácie). */
export function calculateMultiModelScore(signals: SalesBrainSignals): number {
  const engagement = signals.emailOpened * 2 + signals.emailClicked * 3;
  const intent = signals.propertyViews * 2 + (signals.responded ? 10 : 0);
  const timing = signals.daysSinceLastContact < 2 ? 10 : -5;
  const behavioral = signals.scheduledViewing ? 20 : 0;

  const total = engagement + intent + timing + behavioral;
  return Math.max(0, Math.min(100, Math.round(total)));
}

export function multiModelLabels(signals: SalesBrainSignals, parts: MultiModelBreakdown) {
  return {
    engagement: labelEngagement(parts.engagement),
    intent: labelIntent(parts.intent),
    timing: labelTiming(signals),
    behavioral: labelBehavioral(signals),
  };
}
