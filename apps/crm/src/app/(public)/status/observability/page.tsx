import LegalPageShell from "@/components/legal/legal-page-shell";
import { INCIDENT_SEVERITY_MAP, OBSERVABILITY_RULES } from "@/lib/observability-rules";

export const metadata = {
  title: "Observability Baseline | Revolis.AI",
  description: "D2 monitoring pravidlá a incident severity map pre auth, billing, api 5xx a dashboard load.",
};

export default function ObservabilityBaselinePage() {
  return (
    <LegalPageShell
      title="Observability Baseline (D2)"
      subtitle="Monitoring pravidlá a incident severity map pre produkčné operácie."
    >
      <div className="space-y-5 text-sm text-slate-200">
        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-white">Monitoring pravidlá</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="border-b border-slate-700 px-2 py-2">Area</th>
                  <th className="border-b border-slate-700 px-2 py-2">Metric</th>
                  <th className="border-b border-slate-700 px-2 py-2">Window</th>
                  <th className="border-b border-slate-700 px-2 py-2">Threshold</th>
                  <th className="border-b border-slate-700 px-2 py-2">Severity</th>
                </tr>
              </thead>
              <tbody>
                {OBSERVABILITY_RULES.map((rule) => (
                  <tr key={rule.id} className="align-top text-slate-300">
                    <td className="border-b border-slate-800 px-2 py-2">{rule.area}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{rule.metric}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{rule.window}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{rule.threshold}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{rule.severity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-lg font-semibold text-white">Incident severity map (P1-P4)</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr className="text-slate-400">
                  <th className="border-b border-slate-700 px-2 py-2">Severity</th>
                  <th className="border-b border-slate-700 px-2 py-2">Definition</th>
                  <th className="border-b border-slate-700 px-2 py-2">First response</th>
                  <th className="border-b border-slate-700 px-2 py-2">Cadence</th>
                  <th className="border-b border-slate-700 px-2 py-2">Owner</th>
                </tr>
              </thead>
              <tbody>
                {INCIDENT_SEVERITY_MAP.map((row) => (
                  <tr key={row.severity} className="align-top text-slate-300">
                    <td className="border-b border-slate-800 px-2 py-2">{row.severity}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{row.definition}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{row.firstResponseSla}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{row.commsCadence}</td>
                    <td className="border-b border-slate-800 px-2 py-2">{row.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
          <p className="text-slate-200">
            Machine-readable rules: <code>/api/observability/rules</code> · synthetic probes:{" "}
            <code>/api/observability/probes</code>
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
