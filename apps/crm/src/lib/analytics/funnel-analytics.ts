// funnel-analytics.ts
// Funnel & conversion analytics for CRM

import { listActivities } from '../activities-store';

export interface FunnelStep {
  key: string;
  label: string;
}

export interface FunnelStats {
  steps: FunnelStep[];
  counts: number[];
  conversionRates: number[];
}

// Define your funnel steps (customize as needed)
export const DEFAULT_FUNNEL: FunnelStep[] = [
  { key: 'lead_created', label: 'Lead vytvorený' },
  { key: 'contacted', label: 'Kontaktovaný' },
  { key: 'meeting', label: 'Obhliadka' },
  { key: 'offer', label: 'Ponuka' },
  { key: 'deal', label: 'Deal uzavretý' },
];

export async function getFunnelStats(funnel: FunnelStep[] = DEFAULT_FUNNEL): Promise<FunnelStats> {
  const activities = await listActivities(2000);
  const counts = funnel.map(step =>
    activities.filter(a => a.type === step.key).length
  );
  const conversionRates = counts.map((count, i) =>
    i === 0 ? 1 : counts[i] / (counts[i - 1] || 1)
  );
  return { steps: funnel, counts, conversionRates };
}
