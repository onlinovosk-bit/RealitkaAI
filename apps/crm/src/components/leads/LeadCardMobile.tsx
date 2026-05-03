"use client";

import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/leads-store";

const STATUS_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  "Horúci":    { bg: "rgba(34,197,94,0.12)",  text: "#22C55E", dot: "#22C55E" },
  "Teplý":     { bg: "rgba(234,179,8,0.12)",   text: "#EAB308", dot: "#EAB308" },
  "Nový":      { bg: "rgba(100,116,139,0.12)", text: "#94A3B8", dot: "#94A3B8" },
  "Obhliadka": { bg: "rgba(34,211,238,0.12)",  text: "#22D3EE", dot: "#22D3EE" },
  "Ponuka":    { bg: "rgba(168,85,247,0.12)",  text: "#A855F7", dot: "#A855F7" },
};

function ScoreArc({ score }: { score: number }) {
  const color = score >= 85 ? "#22C55E" : score >= 65 ? "#EAB308" : "#EF4444";
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-lg font-bold leading-none" style={{ color }}>{score}</span>
      <span className="text-[9px]" style={{ color: "#475569" }}>BRI</span>
    </div>
  );
}

interface LeadCardMobileProps {
  lead: Lead;
  onStatusChange?: (id: string, status: Lead["status"]) => void;
}

export function LeadCardMobile({ lead, onStatusChange }: LeadCardMobileProps) {
  const router = useRouter();
  const style = STATUS_STYLE[lead.status] ?? STATUS_STYLE["Nový"];

  return (
    <div
      onClick={() => router.push(`/leads/${lead.id}`)}
      className="flex items-center gap-3 rounded-2xl px-3 py-3 active:scale-[0.98] transition-transform cursor-pointer"
      style={{
        background: "rgba(8,13,26,0.6)",
        border: "1px solid rgba(34,211,238,0.08)",
      }}
    >
      {/* Score circle */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: "rgba(5,9,20,0.8)", border: "1.5px solid rgba(34,211,238,0.15)" }}
      >
        <ScoreArc score={lead.score} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold" style={{ color: "#F0F9FF" }}>
            {lead.name}
          </span>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
            style={{ background: style.bg, color: style.text }}
          >
            {lead.status}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs" style={{ color: "#64748B" }}>
          <span className="truncate">{lead.location || "—"}</span>
          <span>·</span>
          <span className="truncate">{lead.budget || "—"}</span>
        </div>
        {lead.propertyType && (
          <div className="mt-0.5 text-[10px] truncate" style={{ color: "#475569" }}>
            {lead.propertyType}{lead.rooms ? ` · ${lead.rooms}` : ""}
          </div>
        )}
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#334155" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </div>
  );
}

interface LeadCardListProps {
  leads: Lead[];
  onStatusChange?: (id: string, status: Lead["status"]) => void;
}

export function LeadCardList({ leads, onStatusChange }: LeadCardListProps) {
  if (!leads.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {leads.map((lead) => (
        <LeadCardMobile key={lead.id} lead={lead} onStatusChange={onStatusChange} />
      ))}
    </div>
  );
}
