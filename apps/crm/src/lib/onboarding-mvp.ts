export type OnboardingChecklist = {
  connectedCrm: boolean;
  importedLeads: boolean;
  configuredTeam: boolean;
  firstAutomationLive: boolean;
  firstAiBriefViewed: boolean;
  firstMeetingBooked: boolean;
};

export const DEFAULT_CHECKLIST: OnboardingChecklist = {
  connectedCrm: false,
  importedLeads: false,
  configuredTeam: false,
  firstAutomationLive: false,
  firstAiBriefViewed: false,
  firstMeetingBooked: false,
};

export function normalizeChecklist(raw: Partial<OnboardingChecklist> | null | undefined): OnboardingChecklist {
  return {
    connectedCrm: Boolean(raw?.connectedCrm),
    importedLeads: Boolean(raw?.importedLeads),
    configuredTeam: Boolean(raw?.configuredTeam),
    firstAutomationLive: Boolean(raw?.firstAutomationLive),
    firstAiBriefViewed: Boolean(raw?.firstAiBriefViewed),
    firstMeetingBooked: Boolean(raw?.firstMeetingBooked),
  };
}

export function computeReadinessScore(checklist: OnboardingChecklist): number {
  const weighted: Array<[keyof OnboardingChecklist, number]> = [
    ["connectedCrm", 20],
    ["importedLeads", 20],
    ["configuredTeam", 15],
    ["firstAutomationLive", 20],
    ["firstAiBriefViewed", 10],
    ["firstMeetingBooked", 15],
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

