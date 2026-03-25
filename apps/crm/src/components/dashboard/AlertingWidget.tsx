import React, { useEffect, useState } from 'react';
import { getAlerts, Alert } from '../../lib/analytics/alerting-analytics';

export default function AlertingWidget() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAlerts().then(a => {
      setAlerts(a);
      setLoading(false);
    });
  }, []);

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm min-h-[120px]">
      <h2 className="font-bold text-lg mb-2">Alerty & Anomálie</h2>
      {loading ? (
        <div>Načítavam...</div>
      ) : alerts.length === 0 ? (
        <div className="text-green-600">Žiadne kritické alerty</div>
      ) : (
        <ul className="space-y-2">
          {alerts.map((alert, i) => (
            <li key={i} className={`border-l-4 pl-2 ${
              alert.severity === 'critical' ? 'border-red-600 bg-red-50' :
              alert.severity === 'warning' ? 'border-yellow-500 bg-yellow-50' :
              'border-blue-400 bg-blue-50'
            }`}>
              <div className="text-xs text-gray-500">{alert.detectedAt}</div>
              <div className="font-semibold">{alert.message}</div>
              <div className="text-xs">Typ: {alert.type}, Úroveň: {alert.severity}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
