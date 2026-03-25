import React, { useEffect, useState } from 'react';
import { getExperimentResults, ExperimentResult } from '../../lib/analytics/ab-testing-analytics';

export default function AbTestingWidget() {
  const [results, setResults] = useState<ExperimentResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getExperimentResults().then(r => {
      setResults(r);
      setLoading(false);
    });
  }, []);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm min-h-[120px]">
      <h2 className="font-bold text-lg mb-2">A/B Testovanie & Experimenty</h2>
      {loading ? (
        <div>Načítavam...</div>
      ) : results.length === 0 ? (
        <div className="text-gray-500">Žiadne experimenty</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Experiment</th>
              <th className="text-left">Varianta</th>
              <th>Užívatelia</th>
              <th>Konverzie</th>
              <th>Konverzný pomer</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r, i) => (
              <tr key={i} className="border-t">
                <td>{r.experiment}</td>
                <td>{r.variant}</td>
                <td className="text-center">{r.users}</td>
                <td className="text-center">{r.conversions}</td>
                <td className="text-center">{(r.conversionRate * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
