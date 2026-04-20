"use client";
import dynamic from "next/dynamic";
import type { AssistantPanelProps } from "./AssistantPanel";

const AssistantPanelLazy = dynamic(
  () => import("./AssistantPanel").then((m) => ({ default: m.AssistantPanel })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 animate-pulse">
        <p className="text-sm text-slate-500">Načítavam AI Asistenta…</p>
      </div>
    ),
  }
);

export function AssistantPanelDynamic(props: AssistantPanelProps) {
  return <AssistantPanelLazy {...props} />;
}
