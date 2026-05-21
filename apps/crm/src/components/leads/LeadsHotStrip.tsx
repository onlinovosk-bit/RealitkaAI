"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { buildExecutiveSignals, formatMoneyEur } from "@/lib/workdesk/executive-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { Lead } from "@/lib/leads-store";
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  leads: Lead[];
};

/** Leads screen NBA — „Kto je pripravený kúpiť dnes?" */
export function LeadsHotStrip({ leads }: Props) {
  const hotLeads = leads
    .filter((l) => l.score >= 75 || l.status === "Horúci")
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const source = hotLeads.length > 0 ? hotLeads : leads;
  const signals = buildExecutiveSignals(source, 3);

  const items =
    signals.length > 0
      ? signals
      : [
          {
            leadId: "demo-1",
            name: "Lucia Šimko",
            action: "Zavolaj teraz — vysoká priorita",
            timing: "volať do 15 min",
            confidence: 91,
            moneyEur: 7200,
            urgency: "critical" as const,
            status: "Horúci" as const,
          },
          {
            leadId: "demo-2",
            name: "Lukáš Nagy",
            action: "Posunúť do ponuky",
            timing: "posunúť pipeline",
            confidence: 87,
            moneyEur: null,
            urgency: "high" as const,
            status: "Teplý" as const,
          },
          {
            leadId: "demo-3",
            name: "Jana Horváth",
            action: "Pošli SMS s termínom obhliadky",
            timing: "poslať SMS dnes",
            confidence: 78,
            moneyEur: 5400,
            urgency: "medium" as const,
            status: "Obhliadka" as const,
          },
        ];

  return (
    <section
      className="mb-5 overflow-hidden rounded-2xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-4 py-3"
        style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.soft }}
      >
        <Flame size={16} style={{ color: SLATE_HORIZON_BADGES.hot.color }} />
        <h2 className="text-sm font-black uppercase tracking-wide" style={{ color: SLATE_HORIZON.brandDeep }}>
          Kto je pripravený kúpiť dnes?
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-2 p-3 md:grid-cols-3">
        {items.map((signal) => (
          <Link
            key={signal.leadId}
            href={signal.leadId.startsWith("demo-") ? "/leads" : `/leads/${signal.leadId}`}
            onClick={() =>
              trackWorkdeskEvent("hot_leads_click", {
                leadId: signal.leadId,
                score: signal.confidence,
              })
            }
            className="rounded-xl border p-3 transition-all hover:shadow-sm"
            style={{ borderColor: SLATE_HORIZON.line }}
          >
            <p className="text-sm font-bold" style={{ color: SLATE_HORIZON.ink }}>
              {signal.name}
            </p>
            <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              {signal.action}
            </p>
            <p className="mt-2 text-[11px]" style={{ color: SLATE_HORIZON.navText }}>
              {signal.confidence}% · {signal.timing}
              {signal.moneyEur ? ` · ${formatMoneyEur(signal.moneyEur)}` : ""}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
