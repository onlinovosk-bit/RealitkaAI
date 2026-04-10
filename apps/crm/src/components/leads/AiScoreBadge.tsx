import { getLeadBadge, getConfidence } from "@/lib/ai-engine";

interface AiScoreBadgeProps {
  score: number;
  showConfidence?: boolean;
}

export default function AiScoreBadge({
  score,
  showConfidence = false,
}: AiScoreBadgeProps) {
  const badge = getLeadBadge(score);
  const confidence = getConfidence(score);

  return (
    <div className="flex items-center gap-2">
      <span
        className="rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide"
        style={{ color: badge.color, background: badge.bg }}
      >
        {badge.label}
      </span>
      <span
        className="text-sm font-bold tabular-nums"
        style={{ color: badge.color }}
      >
        {score}
      </span>
      {showConfidence && (
        <span className="text-xs text-slate-500">
          {confidence}% šanca
        </span>
      )}
    </div>
  );
}
