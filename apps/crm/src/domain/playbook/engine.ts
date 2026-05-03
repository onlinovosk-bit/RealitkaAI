// src/domain/playbook/engine.ts

import { computeBuyerReadiness } from "@/domain/buyer-readiness/engine";
import type { LeadSnapshot, LeadActivity, PlaybookAction, PlaybookActionType } from "./types";

export interface BuildPlaybookOptions {
  threshold?: number; // default 70
}

/**
 * Čistý domain engine - žiadny Supabase, žiadne DTO.
 * Input: lead snapshots + aktivity.
 * Output: PlaybookAction[] zoradené podľa buyerScore DESC.
 */
function resolveActionType(
  segment: string,
  status: string | null
): PlaybookActionType {
  if (status === "Ponuka" || status === "Obhliadka") return "CALL";
  if (segment === "HOT_NOW") return "CALL";
  if (segment === "HIGH_PRIORITY") return "MESSAGE";
  if (segment === "NURTURE") return "OPPORTUNITY";
  return "RISK";
}

export function buildPlaybook(
  leads: LeadSnapshot[],
  activities: LeadActivity[],
  options: BuildPlaybookOptions = {}
): PlaybookAction[] {
  const threshold = options.threshold ?? 70;

  // Zoskupíme aktivity podľa leadId pre efektívny lookup
  const activitiesByLead = new Map<string, LeadActivity[]>();
  for (const activity of activities) {
    const existing = activitiesByLead.get(activity.leadId) ?? [];
    activitiesByLead.set(activity.leadId, [...existing, activity]);
  }

  const actions: PlaybookAction[] = [];

  for (const lead of leads) {
    const leadActivities = activitiesByLead.get(lead.id) ?? [];

    const bri = computeBuyerReadiness(
      leadActivities.map((a) => ({
        id: a.id,
        type: a.type,
        source: a.source,
        severity: a.severity,
        createdAt: a.createdAt,
      })),
      {
        status: lead.status ?? "Nový",
        score: lead.score ?? 0,
        budget: lead.budget ?? undefined,
        propertyType: lead.propertyType ?? undefined,
        rooms: lead.rooms ?? undefined,
        lastContactAt: lead.lastContactAt ?? undefined,
        createdAt: lead.createdAt ?? undefined,
      },
      { firstSeenAt: lead.createdAt ?? undefined }
    );

    if (bri.totalScore < threshold) continue;

    actions.push({
      leadId: lead.id,
      type: resolveActionType(bri.segment, lead.status),
      buyerName: lead.name,
      buyerScore: bri.totalScore,
      segment: bri.segment,
      status: lead.status,
      mainReason: bri.reasons[0] ?? `BRI ${bri.totalScore}/100`,
    });
  }

  // zoradenie podľa buyerScore DESC
  actions.sort((a, b) => b.buyerScore - a.buyerScore);

  return actions;
}
