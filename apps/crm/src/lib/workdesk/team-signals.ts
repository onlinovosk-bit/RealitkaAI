import type { Lead } from "@/lib/leads-store";

export type TeamAgentSignal = {
  agentKey: string;
  agentName: string;
  action: string;
  riskEur: number;
  staleLeads: number;
  hotLeads: number;
  leadsCount: number;
  urgency: "critical" | "high" | "medium";
};

type TeamLead = Pick<
  Lead,
  "id" | "assignedAgent" | "assignedProfileId" | "status" | "score" | "budget" | "lastContact"
>;

type TeamProfile = {
  id: string;
  fullName: string;
};

function parseBudgetCommission(budget: string): number {
  const digits = budget.replace(/[^\d]/g, "");
  if (!digits) return 0;
  const value = Number(digits);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 0.03);
}

function daysSinceContact(lastContact: string): number {
  const raw = lastContact.trim();
  if (!raw || raw === "Bez kontaktu" || raw === "Práve vytvorený") return 999;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return 999;
  return Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24));
}

function resolveAgentKey(lead: TeamLead): string {
  if (lead.assignedProfileId) return lead.assignedProfileId;
  return lead.assignedAgent?.trim() || "unassigned";
}

function resolveAgentName(key: string, profiles: TeamProfile[], fallbackName?: string): string {
  const profile = profiles.find((p) => p.id === key);
  if (profile) return profile.fullName;
  if (fallbackName && fallbackName !== "Nepriradený") return fallbackName;
  return "Nepriradený maklér";
}

export function buildTeamAgentSignals(
  leads: TeamLead[],
  profiles: TeamProfile[],
  monthlyTargetPerAgent = 15,
): TeamAgentSignal[] {
  const grouped = new Map<string, TeamLead[]>();

  for (const lead of leads) {
    const key = resolveAgentKey(lead);
    const bucket = grouped.get(key) ?? [];
    bucket.push(lead);
    grouped.set(key, bucket);
  }

  const signals: TeamAgentSignal[] = [];

  for (const [agentKey, agentLeads] of grouped) {
    if (agentKey === "unassigned" || agentLeads.length === 0) continue;

    const hotLeads = agentLeads.filter((l) => l.status === "Horúci" || l.score >= 75);
    const staleLeads = agentLeads.filter((l) => daysSinceContact(l.lastContact) >= 5);
    const pipelineLeads = agentLeads.filter((l) => l.status === "Obhliadka" || l.status === "Ponuka");
    const closedLike = agentLeads.filter((l) => l.status === "Ponuka").length;

    const riskEur = staleLeads.reduce((sum, l) => sum + parseBudgetCommission(l.budget), 0);
    const belowTarget = agentLeads.length < monthlyTargetPerAgent;
    const losingPipeline = pipelineLeads.length > 0 && staleLeads.length >= 2;

    let urgency: TeamAgentSignal["urgency"] = "medium";
    if (losingPipeline || (hotLeads.length >= 2 && staleLeads.length >= 2)) urgency = "critical";
    else if (belowTarget || staleLeads.length > 0 || hotLeads.length > closedLike) urgency = "high";

    let action = "Skontroluj pipeline a priraď follow-up";
    if (losingPipeline) action = "Obhliadky/ponuky bez kontaktu — okamžitý zásah majiteľa";
    else if (hotLeads.length > 0 && staleLeads.length > 0) action = "Horúce leady chladnú — presuň na call blok dnes";
    else if (belowTarget) action = "Pod cieľom príležitostí — aktivuj akvizíciu a radar";

    signals.push({
      agentKey,
      agentName: resolveAgentName(agentKey, profiles, agentLeads[0]?.assignedAgent),
      action,
      riskEur,
      staleLeads: staleLeads.length,
      hotLeads: hotLeads.length,
      leadsCount: agentLeads.length,
      urgency,
    });
  }

  return signals
    .sort((a, b) => {
      const score = (s: TeamAgentSignal) =>
        (s.urgency === "critical" ? 100 : s.urgency === "high" ? 60 : 20) + s.riskEur + s.staleLeads * 500;
      return score(b) - score(a);
    })
    .slice(0, 3);
}

export function buildTeamRiskHeadline(signals: TeamAgentSignal[]): { headline: string; subline: string } {
  if (signals.length === 0) {
    return {
      headline: "Tím drží tempo",
      subline: "Sleduj konverziu a reakčný čas maklérov tento týždeň",
    };
  }

  const top = signals[0];
  const totalRisk = signals.reduce((sum, s) => sum + s.riskEur, 0);

  return {
    headline: `${top.agentName} stráca momentum — €${totalRisk.toLocaleString("sk-SK")} v riziku`,
    subline: `${top.staleLeads} leadov bez kontaktu · ${top.hotLeads} horúcich bez posunu`,
  };
}
