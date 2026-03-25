// RetentionAnalyticsWidget.tsx
// Dashboard widget for retention & cohort analysis

import React, { useEffect, useState } from 'react';
import { getRetentionStats, RetentionStats } from '@/lib/analytics/retention-analytics';

export default function RetentionAnalyticsWidget() {
  const [stats, setStats] = useState<RetentionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getRetentionStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Načítavam retention analytiku…</div>;
  if (!stats) return <div>Žiadne retention dáta.</div>;

  return (
    <div className="p-4 bg-white rounded shadow w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">Retention & Cohort analytika</h2>
      <div className="mb-2">
        <b>Denná aktivita:</b>
        <ul className="list-disc ml-6">
          {Object.entries(stats.dailyActive).slice(-7).map(([day, count]) => (
            <li key={day}>{day}: {count} aktívnych užívateľov</li>
          ))}
        </ul>
      </div>
      <div className="mb-2">
        <b>Týždenná aktivita:</b>
        <ul className="list-disc ml-6">
          {Object.entries(stats.weeklyActive).slice(-4).map(([week, count]) => (
            <li key={week}>{week}: {count} aktívnych užívateľov</li>
          ))}
        </ul>
      </div>
      <div className="mb-2">
        <b>Cohort retention:</b>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th>Cohort (týždeň)</th>
              <th>Retained</th>
              <th>Total</th>
              <th>Retention rate</th>
            </tr>
          </thead>
          <tbody>
            {stats.cohorts.map(c => (
              <tr key={c.cohort}>
                <td>{c.cohort}</td>
                <td className="text-center">{c.retained}</td>
                <td className="text-center">{c.total}</td>
                <td className="text-center">{(c.retentionRate * 100).toFixed(1)} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
