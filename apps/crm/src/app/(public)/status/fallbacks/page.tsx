import LegalPageShell from "@/components/legal/legal-page-shell";
import { FALLBACK_MATRIX } from "@/lib/fallback-matrix";

export const metadata = {
  title: "Fallback Matrix | Revolis.AI",
  description: "D3 fallback matrix pre kritické endpointy a retry stratégie.",
};

export default function FallbackMatrixPage() {
  return (
    <LegalPageShell
      title="Fallback Matrix (D3)"
      subtitle="Mapovanie endpoint -> fallback správanie + retry stratégia pre kritické flowy."
    >
      <div className="space-y-4">
        <div className="overflow-x-auto rounded-xl border border-slate-700 bg-slate-950/50 p-3">
          <table className="min-w-full border-collapse text-left text-xs text-slate-300">
            <thead>
              <tr className="text-slate-400">
                <th className="border-b border-slate-700 px-2 py-2">Endpoint</th>
                <th className="border-b border-slate-700 px-2 py-2">Consumer</th>
                <th className="border-b border-slate-700 px-2 py-2">Retry</th>
                <th className="border-b border-slate-700 px-2 py-2">Fallback správanie</th>
              </tr>
            </thead>
            <tbody>
              {FALLBACK_MATRIX.map((row) => (
                <tr key={`${row.endpoint}-${row.consumer}`} className="align-top">
                  <td className="border-b border-slate-800 px-2 py-2">{row.endpoint}</td>
                  <td className="border-b border-slate-800 px-2 py-2">{row.consumer}</td>
                  <td className="border-b border-slate-800 px-2 py-2">{row.retryStrategy}</td>
                  <td className="border-b border-slate-800 px-2 py-2">{row.fallbackBehavior}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4 text-sm text-slate-200">
          JSON endpoint pre monitoring integrácie: <code>/api/observability/fallback-matrix</code>
        </div>
      </div>
    </LegalPageShell>
  );
}
