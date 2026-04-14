// AI Insights personalization (demo version)
type InsightSortable = {
  impact?: "high" | "medium" | "low" | string;
  recommendedChannel?: "call" | "email" | "sms" | "meeting" | string;
};

type UserProfile = {
  role?: string;
  preferredChannel?: string;
};

export function personalizeInsights<T extends InsightSortable>(
  insights: T[],
  userProfile: UserProfile | null | undefined,
): T[] {
  // Example: filter or reorder insights based on user segment, preferences, or history
  if (!userProfile) return insights;
  // Demo: if user is 'manager', show high impact first
  if (userProfile.role === 'manager') {
    return [...insights].sort((a, b) => {
      if (a.impact === b.impact) return 0;
      return a.impact === "high" ? -1 : 1;
    });
  }
  // Demo: if user prefers email, prioritize email actions
  if (userProfile.preferredChannel === 'email') {
    return [...insights].sort((a, b) => {
      if (a.recommendedChannel === b.recommendedChannel) return 0;
      return a.recommendedChannel === "email" ? -1 : 1;
    });
  }
  return insights;
}
