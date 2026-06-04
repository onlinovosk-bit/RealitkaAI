"use client";

import Link from "next/link";
import { Flame } from "lucide-react";
import { buildExecutiveSignals, formatMoneyEur } from "@/lib/workdesk/executive-signals";
import { trackWorkdeskEvent } from "@/lib/workdesk/ai-telemetry";
import type { Lead } from "@/lib/leads-store";
import { getLeadDisplayScore, isLeadBuyerReadyToday } from "@/lib/leads/lead-display-score";
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

type Props = {
  leads: Lead[];
};

/** Leads screen NBA — „Kto je pripravený kúpiť dnes?" */
export function LeadsHotStrip({ leads }: Props) {
  const readyLeads = leads
    .filter(isLeadBuyerReadyToday)
    .sort((a, b) => getLeadDisplayScore(b) - getLeadDisplayScore(a))
    .slice(0, 3);

  if (readyLeads.length === 0) {
    const hasTriagedLow = leads.some(
      (l) => l.aiTriageAt && l.aiPriority === "Nízka"
    );
    if (!hasTriagedLow && leads.length === 0) {
      return null;
    }

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
        <p className="px-4 py-4 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          {hasTriagedLow
            ? "Zatiaľ žiadny klient nie je pripravený na okamžitý nákup. Máte kontakty na kvalifikáciu (AI priorita Nízka) — začnite prvým telefonátom a doplňte údaje."
            : "Zatiaľ žiadny klient nespĺňa kritériá vysokej priority. Skontrolujte skóre, status alebo spustite AI triáž."}
        </p>
      </section>
    );
  }

  const signals = buildExecutiveSignals(readyLeads, 3);

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
        {signals.map((signal) => (
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
