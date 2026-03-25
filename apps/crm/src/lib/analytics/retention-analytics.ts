// retention-analytics.ts
// Retention & cohort analysis for CRM

import { listActivities } from '../activities-store';

export interface RetentionStats {
  dailyActive: Record<string, number>;
  weeklyActive: Record<string, number>;
  cohorts: Array<{ cohort: string; retained: number; total: number; retentionRate: number }>;
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function getRetentionStats(): Promise<RetentionStats> {
  const activities = await listActivities(2000);
  const byDay: Record<string, Set<string>> = {};
  const byWeek: Record<string, Set<string>> = {};
  const userFirstSeen: Record<string, string> = {};

  for (const a of activities) {
    if (!a.profileId) continue;
    const day = formatDate(new Date(a.createdAt));
    const week = day.slice(0, 8) + '0';
    byDay[day] = byDay[day] || new Set();
    byDay[day].add(a.profileId);
    byWeek[week] = byWeek[week] || new Set();
    byWeek[week].add(a.profileId);
    if (!userFirstSeen[a.profileId]) userFirstSeen[a.profileId] = day;
  }

  // Cohort retention: for each cohort (first seen week), what % returned in later weeks
  const cohortMap: Record<string, Set<string>> = {};
  Object.entries(userFirstSeen).forEach(([user, day]) => {
    const cohort = day.slice(0, 8) + '0';
    cohortMap[cohort] = cohortMap[cohort] || new Set();
    cohortMap[cohort].add(user);
  });

  const cohorts = Object.entries(cohortMap).map(([cohort, users]) => {
    let retained = 0;
    Object.entries(byWeek).forEach(([week, activeUsers]) => {
      if (week > cohort) {
        retained += [...users].filter(u => activeUsers.has(u)).length;
      }
    });
    const total = users.size;
    return {
      cohort,
      retained,
      total,
      retentionRate: total ? retained / total : 0,
    };
  });

  return {
    dailyActive: Object.fromEntries(Object.entries(byDay).map(([d, s]) => [d, s.size])),
    weeklyActive: Object.fromEntries(Object.entries(byWeek).map(([w, s]) => [w, s.size])),
    cohorts,
  };
}
