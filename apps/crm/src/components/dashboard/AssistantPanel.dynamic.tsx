"use client";

import dynamic from "next/dynamic";
import type { AssistantPanelProps } from "@/components/dashboard/AssistantPanel";
import { AssistantPanelLoading } from "@/components/dashboard/AssistantPanelLoading";

const AssistantPanelLazy = dynamic(
  () =>
    import("@/components/dashboard/AssistantPanel").then((m) => ({
      default: m.AssistantPanel,
    })),
  {
    loading: () => <AssistantPanelLoading />,
    ssr: true,
  }
);

/**
 * Lazy chunk pre dashboard — znižuje počiatočný bundle stránky /dashboard.
 * Verejný API: rovnaké props ako `AssistantPanel`.
 */
export function AssistantPanelDynamic(props: AssistantPanelProps) {
  return <AssistantPanelLazy {...props} />;
}
