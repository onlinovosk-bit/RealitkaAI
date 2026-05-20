"use client";
import dynamic from "next/dynamic";
import type { AssistantPanelProps } from "./AssistantPanel";
import { AI_ASSISTANT_NAME_GENITIVE } from "@/lib/ai-brand";

const AssistantPanelLazy = dynamic(
  () => import("./AssistantPanel").then((m) => ({ default: m.AssistantPanel })),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-full rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/70 animate-pulse"
        aria-busy="true"
      >
        <p className="text-sm font-medium text-slate-600">Načítavam {AI_ASSISTANT_NAME_GENITIVE}…</p>
      </div>
    ),
  }
);

export function AssistantPanelDynamic(props: AssistantPanelProps) {
  return <AssistantPanelLazy {...props} />;
}
