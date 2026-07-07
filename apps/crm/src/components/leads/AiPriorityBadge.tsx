import { SLATE_HORIZON_BADGES } from "@/lib/slate-horizon-theme";
import type { AiPrioritySk } from "@/lib/workflows/lead-ai-priority";

function palette(priority: string | null | undefined) {
  switch (priority) {
    case "Vysoká":
      return SLATE_HORIZON_BADGES.hot;
    case "Stredná":
      return SLATE_HORIZON_BADGES.team;
    default:
      return { bg: "#F1F5F9", color: "#64748B", border: "#E2E8F0" };
  }
}

type Props = {
  priority: string | null | undefined;
  className?: string;
};

/** Farebný badge pre `ai_priority` — reuse palety z WORKDESK. */
export function AiPriorityBadge({ priority, className = "" }: Props) {
  if (!priority) return null;
  const colors = palette(priority as AiPrioritySk);
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${className}`}
      style={{
        background: colors.bg,
        color: colors.color,
        border: `1px solid ${colors.border}`,
      }}
    >
      {priority}
    </span>
  );
}
