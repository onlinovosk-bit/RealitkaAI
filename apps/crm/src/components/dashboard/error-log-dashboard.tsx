import { getErrorLogEntries } from "@/lib/error-log-reader";

export default function ErrorLogDashboard() {
  const entries = getErrorLogEntries(50);

  return (
    <section className="mb-6 rounded-2xl border border-red-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-red-700 mb-2">Serverové chyby a warningy</h2>
      {entries.length === 0 ? (
        <div className="text-gray-500">Žiadne zachytené chyby.</div>
      ) : (
        <ul className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
          {entries.map((entry, idx) => (
            <li key={idx} className="py-2">
              <div className="text-xs text-gray-400">{entry.timestamp} | {entry.context}</div>
              <div className="text-sm text-red-800 font-mono whitespace-pre-wrap">{entry.message}</div>
              {entry.stack && (
                <details className="text-xs text-gray-500 mt-1">
                  <summary>Stack trace</summary>
                  <pre>{entry.stack}</pre>
                </details>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
