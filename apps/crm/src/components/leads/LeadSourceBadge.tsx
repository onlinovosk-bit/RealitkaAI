import { sourceBadgeClass, sourceBadgeLabel } from "@/lib/leads/lead-ux";

export function LeadSourceBadge({ source }: { source?: string | null }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${sourceBadgeClass(source)}`}
    >
      {sourceBadgeLabel(source)}
    </span>
  );
}
