"use client";

import { useMemo } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/leads-store";
import type { PlanTier } from "@/lib/ai-engine";
import PaywallLock from "@/components/shared/PaywallLock";

interface Action {
  id: string;
  leadId: string;
  leadName: string;
  text: string;
  type: "call" | "followup" | "showing";
  urgency: "high" | "medium";
  phone?: string;
}

function daysSince(dateStr: string | null | undefined): number {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function buildActions(leads: Lead[]): Action[] {
  const actions: Action[] = [];

  // Hot leads to call
  const hotLeads = leads
    .filter((l) => l.status === "Horúci" || l.score >= 85)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  hotLeads.forEach((l) => {
    actions.push({
      id: `call-${l.id}`,
      leadId: l.id,
      leadName: l.name,
      text: `Zavolaj — skóre ${l.score}, stav: ${l.status}`,
      type: "call",
      urgency: "high",
      phone: l.phone,
    });
  });

  // Leads waiting 2+ days without contact
  const waiting = leads
    .filter((l) => {
      const days = daysSince(l.lastContact);
      return days >= 2 && (l.status as string) !== "Uzavretý" && (l.status as string) !== "Stratený";
    })
    .sort((a, b) => {
      const da = daysSince(a.lastContact);
      const db = daysSince(b.lastContact);
      return db - da;
    })
    .slice(0, 2);

  waiting.forEach((l) => {
    const days = daysSince(l.lastContact);
    // avoid duplicate with hot leads
    if (!hotLeads.find((h) => h.id === l.id)) {
      actions.push({
        id: `followup-${l.id}`,
        leadId: l.id,
        leadName: l.name,
        text: `Čaká ${days} ${days === 1 ? "deň" : days < 5 ? "dni" : "dní"} — pošli správu`,
        type: "followup",
        urgency: days >= 4 ? "high" : "medium",
      });
    }
  });

  // Showings scheduled
  const showings = leads.filter((l) => l.status === "Obhliadka").slice(0, 2);
  showings.forEach((l) => {
    if (!actions.find((a) => a.leadId === l.id)) {
      actions.push({
        id: `showing-${l.id}`,
        leadId: l.id,
        leadName: l.name,
        text: "Potvrď obhliadku — zavolaj deň vopred",
        type: "showing",
        urgency: "medium",
      });
    }
  });

  return actions.slice(0, 6);
}

const TYPE_ICON: Record<Action["type"], string> = {
  call: "📞",
  followup: "💬",
  showing: "🏠",
};

const URGENCY_STYLE: Record<Action["urgency"], string> = {
  high: "border-l-[3px] border-cyan-400",
  medium: "border-l-[3px] border-slate-600",
};

const FREE_LIMIT = 3;

export default function DailyActionPanel({ leads, plan = "free" }: { leads: Lead[]; plan?: PlanTier }) {
  const actions = useMemo(() => buildActions(leads), [leads]);

  if (actions.length === 0) return null;

  const visibleActions = plan === "pro" ? actions : actions.slice(0, FREE_LIMIT);
  const lockedCount = plan === "pro" ? 0 : Math.max(0, actions.length - FREE_LIMIT);

  return (
    <div
      className="rounded-2xl border p-5 mb-6"
      style={{
        background: "linear-gradient(135deg, #050F2A 0%, #071028 100%)",
        borderColor: "#0F2A5A",
        boxShadow: "0 0 40px rgba(34,211,238,0.06)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
            style={{ background: "rgba(34,211,238,0.15)", color: "#22D3EE" }}
          >
            ⚡
          </span>
          <div>
            <h2 className="text-sm font-bold" style={{ color: "#F0F9FF" }}>
              Dnes urob
            </h2>
            <p className="text-[11px]" style={{ color: "#475569" }}>
              {actions.length} akcií na základe AI prioritizácie
            </p>
          </div>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide"
          style={{ background: "rgba(34,211,238,0.12)", color: "#22D3EE" }}
        >
          AI
        </span>
      </div>

      {/* Actions */}
      <ul className="space-y-2">
        {visibleActions.map((action) => (
          <li
            key={action.id}
            className={`flex items-center gap-3 rounded-xl px-4 py-3 ${URGENCY_STYLE[action.urgency]}`}
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <span className="text-base flex-shrink-0">{TYPE_ICON[action.type]}</span>
            <div className="flex-1 min-w-0">
              <Link
                href={`/leads/${action.leadId}`}
                className="text-sm font-semibold hover:underline truncate block"
                style={{ color: "#CBD5E1" }}
              >
                {action.leadName}
              </Link>
              <p className="text-[11px] truncate" style={{ color: "#475569" }}>
                {action.text}
              </p>
            </div>
            {/* Quick actions */}
            <div className="flex gap-1.5 flex-shrink-0">
              {action.phone && (
                <a
                  href={`tel:${action.phone}`}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:scale-105"
                  style={{
                    background: "rgba(34,211,238,0.15)",
                    color: "#22D3EE",
                    border: "1px solid rgba(34,211,238,0.3)",
                  }}
                >
                  📞 Zavolať
                </a>
              )}
              {action.type === "followup" && (
                <Link
                  href={`/leads/${action.leadId}`}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:scale-105"
                  style={{
                    background: "rgba(99,102,241,0.15)",
                    color: "#A5B4FC",
                    border: "1px solid rgba(99,102,241,0.3)",
                  }}
                >
                  💬 Správa
                </Link>
              )}
              {action.type === "showing" && (
                <Link
                  href={`/leads/${action.leadId}`}
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-all hover:scale-105"
                  style={{
                    background: "rgba(16,185,129,0.15)",
                    color: "#34D399",
                    border: "1px solid rgba(16,185,129,0.3)",
                  }}
                >
                  🏠 Detail
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      {lockedCount > 0 && (
        <div className="mt-3">
          <PaywallLock lockedCount={lockedCount} feature="denných akcií" />
        </div>
      )}
    </div>
  );
}
