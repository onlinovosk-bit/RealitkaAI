export function AssistantPanelLoading() {
  return (
    <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-br from-indigo-950/50 via-slate-900/80 to-slate-950 p-5">
      <div className="h-5 w-36 animate-pulse rounded bg-white/10" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-white/5" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-white/5" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
      </div>
    </div>
  );
}
