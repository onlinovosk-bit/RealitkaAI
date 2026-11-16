export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-white sm:p-6" data-testid="ai-control-tower-loading">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs uppercase tracking-widest text-slate-500">Internal · Prevádzka</p>
        <h1 className="mt-1 text-2xl font-bold">AI Control Tower</h1>
        <p className="mt-4 text-sm text-slate-400">Načítavam spotrebu, snímky a stropy…</p>
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-slate-900" />
      </div>
    </main>
  );
}
