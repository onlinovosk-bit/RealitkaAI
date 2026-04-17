/** Ľahký skeleton — používa sa pri Suspense a `next/dynamic` bez importu celej logiky panelu. */
export function AssistantPanelLoading() {
  return (
    <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/60 p-5 text-sm text-slate-400">
      Načítavam AI Asistent panel…
    </div>
  );
}
