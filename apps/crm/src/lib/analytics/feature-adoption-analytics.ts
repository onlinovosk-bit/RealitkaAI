// feature-adoption-analytics.ts
// Feature adoption & power user analytics for CRM

import { listActivities } from '../activities-store';

export interface FeatureAdoptionStats {
  featureCounts: Record<string, number>;
  topUsers: Array<{ userId: string; count: number }>;
}

export async function getFeatureAdoptionStats(): Promise<FeatureAdoptionStats> {
  const activities = await listActivities(2000);
  const featureCounts: Record<string, number> = {};
  const userCounts: Record<string, number> = {};

  for (const a of activities) {
    if (a.type === 'feature_use') {
      const feature = a.title || 'unknown';
      featureCounts[feature] = (featureCounts[feature] || 0) + 1;
      if (a.profileId) userCounts[a.profileId] = (userCounts[a.profileId] || 0) + 1;
    }
  }

  const topUsers = Object.entries(userCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([userId, count]) => ({ userId, count }));

  return { featureCounts, topUsers };
}
