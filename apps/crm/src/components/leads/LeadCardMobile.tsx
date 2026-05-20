"use client";

import { useRouter } from "next/navigation";
import { useTransition, useState, useCallback } from "react";
import type { Lead } from "@/lib/leads-store";

const STATUS_STYLE: Record<string, { bg: string; text: string }> = {
  "Horúci":    { bg: "#FEF2F2", text: "#B91C1C" },
  "Teplý":     { bg: "#FFFBEB", text: "#B45309" },
  "Nový":      { bg: "#F1F5F9", text: "#475569" },
  "Obhliadka": { bg: "#EFF6FF", text: "#1D4ED8" },
  "Ponuka":    { bg: "#FFF7ED", text: "#C2410C" },
};

// Rýchle stavy dostupné z listu — core flow: Nový → Teplý → Horúci → Obhliadka
const QUICK_STATUSES: Array<Lead["status"]> = ["Nový", "Teplý", "Horúci", "Obhliadka"];

function ScoreArc({ score }: { score: number }) {
  const color = score >= 85 ? "#047857" : score >= 65 ? "#D97706" : "#DC2626";
  return (
    <div className="flex flex-col items-center justify-center">
      <span className="text-lg font-bold leading-none" style={{ color }}>{score}</span>
      <span className="text-[9px] text-slate-500">BRI</span>
    </div>
  );
}

interface LeadCardMobileProps {
  lead: Lead;
  onStatusChange?: (id: string, status: Lead["status"]) => void;
}

export function LeadCardMobile({ lead, onStatusChange }: LeadCardMobileProps) {
  const router        = useRouter();
  const [, startTransition] = useTransition();

  // Optimistic status — UI aktualizuje okamžite, API call prebieha na pozadí
  const [optimisticStatus, setOptimisticStatus] = useState(lead.status);
  const [menuOpen, setMenuOpen]                 = useState(false);

  const style = STATUS_STYLE[optimisticStatus] ?? STATUS_STYLE["Nový"];

  // Prefetch lead detail hneď pri touch/hover — nulová perceived latency pri navigácii
  const prefetchDetail = useCallback(() => {
    router.prefetch(`/leads/${lead.id}`);
  }, [router, lead.id]);

  const handleStatusChange = useCallback(
    (newStatus: Lead["status"]) => {
      const prev = optimisticStatus;
      setOptimisticStatus(newStatus); // okamžite — optimistic
      setMenuOpen(false);
      onStatusChange?.(lead.id, newStatus);

      startTransition(() => {
        fetch(`/api/leads/${lead.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status: newStatus }),
        }).then((r) => {
          if (!r.ok) setOptimisticStatus(prev); // revert on error
        }).catch(() => setOptimisticStatus(prev));
      });
    },
    [lead.id, optimisticStatus, onStatusChange]
  );

  return (
    <div
      className="relative flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30 active:bg-blue-50"
      onTouchStart={prefetchDetail}
      onMouseEnter={prefetchDetail}
      onClick={(e) => {
        if (menuOpen) { e.stopPropagation(); return; }
        router.push(`/leads/${lead.id}`);
      }}
    >
      {/* Score circle */}
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        style={{ background: "#F8FAFC", border: "1.5px solid #DBEAFE" }}
      >
        <ScoreArc score={lead.score} />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-slate-950">
            {lead.name}
          </span>

          {/* Optimistic status badge — tap to change quickly */}
          <button
            className="min-h-[28px] shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:opacity-70"
            style={{ background: style.bg, color: style.text }}
            onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
            aria-label="Zmeniť status"
          >
            {optimisticStatus}
          </button>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
          <span className="truncate">{lead.location || "—"}</span>
          <span>·</span>
          <span className="truncate font-medium text-emerald-700">{lead.budget || "—"}</span>
        </div>
        {lead.propertyType && (
          <div className="mt-0.5 truncate text-[10px] text-slate-500">
            {lead.propertyType}{lead.rooms ? ` · ${lead.rooms}` : ""}
          </div>
        )}
      </div>

      {/* Chevron */}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
        <polyline points="9 18 15 12 9 6" />
      </svg>

      {/* Quick status menu — v thumb zone, hore od karty */}
      {menuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }}
          />
          <div
            className="absolute bottom-full left-12 z-50 mb-1 flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {QUICK_STATUSES.map((s) => {
              const st = STATUS_STYLE[s] ?? STATUS_STYLE["Nový"];
              return (
                <button
                  key={s}
                  className="min-h-[32px] rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  style={{
                    background: optimisticStatus === s ? st.bg : "transparent",
                    color:      optimisticStatus === s ? st.text : "#475569",
                  }}
                  onClick={() => handleStatusChange(s)}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </>
      )}
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
