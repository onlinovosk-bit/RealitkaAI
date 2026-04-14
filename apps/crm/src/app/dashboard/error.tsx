"use client";

export default function DashboardSegmentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="mx-auto max-w-md text-center">
        <div
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
          style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
        >
          <span className="text-2xl">!</span>
        </div>

        <h2 className="text-xl font-bold text-gray-100">Stránka sa nepodarila načítať</h2>

        <p className="mt-3 text-sm text-gray-400">
          Nastala chyba pri načítaní tejto časti aplikácie. Skúste obnoviť stránku.
        </p>

        {error.digest && (
          <p className="mt-2 text-xs text-gray-500">
            Ref: {error.digest}
          </p>
        )}

        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="rounded-xl px-5 py-2.5 text-sm font-semibold transition"
            style={{
              background: "rgba(34,211,238,0.08)",
              border: "1px solid rgba(34,211,238,0.2)",
              color: "#22d3ee",
            }}
          >
            Skúsiť znova
          </button>
          <a
            href="/dashboard"
            className="rounded-xl px-5 py-2.5 text-sm font-semibold text-gray-400 transition"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
          >
            Späť na prehľad
          </a>
        </div>
      </div>
    </div>
  );
}
