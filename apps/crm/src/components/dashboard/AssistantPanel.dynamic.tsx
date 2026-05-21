"use client";
import dynamic from "next/dynamic";
import type { AssistantPanelProps } from "./AssistantPanel";

const AssistantPanelLazy = dynamic(
  () => import("./AssistantPanel").then((m) => ({ default: m.AssistantPanel })),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-[20px] border p-5 animate-pulse"
        style={{
          background: "#fff",
          borderColor: "#E2E8F0",
        }}
      >
        <p className="text-sm text-slate-500">Načítavam AI Asistenta…</p>
      </div>
    ),
  }
);

export function AssistantPanelDynamic(props: AssistantPanelProps) {
  return <AssistantPanelLazy {...props} />;
}
