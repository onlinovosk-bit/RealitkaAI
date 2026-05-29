"use client";

import { useEffect } from "react";
import Link from "next/link";
import {
  buildExecutiveSignals,
  formatMoneyEur,
  type ExecutiveSignal,
} from "@/lib/workdesk/executive-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { Lead } from "@/lib/leads-store";
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  leads: Lead[];
  loading?: boolean;
};

function urgencyBadge(urgency: ExecutiveSignal["urgency"]) {
  if (urgency === "critical") return SLATE_HORIZON_BADGES.hot;
  if (urgency === "high") return SLATE_HORIZON_BADGES.owner;
  return SLATE_HORIZON_BADGES.new;
}

export function AIPriorityStrip({ leads, loading }: Props) {
  const signals = buildExecutiveSignals(leads, 3);
  const items = signals;
  const placeholders = false;

  useEffect(() => {
    if (loading) return;
    trackWorkdeskEvent("priority_strip_view", { count: items.length, placeholders });
  }, [loading, items.length, placeholders]);

  if (loading) {
    return (
      <div
        className="sticky top-0 z-20 mb-5 overflow-hidden rounded-2xl border p-4"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: WORKDESK_CARD.borderColor,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <div className="flex animate-pulse gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-14 flex-1 rounded-xl" style={{ background: SLATE_HORIZON.bg }} />
          ))}
        </div>
      </div>
    );
  }

  if (!loading && items.length === 0) {
    return (
      <div
        className="sticky top-0 z-20 mb-5 overflow-hidden rounded-2xl border"
        style={{
          background: WORKDESK_CARD.background,
          borderColor: WORKDESK_CARD.borderColor,
          boxShadow: WORKDESK_CARD.boxShadow,
        }}
      >
        <div
          className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
          style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}
        >
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: SLATE_HORIZON.brandDeep }}>
            AI Priority Strip
          </span>
        </div>
        <div className="p-6 text-center text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Žiadne aktívne signály dnes. Leady sa zobrazia po synchronizácii z Realvia.
        </div>
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-20 mb-5 overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="flex items-center justify-between gap-3 border-b px-4 py-2.5"
        style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.bg }}
      >
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: SLATE_HORIZON.brandDeep }}>
          AI Priority Strip
        </span>
        <span className="text-[11px] font-semibold" style={{ color: SLATE_HORIZON.muted }}>
          {placeholders ? "Demo signály" : `${signals.length} aktívne`}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
        {items.map((signal) => {
          const badge = urgencyBadge(signal.urgency);
          const href = `/leads/${signal.leadId}`;

          return (
            <Link
              key={signal.leadId}
              href={href}
              onClick={() =>
                trackWorkdeskEvent("ai_recommendation_click", {
                  leadId: signal.leadId,
                  urgency: signal.urgency,
                })
              }
              className="rounded-xl border p-3 transition-all hover:shadow-sm"
              style={{ borderColor: SLATE_HORIZON.line, background: "#FFFFFF" }}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="truncate text-sm font-bold" style={{ color: SLATE_HORIZON.ink }}>
                  {signal.name}
                </span>
                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase"
                  style={{ background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}
                >
                  {signal.urgency}
                </span>
              </div>
              <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
                {signal.action}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px]">
                <span style={{ color: SLATE_HORIZON.navText }}>
                  {signal.confidence}% istota · {signal.timing}
                </span>
                {signal.moneyEur ? (
                  <span className="font-bold" style={{ color: SLATE_HORIZON.money }}>
                    {formatMoneyEur(signal.moneyEur)}
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AIPriorityStripSkeleton() {
  return <AIPriorityStrip leads={[]} loading />;
}
