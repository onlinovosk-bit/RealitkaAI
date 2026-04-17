import type { AISalesBrainProfile } from "./sales-brain";

export type AutopilotActionType = "call" | "urgent_followup" | "nurture_campaign";

export type AutopilotAction = {
  type: AutopilotActionType;
  priority: "critical" | "high" | "medium" | "low";
  reason: string;
};

/**
 * Rule engine: signály z AI Sales Brain profilu → zoznam akcií.
 */
export function getAutopilotActions(profile: AISalesBrainProfile): AutopilotAction[] {
  const actions: AutopilotAction[] = [];

  if (profile.score > 80 && profile.confidence > 70) {
    actions.push({
      type: "call",
      priority: "high",
      reason: "Vysoká pravdepodobnosť konverzie",
    });
  }

  if (profile.timeToCloseDays < 7) {
    actions.push({
      type: "urgent_followup",
      priority: "critical",
      reason: "Blízko uzavretia",
    });
  }

  if (profile.score < 40) {
    actions.push({
      type: "nurture_campaign",
      priority: "low",
      reason: "Nízky záujem",
    });
  }

  return actions;
}
