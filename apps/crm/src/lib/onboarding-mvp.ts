export type OnboardingChecklist = {
  connectedCrm: boolean;
  importedLeads: boolean;
  configuredTeam: boolean;
  firstAutomationLive: boolean;
  firstAiBriefViewed: boolean;
  firstMeetingBooked: boolean;
  pipelineConfigured: boolean;
  goalsDefined: boolean;
};

export const DEFAULT_CHECKLIST: OnboardingChecklist = {
  connectedCrm: false,
  importedLeads: false,
  configuredTeam: false,
  firstAutomationLive: false,
  firstAiBriefViewed: false,
  firstMeetingBooked: false,
  pipelineConfigured: false,
  goalsDefined: false,
};

export function normalizeChecklist(raw: Partial<OnboardingChecklist> | null | undefined): OnboardingChecklist {
  return {
    connectedCrm: Boolean(raw?.connectedCrm),
    importedLeads: Boolean(raw?.importedLeads),
    configuredTeam: Boolean(raw?.configuredTeam),
    firstAutomationLive: Boolean(raw?.firstAutomationLive),
    firstAiBriefViewed: Boolean(raw?.firstAiBriefViewed),
    firstMeetingBooked: Boolean(raw?.firstMeetingBooked),
    pipelineConfigured: Boolean(raw?.pipelineConfigured),
    goalsDefined: Boolean(raw?.goalsDefined),
  };
}

export function computeReadinessScore(checklist: OnboardingChecklist): number {
  const weighted: Array<[keyof OnboardingChecklist, number]> = [
    ["connectedCrm", 18],
    ["importedLeads", 18],
    ["configuredTeam", 12],
    ["firstAutomationLive", 17],
    ["firstAiBriefViewed", 10],
    ["firstMeetingBooked", 10],
    ["pipelineConfigured", 10],
    ["goalsDefined", 5],
  ];

  const score = weighted.reduce((sum, [key, weight]) => (checklist[key] ? sum + weight : sum), 0);
  return Math.max(0, Math.min(100, score));
}

export function getRiskLabel(readiness: number, lastActivityAt?: string | null): "high" | "medium" | "low" {
  const daysWithoutActivity = lastActivityAt
    ? Math.floor((Date.now() - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (readiness < 50 || daysWithoutActivity >= 7) return "high";
  if (readiness < 75 || daysWithoutActivity >= 4) return "medium";
  return "low";
}

