// FeatureAdoptionWidget.tsx
// Dashboard widget for feature adoption & power user metrics

import React, { useEffect, useState } from 'react';
import { getFeatureAdoptionStats, FeatureAdoptionStats } from '@/lib/analytics/feature-adoption-analytics';

export default function FeatureAdoptionWidget() {
  const [stats, setStats] = useState<FeatureAdoptionStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFeatureAdoptionStats().then((data) => {
      setStats(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Načítavam adoption analytiku…</div>;
  if (!stats) return <div>Žiadne adoption dáta.</div>;

  return (
    <div className="p-4 bg-white rounded shadow w-full max-w-xl">
      <h2 className="text-lg font-bold mb-2">Feature Adoption & Power Users</h2>
      <div className="mb-2">
        <b>Najpoužívanejšie funkcie:</b>
        <ul className="list-disc ml-6">
          {Object.entries(stats.featureCounts).map(([feature, count]) => (
            <li key={feature}>{feature}: {count}</li>
          ))}
        </ul>
      </div>
      <div className="mb-2">
        <b>Power users:</b>
        <ul className="list-disc ml-6">
          {stats.topUsers.map(u => (
            <li key={u.userId}>{u.userId}: {u.count} použitia</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
