// alerting-analytics.ts
// Alerting & anomaly detection for CRM analytics

import { listActivities } from '../activities-store';

export interface Alert {
  type: 'drop' | 'spike' | 'inactive' | 'custom';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  detectedAt: string;
}

export async function getAlerts(): Promise<Alert[]> {
  const activities = await listActivities(2000);
  const alerts: Alert[] = [];

  // Example: Detect drop in daily active users
  const byDay: Record<string, Set<string>> = {};
  for (const a of activities) {
    if (!a.profileId) continue;
    const day = a.createdAt.slice(0, 10);
    byDay[day] = byDay[day] || new Set();
    byDay[day].add(a.profileId);
  }
  const days = Object.keys(byDay).sort();
  if (days.length > 2) {
    const prev = byDay[days[days.length - 2]].size;
    const curr = byDay[days[days.length - 1]].size;
    if (curr < prev * 0.5) {
      alerts.push({
        type: 'drop',
        message: `Pokles dennej aktivity o viac ako 50% (${prev} → ${curr})`,
        severity: 'critical',
        detectedAt: days[days.length - 1],
      });
    }
    if (curr > prev * 2) {
      alerts.push({
        type: 'spike',
        message: `Nárast dennej aktivity o viac ako 100% (${prev} → ${curr})`,
        severity: 'info',
        detectedAt: days[days.length - 1],
      });
    }
  }

  // Example: Detect inactive users
  const now = new Date();
  const inactiveUsers = new Set<string>();
  for (const a of activities) {
    if (!a.profileId) continue;
    const lastActive = new Date(a.createdAt);
    if ((now.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24) > 14) {
      inactiveUsers.add(a.profileId);
    }
  }
  if (inactiveUsers.size > 0) {
    alerts.push({
      type: 'inactive',
      message: `Neaktívni užívatelia (14+ dní): ${[...inactiveUsers].join(', ')}`,
      severity: 'warning',
      detectedAt: now.toISOString().slice(0, 10),
    });
  }

  return alerts;
}
