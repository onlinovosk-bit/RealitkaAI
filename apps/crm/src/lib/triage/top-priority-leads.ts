import type { Lead } from "@/lib/leads-store";
import { priorityRank } from "@/lib/workflows/lead-ai-priority";

/** Top N leadov: `ai_priority` (Vysoká prvá) → `created_at` DESC. */
export function sortLeadsByTriagePriority(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => {
    const pr = priorityRank(b.aiPriority ?? null) - priorityRank(a.aiPriority ?? null);
    if (pr !== 0) return pr;
    const at = new Date(a.createdAt ?? 0).getTime();
    const bt = new Date(b.createdAt ?? 0).getTime();
    return bt - at;
  });
}

export function truncateReason(reason: string | null | undefined, max = 120): string {
  const text = String(reason ?? "").trim();
  if (!text) return "";
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
}
