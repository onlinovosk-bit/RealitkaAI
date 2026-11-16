"use client";

export default function Error({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6" data-testid="ai-control-tower-error">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-2xl font-bold">AI Control Tower</h1>
        <p className="mt-3 text-sm text-red-200">
          Načítanie zlyhalo. Údaje o spotrebe sú nedostupné, kým sa stránka nenačíta znova.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 rounded-lg border border-slate-600 px-3 py-2 text-sm text-slate-200"
        >
          Skúsiť znova
        </button>
      </div>
    </main>
  );
}
