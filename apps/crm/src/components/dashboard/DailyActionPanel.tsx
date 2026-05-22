"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/leads-store";
import type { PlanTier } from "@/lib/ai-engine";
import PaywallLock from "@/components/shared/PaywallLock";
import { Phone, MessageSquare, Home } from "lucide-react";
import { SLATE_HORIZON, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

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
    .slice(0, 4);

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
    .slice(0, 3);

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
  const showings = leads.filter((l) => l.status === "Obhliadka").slice(0, 3);
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

  // Fill remaining slots up to 9 actions with medium-priority follow-ups.
  if (actions.length < 9) {
    const filler = leads
      .filter((l) => !actions.find((a) => a.leadId === l.id))
      .sort((a, b) => b.score - a.score)
      .slice(0, 9 - actions.length);

    filler.forEach((l) => {
      actions.push({
        id: `extra-${l.id}`,
        leadId: l.id,
        leadName: l.name,
        text: "Krátky follow-up — potvrď ďalší krok",
        type: "followup",
        urgency: "medium",
      });
    });
  }

  return actions.slice(0, 9);
}

const TYPE_ICON: Record<Action["type"], ReactNode> = {
  call: <Phone className="h-4 w-4" aria-hidden />,
  followup: <MessageSquare className="h-4 w-4" aria-hidden />,
  showing: <Home className="h-4 w-4" aria-hidden />,
};

const URGENCY_STYLE: Record<Action["urgency"], string> = {
  high: "border-l-[3px] border-orange-400",
  medium: "border-l-[3px] border-slate-300",
};

const FREE_LIMIT = 3;

export default function DailyActionPanel({ leads, plan = "free" }: { leads: Lead[]; plan?: PlanTier }) {
  const actions = useMemo(() => buildActions(leads), [leads]);

  if (actions.length === 0) return null;

  const visibleActions = plan === "pro" ? actions : actions.slice(0, FREE_LIMIT);
  const lockedCount = plan === "pro" ? 0 : Math.max(0, actions.length - FREE_LIMIT);

  return (
    <div
      className="rounded-[20px] border p-5 mb-6"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}
          >
            Ranný briefing
          </span>
          <h2 className="mt-2 text-lg font-bold" style={{ color: SLATE_HORIZON.deep }}>
            Čo urobiť pred obedom
          </h2>
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {actions.length} akcií · ďalší krok s najvyšším dopadom na províziu
          </p>
        </div>
      </div>

      <ul className="space-y-2">
        {visibleActions.map((action) => (
          <li
            key={action.id}
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 ${URGENCY_STYLE[action.urgency]}`}
            style={{
              background: WORKDESK_INNER_ROW.background,
              borderColor: WORKDESK_INNER_ROW.borderColor,
            }}
          >
            <span className="flex-shrink-0" style={{ color: SLATE_HORIZON.brandDeep }}>
              {TYPE_ICON[action.type]}
            </span>
            <div className="flex-1 min-w-0">
              <Link
                href={`/leads/${action.leadId}`}
                className="cursor-pointer text-sm font-semibold hover:underline truncate block"
                style={{ color: SLATE_HORIZON.deep }}
              >
                {action.leadName}
              </Link>
              <p className="truncate text-sm" style={{ color: SLATE_HORIZON.muted }}>
                {action.text}
              </p>
            </div>
            <div className="flex gap-1.5 flex-shrink-0">
              {action.phone && (
                <a
                  href={`tel:${action.phone}`}
                  className={`flex min-h-11 cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold text-white transition-opacity duration-200 hover:opacity-90 ${SLATE_HORIZON.focusRing}`}
                  style={{ background: SLATE_HORIZON.ctaGradient }}
                >
                  <Phone className="h-3 w-3" aria-hidden />
                  Zavolať
                </a>
              )}
              {action.type === "followup" && (
                <Link
                  href={`/leads/${action.leadId}`}
                  className="cursor-pointer flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 hover:border-blue-200"
                  style={{
                    background: "#fff",
                    color: SLATE_HORIZON.deep,
                    borderColor: SLATE_HORIZON.line,
                  }}
                >
                  SMS
                </Link>
              )}
              {action.type === "showing" && (
                <Link
                  href={`/leads/${action.leadId}`}
                  className="cursor-pointer flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors duration-200 hover:border-blue-200"
                  style={{
                    background: "#fff",
                    color: SLATE_HORIZON.deep,
                    borderColor: SLATE_HORIZON.line,
                  }}
                >
                  Detail
                </Link>
              )}
            </div>
          </li>
        ))}
      </ul>

      {lockedCount > 0 && (
        <div className="mt-3">
          <PaywallLock
            lockedCount={lockedCount}
            feature="príležitostí"
            titleOverride="+8 ďalších príležitostí"
            ctaLabel="Odomknúť Protocol Authority od 449 € mesačne"
          />
        </div>
      )}
    </div>
  );
}
