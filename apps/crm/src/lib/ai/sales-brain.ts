import { calculateLeadAiScore } from "@/lib/ai-scoring";
import { calculateConfidence, confidenceTier } from "./confidence";
import { calculateMultiModelParts, calculateMultiModelScore, multiModelLabels } from "./multi-model";
import { getDataset } from "./learning-store";
import { calculateLeadScore } from "./scoring-engine";
import {
  buildSalesBrainSignals,
  salesBrainSignalsToWeightedRecord,
  type SalesBrainSignals,
} from "./signals";
import { predictTimeToClose, timeToCloseHint } from "./time-to-close";

type LeadLike = Parameters<typeof calculateLeadAiScore>[0]["lead"] & { lastContact?: string };
type MatchLike = Parameters<typeof calculateLeadAiScore>[0]["matches"][number];
type RecommendationLike = Parameters<typeof calculateLeadAiScore>[0]["recommendations"][number];
type TaskLike = Parameters<typeof calculateLeadAiScore>[0]["tasks"][number];
type MessageLike = Parameters<typeof calculateLeadAiScore>[0]["messages"][number];

export type AISalesBrainProfile = {
  engineVersion: "v2";
  score: number;
  legacyScore: number;
  multiModelScore: number;
  weightedSignalScore: number;
  confidence: number;
  confidenceTier: ReturnType<typeof confidenceTier>;
  timeToCloseDays: number;
  timeToCloseHint: string;
  breakdown: ReturnType<typeof calculateMultiModelParts>;
  breakdownLabels: ReturnType<typeof multiModelLabels>;
  explainability: string[];
  nextBestAction: string;
  selfLearning: {
    outcomeSamples: number;
    note: string;
  };
};

function buildExplainability(
  signals: SalesBrainSignals,
  legacyReasons: string[],
  breakdownLabels: ReturnType<typeof multiModelLabels>
): string[] {
  const lines: string[] = [];

  if (signals.responded) lines.push("Klient reaguje na komunikáciu.");
  if (signals.scheduledViewing) lines.push("Pipeline signalizuje obhliadku alebo ponuku.");
  if (signals.propertyViews > 3) lines.push("Aktívne vyhľadávanie nehnuteľností / záujem.");
  if (signals.emailOpened > 0 || signals.emailClicked > 0) {
    lines.push("Engagement cez email / outreach.");
  }
  if (signals.daysSinceLastContact <= 2) {
    lines.push("Čerstvý kontakt — dobré načasovanie.");
  } else if (signals.daysSinceLastContact > 7) {
    lines.push("Dlhšia medzera od posledného kontaktu — treba obnoviť záujem.");
  }

  lines.push(
    `Segmenty: engagement ${breakdownLabels.engagement}, intent ${breakdownLabels.intent}, timing ${breakdownLabels.timing}.`
  );

  for (const r of legacyReasons.slice(0, 4)) {
    if (!lines.some((l) => l.includes(r))) lines.push(r.charAt(0).toUpperCase() + r.slice(1));
  }

  return lines.slice(0, 8);
}

/**
 * REVOLIS AI Sales Brain v2 — kombinuje CRM heuristiku, multi-model a váhované signály (self-learning).
 */
export function generateAISalesBrainProfile(input: {
  lead: LeadLike;
  matches: MatchLike[];
  recommendations: RecommendationLike[];
  tasks: TaskLike[];
  messages: MessageLike[];
}): AISalesBrainProfile {
  const legacy = calculateLeadAiScore(input);
  const signals = buildSalesBrainSignals(input);
  const multiModelScore = calculateMultiModelScore(signals);
  const weightedSignalScore = calculateLeadScore(salesBrainSignalsToWeightedRecord(signals));

  const score = Math.round(legacy.score * 0.45 + multiModelScore * 0.35 + weightedSignalScore * 0.2);

  const confidence = calculateConfidence(signals);
  const ttc = predictTimeToClose(signals);
  const parts = calculateMultiModelParts(signals);
  const breakdownLabels = multiModelLabels(signals, parts);

  const explainability = buildExplainability(signals, legacy.reasons, breakdownLabels);

  const samples = getDataset().length;
  const selfLearning = {
    outcomeSamples: samples,
    note:
      samples >= 8
        ? "Auto-tune má dostatok vzoriek na jemné úpravy váh signálov."
        : `Self-learning: zhromažďujú sa výsledky (aktuálne ${samples} vzoriek, minimum 8 pre auto-tune).`,
  };

  return {
    engineVersion: "v2",
    score: Math.max(0, Math.min(100, score)),
    legacyScore: legacy.score,
    multiModelScore,
    weightedSignalScore,
    confidence,
    confidenceTier: confidenceTier(confidence),
    timeToCloseDays: ttc,
    timeToCloseHint: timeToCloseHint(ttc),
    breakdown: parts,
    breakdownLabels,
    explainability,
    nextBestAction: legacy.nextBestAction,
    selfLearning,
  };
}

export type { SalesBrainSignals } from "./signals";
