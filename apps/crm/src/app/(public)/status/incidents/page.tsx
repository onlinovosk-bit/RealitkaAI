import LegalPageShell from "@/components/legal/legal-page-shell";

export const metadata = {
  title: "Incident Cleanup Log | Revolis.AI",
  description: "D4 RCA log pre opravené P1/P2 incidenty a preventívne guard testy.",
};

export default function IncidentCleanupLogPage() {
  return (
    <LegalPageShell
      title="Incident Cleanup Log (D4)"
      subtitle="RCA súhrn pre otvorené P1/P2 incidenty, fixy a prevenciu."
    >
      <div className="space-y-4 text-sm text-slate-200">
        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-base font-semibold text-white">P2: Retry loop pri 4xx</h2>
          <p className="mt-2 text-slate-300">
            Opravená retry logika v `fetchJsonWithRetry`: non-retryable 4xx už neopakuje requesty.
          </p>
        </section>

        <section className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
          <h2 className="text-base font-semibold text-white">P1: Hard fail legal/support pri email výpadku</h2>
          <p className="mt-2 text-slate-300">
            Routes pre legal/support ticket teraz fungujú v degrade režime: request je prijatý, ak prejde email alebo
            webhook fallback. Hard fail len pri zlyhaní oboch kanálov.
          </p>
        </section>

        <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
          <p>
            Guard testy: <code>src/lib/__tests__/request-helpers.retry.test.ts</code>
          </p>
          <p className="mt-1">
            Machine-readable fallback matrix: <code>/api/observability/fallback-matrix</code>
          </p>
        </section>
      </div>
    </LegalPageShell>
  );
}
