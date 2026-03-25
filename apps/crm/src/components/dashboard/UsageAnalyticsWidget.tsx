// UsageAnalyticsWidget.tsx
// Simple dashboard widget for usage analytics

import React, { useEffect, useState } from 'react';
import { getUsageAnalytics, UsageAnalytics } from '@/lib/analytics/usage-analytics';

export default function UsageAnalyticsWidget() {
  const [stats, setStats] = useState<UsageAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsageAnalytics().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Načítavam analytiku používania…</div>;
  if (!stats) return <div>Žiadne dáta o používaní.</div>;

  return (
    <div className="p-4 bg-white rounded shadow w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">Používateľská analytika</h2>
      <div className="mb-2">Celkový počet udalostí: <b>{stats.totalEvents}</b></div>
      <div className="mb-2">
        <b>Podľa typu:</b>
        <ul className="list-disc ml-6">
          {Object.entries(stats.byType).map(([type, count]) => (
            <li key={type}>{type}: {count}</li>
          ))}
        </ul>
      </div>
      <div className="mb-2">
        <b>Top funkcie:</b>
        <ul className="list-disc ml-6">
          {stats.topFeatures.map(f => (
            <li key={f.feature}>{f.feature}: {f.count}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
