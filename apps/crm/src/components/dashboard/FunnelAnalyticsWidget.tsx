// FunnelAnalyticsWidget.tsx
// Dashboard widget for funnel & conversion analytics

import React, { useEffect, useState } from 'react';
import { getFunnelStats, DEFAULT_FUNNEL, FunnelStats } from '@/lib/analytics/funnel-analytics';

export default function FunnelAnalyticsWidget() {
  const [stats, setStats] = useState<FunnelStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFunnelStats(DEFAULT_FUNNEL).then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Načítavam funnel analytiku…</div>;
  if (!stats) return <div>Žiadne funnel dáta.</div>;

  return (
    <div className="p-4 bg-white rounded shadow w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">Funnel & Konverzná analytika</h2>
      <table className="w-full text-sm">
        <thead>
          <tr>
            <th className="text-left">Krok</th>
            <th>Počet</th>
            <th>Konverzia</th>
          </tr>
        </thead>
        <tbody>
          {stats.steps.map((step, i) => (
            <tr key={step.key}>
              <td>{step.label}</td>
              <td className="text-center">{stats.counts[i]}</td>
              <td className="text-center">{i === 0 ? '-' : `${(stats.conversionRates[i] * 100).toFixed(1)} %`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
