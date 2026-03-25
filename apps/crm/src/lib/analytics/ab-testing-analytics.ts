// ab-testing-analytics.ts
// Simple A/B testing & experimentation analytics for CRM

import { listActivities } from '../activities-store';

export interface ExperimentResult {
  experiment: string;
  variant: string;
  users: number;
  conversions: number;
  conversionRate: number;
}

export async function getExperimentResults(): Promise<ExperimentResult[]> {
  // Example: Assume activities have experiment/variant info in metadata
  const activities = await listActivities(2000);
  const experiments: Record<string, Record<string, Set<string>>> = {};
  const conversions: Record<string, Record<string, Set<string>>> = {};

  for (const a of activities) {
    const exp = a.metadata?.experiment;
    const variant = a.metadata?.variant;
    if (!exp || !variant || !a.profileId) continue;
    experiments[exp] = experiments[exp] || {};
    experiments[exp][variant] = experiments[exp][variant] || new Set();
    experiments[exp][variant].add(a.profileId);
    // Conversion: e.g. activity type 'conversion' or custom logic
    if (a.type === 'conversion') {
      conversions[exp] = conversions[exp] || {};
      conversions[exp][variant] = conversions[exp][variant] || new Set();
      conversions[exp][variant].add(a.profileId);
    }
  }

  const results: ExperimentResult[] = [];
  for (const exp of Object.keys(experiments)) {
    for (const variant of Object.keys(experiments[exp])) {
      const users = experiments[exp][variant].size;
      const conv = conversions[exp]?.[variant]?.size || 0;
      results.push({
        experiment: exp,
        variant,
        users,
        conversions: conv,
        conversionRate: users > 0 ? conv / users : 0,
      });
    }
  }
  return results;
}
