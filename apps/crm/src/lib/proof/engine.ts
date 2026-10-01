import { PROOF_BENCHMARKS } from "./constants";
import type { LeakModelResult, ProofAnswers, ProofReport, ProofRisk } from "./types";

export type LeakModelInput = {
  leadsPerMonth: number;
  responseMinutes: number;
  dealRatePercent: number;
};

/** Shared leak / recovery model (landing ROI + /proof). */
export function computeLeakModel(input: LeakModelInput): LeakModelResult {
  const responsePenalty = Math.min(
    input.responseMinutes / PROOF_BENCHMARKS.responsePenaltyCapMinutes,
    1,
  );
  const lostShare =
    PROOF_BENCHMARKS.lostShareBase + responsePenalty * PROOF_BENCHMARKS.lostShareResponseFactor;
  const currentDeals = (input.leadsPerMonth * input.dealRatePercent) / 100;
  const monthlyLeakEur = currentDeals * PROOF_BENCHMARKS.avgRevenuePerDeal * lostShare;
  const recoveredEur = monthlyLeakEur * PROOF_BENCHMARKS.proLiftShare;
  const projectedDeals = currentDeals + recoveredEur / PROOF_BENCHMARKS.avgRevenuePerDeal;

  return {
    monthlyLeakEur: Math.round(monthlyLeakEur),
    recoveredEur: Math.round(recoveredEur),
    projectedDeals: Math.round(projectedDeals * 10) / 10,
    lostShare,
    currentDeals,
  };
}

export function estimateLeadsWithoutFollowUp(
  leadsPerMonth: number,
  followUpRatePercent: number,
): number {
  const gap = Math.max(0, Math.min(100, followUpRatePercent));
  return Math.round(leadsPerMonth * (1 - gap / 100));
}

export function computeRevenueHealthScore(input: {
  responseMinutes: number;
  dealRatePercent: number;
  followUpRatePercent: number;
  lostShare: number;
}): number {
  const responseScore = Math.max(0, 100 - (input.responseMinutes / 360) * 100);
  const dealScore = Math.min(100, input.dealRatePercent * 5);
  const followUpScore = Math.max(0, Math.min(100, input.followUpRatePercent));
  const leakPenalty = input.lostShare * 35;
  const blended =
    responseScore * 0.35 + dealScore * 0.3 + followUpScore * 0.35 - leakPenalty;
  return Math.max(0, Math.min(100, Math.round(blended)));
}

function buildRisks(answers: ProofAnswers, leak: LeakModelResult): ProofRisk[] {
  const risks: ProofRisk[] = [];

  if (answers.responseMinutes > 120) {
    risks.push({
      id: "slow-response",
      title: "Pomalá prvá odpoveď",
      detail: `Pri ${answers.responseMinutes} min priemernej odpovedi benchmarky ukazujú vyšší únik dopytov.`,
      severity: answers.responseMinutes > 240 ? "high" : "medium",
    });
  }
  if (answers.followUpRatePercent < 60) {
    risks.push({
      id: "low-follow-up",
      title: "Nízky follow-up do 24 h",
      detail: `Odhad: ${estimateLeadsWithoutFollowUp(answers.leadsPerMonth, answers.followUpRatePercent)} dopytov mesačne bez včasného kontaktu.`,
      severity: answers.followUpRatePercent < 40 ? "high" : "medium",
    });
  }
  if (answers.dealRatePercent < 6) {
    risks.push({
      id: "low-conversion",
      title: "Nízka konverzia dopyt → obchod",
      detail: `Pri ${answers.dealRatePercent} % konverzii zostáva na stole provízia aj pri rovnakom objeme dopytov.`,
      severity: "medium",
    });
  }
  if (leak.monthlyLeakEur >= 3000) {
    risks.push({
      id: "high-leak",
      title: "Vysoký mesačný únik",
      detail: `Odhadovaný únik €${leak.monthlyLeakEur.toLocaleString("sk-SK")}/mes. z vašich odpovedí × trhové benchmarky.`,
      severity: leak.monthlyLeakEur >= 6000 ? "high" : "medium",
    });
  }
  if (risks.length === 0) {
    risks.push({
      id: "optimize",
      title: "Priestor na jemné doladenie",
      detail: "Základné parametre sú v norme — na deme ukážeme presné čísla z vašich dát.",
      severity: "low",
    });
  }
  return risks;
}

export const PROOF_DISCLAIMER =
  "Odhad z vašich odpovedí × benchmarky slovenského trhu. Presné čísla uvidíte na vlastných dátach v deme.";

export function computeProofReport(answers: ProofAnswers): ProofReport {
  const leak = computeLeakModel({
    leadsPerMonth: answers.leadsPerMonth,
    responseMinutes: answers.responseMinutes,
    dealRatePercent: answers.dealRatePercent,
  });
  const leadsWithoutFollowUpEstimate = estimateLeadsWithoutFollowUp(
    answers.leadsPerMonth,
    answers.followUpRatePercent,
  );
  const revenueHealthScore = computeRevenueHealthScore({
    responseMinutes: answers.responseMinutes,
    dealRatePercent: answers.dealRatePercent,
    followUpRatePercent: answers.followUpRatePercent,
    lostShare: leak.lostShare,
  });

  return {
    revenueHealthScore,
    leak,
    leadsWithoutFollowUpEstimate,
    metrics: [
      {
        id: "leak",
        label: "Odhad úniku mesačne",
        value: `€${leak.monthlyLeakEur.toLocaleString("sk-SK")}`,
        hint: PROOF_DISCLAIMER,
      },
      {
        id: "recovery",
        label: "Potenciálny zisk s AI follow-up",
        value: `+€${leak.recoveredEur.toLocaleString("sk-SK")}`,
        hint: "Model rovnaký ako na landing kalkulačke (22 % z úniku).",
      },
      {
        id: "deals",
        label: "Projekcia uzavretých obchodov",
        value: `${leak.projectedDeals} / mes.`,
        hint: "Pri zachovanom objeme dopytov a rýchlejšom kontakte.",
      },
      {
        id: "no-follow-up",
        label: "Leady bez follow-up (odhad pri vašom objeme)",
        value: String(leadsWithoutFollowUpEstimate),
        hint: `Z ${answers.leadsPerMonth} dopytov/mes. pri ${answers.followUpRatePercent} % follow-up do 24 h.`,
      },
    ],
    risks: buildRisks(answers, leak),
    disclaimer: PROOF_DISCLAIMER,
  };
}
