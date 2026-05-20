import { AI_ASSISTANT_NAME } from "@/lib/ai-brand";

export function AssistantPanelLoading() {
  return (
    <div
      className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70"
      aria-busy="true"
      aria-label={`Načítavam ${AI_ASSISTANT_NAME}`}
    >
      <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
      <div className="mt-3 h-6 w-48 animate-pulse rounded bg-slate-100" />
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-slate-50" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-slate-50" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-50" />
      </div>
    </div>
  );
}
