// usage-analytics.ts
// Data-driven analytics for usage events

import { listActivities } from '../activities-store';

export interface UsageAnalytics {
  totalEvents: number;
  byType: Record<string, number>;
  byUser: Record<string, number>;
  topFeatures: Array<{ feature: string; count: number }>;
}

export async function getUsageAnalytics(): Promise<UsageAnalytics> {
  const activities = await listActivities(1000);
  const usageEvents = activities.filter(a => a.type === 'Usage');

  const byType: Record<string, number> = {};
  const byUser: Record<string, number> = {};
  const featureCounts: Record<string, number> = {};

  for (const event of usageEvents) {
    const details = safeParse(event.text);
    const type = details.eventType || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
    if (event.profileId) byUser[event.profileId] = (byUser[event.profileId] || 0) + 1;
    if (type === 'feature_use' && details.eventName) {
      featureCounts[details.eventName] = (featureCounts[details.eventName] || 0) + 1;
    }
  }

  const topFeatures = Object.entries(featureCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([feature, count]) => ({ feature, count }));

  return {
    totalEvents: usageEvents.length,
    byType,
    byUser,
    topFeatures,
  };
}

function safeParse(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}
