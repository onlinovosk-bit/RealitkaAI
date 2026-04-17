import type { Lead } from "@/lib/mock-data";
import type { AiEngineSnapshot } from "@/lib/ai/ai-engine-types";
import { getDealProbability } from "./probability";

export type MoneyForecastBreakdownSegment = {
  segment: "hot" | "warm" | "cold";
  count: number;
  expectedEur: number;
};

export type MonthlyMoneyForecast = {
  /** Suma očakávanej hodnoty (score × pravdepodobnosť × hodnota leadu). */
  totalExpectedEur: number;
  breakdown: MoneyForecastBreakdownSegment[];
  leadRows: Array<{
    leadId: string;
    name: string;
    scoreUsed: number;
    valueEur: number;
    probability: number;
    expectedEur: number;
  }>;
};

function extractBudgetEur(budget: string): number {
  const digits = String(budget || "").replace(/[^\d]/g, "");
  const n = digits ? Number(digits) : 0;
  return n > 0 ? n : 180_000;
}

function scoreForLead(lead: Lead & { ai_engine?: AiEngineSnapshot | null }): number {
  return lead.ai_engine?.combinedScore ?? lead.score ?? 0;
}

function segmentForScore(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

/**
 * Mesačný „koľko €“ odhad: Σ (hodnota leadu × pravdepodobnosť(skóre)).
 */
export function calculateMonthlyMoneyForecast(leads: Lead[]): MonthlyMoneyForecast {
  const leadRows: MonthlyMoneyForecast["leadRows"] = [];
  const segMap = {
    hot: { count: 0, expectedEur: 0 },
    warm: { count: 0, expectedEur: 0 },
    cold: { count: 0, expectedEur: 0 },
  };

  let totalExpectedEur = 0;

  for (const lead of leads) {
    const valueEur = extractBudgetEur(lead.budget);
    const scoreUsed = scoreForLead(lead as Lead & { ai_engine?: AiEngineSnapshot | null });
    const probability = getDealProbability(scoreUsed);
    const expectedEur = valueEur * probability;
    totalExpectedEur += expectedEur;

    const seg = segmentForScore(scoreUsed);
    segMap[seg].count += 1;
    segMap[seg].expectedEur += expectedEur;

    leadRows.push({
      leadId: lead.id,
      name: lead.name,
      scoreUsed,
      valueEur,
      probability,
      expectedEur,
    });
  }

  const breakdown: MoneyForecastBreakdownSegment[] = [
    { segment: "hot", count: segMap.hot.count, expectedEur: Math.round(segMap.hot.expectedEur) },
    { segment: "warm", count: segMap.warm.count, expectedEur: Math.round(segMap.warm.expectedEur) },
    { segment: "cold", count: segMap.cold.count, expectedEur: Math.round(segMap.cold.expectedEur) },
  ];

  return {
    totalExpectedEur: Math.round(totalExpectedEur),
    breakdown,
    leadRows,
  };
}

export function calculateTrend(current: number, previous: number): {
  diff: number;
  percent: number;
} {
  if (!Number.isFinite(current) || !Number.isFinite(previous)) {
    return { diff: 0, percent: 0 };
  }
  const diff = current - previous;
  if (previous === 0) {
    return { diff, percent: current > 0 ? 100 : 0 };
  }
  const percent = (diff / previous) * 100;
  return {
    diff: Math.round(diff),
    percent: Math.round(percent),
  };
}
