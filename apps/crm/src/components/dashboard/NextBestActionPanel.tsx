"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { Lead } from "@/lib/leads-store";
import { SLATE_HORIZON, WORKDESK_CARD, WORKDESK_INNER_ROW } from "@/lib/slate-horizon-theme";
import { sortLeadsByTriagePriority, truncateReason } from "@/lib/triage/top-priority-leads";
import { AiPriorityBadge } from "@/components/leads/AiPriorityBadge";
import { LeadSourceBadge } from "@/components/leads/LeadSourceBadge";

type Props = {
  leads: Lead[];
  loading?: boolean;
};

export function NextBestActionPanel({ leads, loading }: Props) {
  const top = sortLeadsByTriagePriority(leads).slice(0, 3);

  if (loading) {
    return (
      <div
        className="mb-6 animate-pulse rounded-3xl border p-6"
        style={{ background: WORKDESK_CARD.background, borderColor: WORKDESK_CARD.borderColor, minHeight: 140 }}
      />
    );
  }

  return (
    <section
      className="mb-6 overflow-hidden rounded-3xl border"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div
        className="border-b px-5 py-3"
        style={{ borderColor: SLATE_HORIZON.line, background: SLATE_HORIZON.soft }}
      >
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: SLATE_HORIZON.brandDeep }}>
          Teraz urob toto
        </span>
      </div>

      {top.length === 0 ? (
        <p className="p-5 text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Žiadne nové leady na triage.
        </p>
      ) : (
        <ol className="divide-y" style={{ borderColor: SLATE_HORIZON.line }}>
          {top.map((lead, index) => {
            const reason = truncateReason(lead.aiReason);
            return (
              <li
                key={lead.id}
                className="flex flex-col gap-3 p-5 md:flex-row md:items-center md:justify-between"
                style={{ background: index % 2 === 0 ? WORKDESK_CARD.background : WORKDESK_INNER_ROW.background }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold tabular-nums" style={{ color: SLATE_HORIZON.muted }}>
                      {index + 1}.
                    </span>
                    <span className="text-base font-bold truncate" style={{ color: SLATE_HORIZON.ink }}>
                      {lead.name}
                    </span>
                    <AiPriorityBadge priority={lead.aiPriority} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>
                    <LeadSourceBadge source={lead.source} />
                    {reason ? (
                      <span className="min-w-0" style={{ color: SLATE_HORIZON.navText }}>
                        {reason}
                      </span>
                    ) : null}
                  </div>
                </div>
                <Link
                  href={`/leads/${lead.id}`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                  style={{ background: SLATE_HORIZON.brandDeep }}
                >
                  Otvoriť lead
                  <ArrowRight size={16} />
                </Link>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
