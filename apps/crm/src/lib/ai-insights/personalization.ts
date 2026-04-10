// AI Insights personalization (demo version)
export function personalizeInsights(insights, userProfile) {
  // Example: filter or reorder insights based on user segment, preferences, or history
  if (!userProfile) return insights;
  // Demo: if user is 'manager', show high impact first
  if (userProfile.role === 'manager') {
    return [...insights].sort((a, b) => (a.impact === 'high' ? -1 : 1));
  }
  // Demo: if user prefers email, prioritize email actions
  if (userProfile.preferredChannel === 'email') {
    return [...insights].sort((a, b) => (a.recommendedChannel === 'email' ? -1 : 1));
  }
  return insights;
}
