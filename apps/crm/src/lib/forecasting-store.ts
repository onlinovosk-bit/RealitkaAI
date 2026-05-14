import { listLeads } from "@/lib/leads-store";
import { listTasks } from "@/lib/tasks-store";
import { listPersistedMatches } from "@/lib/matching-store";
import { listRecommendations } from "@/lib/recommendations-store";
import { calculateAllLeadScores } from "@/lib/ai-scoring-store";

function normalize(text: string) {
  return String(text || "").toLowerCase().trim();
}

export type DealHealthIssue = {
  leadId: string;
  leadName: string;
  kind: "after_deadline_open_tasks" | "high_value_no_tasks";
  probabilityPercent: number;
  openTasks: number;
  overdueOpenTasks: number;
  note: string;
};

function extractBudget(value: string) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits ? Number(digits) : 0;
}

function stageProbability(status: string) {
  const s = normalize(status);

  if (s.includes("ponuka")) return 0.72;
  if (s.includes("obhli")) return 0.48;
  if (s.includes("horu")) return 0.32;
  if (s.includes("tepl")) return 0.18;
  if (s.includes("nov")) return 0.08;

  return 0.1;
}

function scoreMultiplier(score: number) {
  if (score >= 90) return 1.35;
  if (score >= 75) return 1.2;
  if (score >= 60) return 1.0;
  if (score >= 45) return 0.8;
  return 0.55;
}

function recommendationBoost(recommendationCount: number) {
  if (recommendationCount >= 3) return 1.08;
  if (recommendationCount >= 1) return 1.03;
  return 1.0;
}

function taskPenalty(openTasks: number) {
  if (openTasks >= 4) return 0.85;
  if (openTasks >= 2) return 0.93;
  return 1.0;
}

function matchBoost(bestMatchScore: number) {
  if (bestMatchScore >= 85) return 1.18;
  if (bestMatchScore >= 70) return 1.1;
  if (bestMatchScore >= 50) return 1.03;
  return 0.92;
}

export async function getForecastingData() {
  const [leads, tasks, matches, recommendations, scores] = await Promise.all([
    listLeads(),
    listTasks(),
    listPersistedMatches(),
    listRecommendations(),
    calculateAllLeadScores(),
  ]);

  const scoreMap = new Map(scores.map((item) => [item.leadId, item]));
  const totalLeads = leads.length;

  const enriched = leads.map((lead) => {
    const leadScore = scoreMap.get(lead.id);
    const leadTasks = tasks.filter((task) => task.leadId === lead.id);
    const openTasks = leadTasks.filter((task) => normalize(task.status) !== "done").length;
    const leadMatches = matches
      .filter((match) => match.leadId === lead.id)
      .sort((a, b) => b.matchScore - a.matchScore);
    const bestMatchScore = leadMatches[0]?.matchScore ?? 0;
    const leadRecommendations = recommendations.filter((item) => item.leadId === lead.id);
    const budget = extractBudget(lead.budget);
    const expectedDealValue = budget > 0 ? budget : 180000;

    let probability =
      stageProbability(lead.status) *
      scoreMultiplier(leadScore?.score ?? lead.score ?? 50) *
      recommendationBoost(leadRecommendations.length) *
      taskPenalty(openTasks) *
      matchBoost(bestMatchScore);

    probability = Math.max(0.02, Math.min(0.95, probability));

    const weightedValue = expectedDealValue * probability;

    return {
      leadId: lead.id,
      leadName: lead.name,
      assignedAgent: lead.assignedAgent || "Nepriradeny",
      source: lead.source || "Neznamy zdroj",
      status: lead.status,
      aiScore: leadScore?.score ?? lead.score ?? 50,
      band: leadScore?.band ?? "medium",
      riskLevel: leadScore?.riskLevel ?? "normal",
      bestMatchScore,
      recommendationCount: leadRecommendations.length,
      openTasks,
      expectedDealValue,
      probability,
      weightedValue,
      location: lead.location,
    };
  });

  const expectedClosedDeals = enriched.reduce((sum, item) => sum + item.probability, 0);
  const expectedPipelineValue = enriched.reduce((sum, item) => sum + item.weightedValue, 0);
  const avgProbability =
    enriched.length > 0
      ? enriched.reduce((sum, item) => sum + item.probability, 0) / enriched.length
      : 0;

  const sourceMap = new Map<
    string,
    {
      source: string;
      count: number;
      avgScore: number;
      totalScore: number;
      expectedValue: number;
      criticalCount: number;
      opportunityCount: number;
    }
  >();

  for (const item of enriched) {
    const key = item.source || "Neznamy zdroj";
    const current = sourceMap.get(key) ?? {
      source: key,
      count: 0,
      avgScore: 0,
      totalScore: 0,
      expectedValue: 0,
      criticalCount: 0,
      opportunityCount: 0,
    };

    current.count += 1;
    current.totalScore += item.aiScore;
    current.expectedValue += item.weightedValue;
    if (item.band === "critical") current.criticalCount += 1;
    if (item.riskLevel === "opportunity") current.opportunityCount += 1;

    sourceMap.set(key, current);
  }

  const sourceBenchmarks = [...sourceMap.values()]
    .map((item) => ({
      source: item.source,
      count: item.count,
      avgScore: Math.round(item.totalScore / item.count),
      expectedValue: Math.round(item.expectedValue),
      criticalCount: item.criticalCount,
      opportunityCount: item.opportunityCount,
    }))
    .sort((a, b) => b.expectedValue - a.expectedValue);

  const agentMap = new Map<
    string,
    {
      agent: string;
      count: number;
      totalScore: number;
      expectedValue: number;
      hotCount: number;
      criticalCount: number;
      openTasks: number;
    }
  >();

  for (const item of enriched) {
    const key = item.assignedAgent || "Nepriradeny";
    const current = agentMap.get(key) ?? {
      agent: key,
      count: 0,
      totalScore: 0,
      expectedValue: 0,
      hotCount: 0,
      criticalCount: 0,
      openTasks: 0,
    };

    current.count += 1;
    current.totalScore += item.aiScore;
    current.expectedValue += item.weightedValue;
    current.openTasks += item.openTasks;

    if (normalize(item.status).includes("horu")) current.hotCount += 1;
    if (item.band === "critical") current.criticalCount += 1;

    agentMap.set(key, current);
  }

  const agentBenchmarks = [...agentMap.values()]
    .map((item) => ({
      agent: item.agent,
      count: item.count,
      avgScore: Math.round(item.totalScore / item.count),
      expectedValue: Math.round(item.expectedValue),
      hotCount: item.hotCount,
      criticalCount: item.criticalCount,
      openTasks: item.openTasks,
    }))
    .sort((a, b) => b.expectedValue - a.expectedValue);

  const stageMap = new Map<
    string,
    {
      stage: string;
      count: number;
      expectedValue: number;
      totalScore: number;
      avgProbability: number;
      probabilityAccumulator: number;
    }
  >();

  for (const item of enriched) {
    const key = item.status || "Neznamy stav";
    const current = stageMap.get(key) ?? {
      stage: key,
      count: 0,
      expectedValue: 0,
      totalScore: 0,
      avgProbability: 0,
      probabilityAccumulator: 0,
    };

    current.count += 1;
    current.expectedValue += item.weightedValue;
    current.totalScore += item.aiScore;
    current.probabilityAccumulator += item.probability;

    stageMap.set(key, current);
  }

  const stageBenchmarks = [...stageMap.values()]
    .map((item) => ({
      stage: item.stage,
      count: item.count,
      avgScore: Math.round(item.totalScore / item.count),
      avgProbability: Math.round((item.probabilityAccumulator / item.count) * 100),
      expectedValue: Math.round(item.expectedValue),
    }))
    .sort((a, b) => b.expectedValue - a.expectedValue);

  const topForecastLeads = enriched
    .sort((a, b) => b.weightedValue - a.weightedValue)
    .slice(0, 12);

  const overdueByLead = new Map<string, number>();
  const nowMs = Date.now();
  for (const t of tasks) {
    if (normalize(t.status) === "done" || !t.leadId) continue;
    if (t.dueAt && new Date(t.dueAt).getTime() < nowMs) {
      overdueByLead.set(t.leadId, (overdueByLead.get(t.leadId) ?? 0) + 1);
    }
  }

  const healthMap = new Map<string, DealHealthIssue>();
  for (const item of enriched) {
    const overdue = overdueByLead.get(item.leadId) ?? 0;
    if (overdue > 0) {
      healthMap.set(item.leadId, {
        leadId: item.leadId,
        leadName: item.leadName,
        kind: "after_deadline_open_tasks",
        probabilityPercent: Math.round(item.probability * 100),
        openTasks: item.openTasks,
        overdueOpenTasks: overdue,
        note: `${overdue} otvorená úloha po termíne`,
      });
    }
  }

  for (const item of enriched) {
    const st = normalize(item.status);
    if (
      (st.includes("obhliad") || st.includes("ponuk")) &&
      item.openTasks === 0 &&
      item.probability >= 0.35 &&
      !(overdueByLead.get(item.leadId) ?? 0)
    ) {
      if (!healthMap.has(item.leadId)) {
        healthMap.set(item.leadId, {
          leadId: item.leadId,
          leadName: item.leadName,
          kind: "high_value_no_tasks",
          probabilityPercent: Math.round(item.probability * 100),
          openTasks: 0,
          overdueOpenTasks: 0,
          note: "Pokročilá fáza bez otvorených úloh",
        });
      }
    }
  }

  const dealHealth = [...healthMap.values()]
    .sort((a, b) => b.overdueOpenTasks - a.overdueOpenTasks || b.probabilityPercent - a.probabilityPercent)
    .slice(0, 24);

  return {
    kpis: {
      totalLeads,
      expectedClosedDeals: Number(expectedClosedDeals.toFixed(2)),
      expectedPipelineValue: Math.round(expectedPipelineValue),
      avgProbabilityPercent: Math.round(avgProbability * 100),
    },
    sourceBenchmarks,
    agentBenchmarks,
    stageBenchmarks,
    topForecastLeads,
    dealHealth,
  };
}
