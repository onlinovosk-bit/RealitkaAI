"use client";

import Link from "next/link";
import type { Lead } from "@/lib/leads-store";
import type { PlanTier } from "@/lib/ai-engine";
import PaywallLock from "@/components/shared/PaywallLock";
import { SLATE_HORIZON, SLATE_HORIZON_BADGES, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

function getStatusClasses(status: Lead["status"]) {
  switch (status) {
    case "Horúci":
      return "bg-green-100 text-green-700";
    case "Teplý":
      return "bg-yellow-100 text-yellow-700";
    case "Obhliadka":
      return "bg-blue-100 text-blue-700";
    case "Ponuka":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getScoreClasses(score: number) {
  if (score >= 85) return "bg-green-100 text-green-700";
  if (score >= 70) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

const FREE_LIMIT = 3;

interface PriorityLeadsProps {
  leads: Lead[];
  plan?: PlanTier;
}

export default function PriorityLeads({ leads, plan = "free" }: PriorityLeadsProps) {
  const allPriorityLeads = leads
    .filter((lead) => lead.status === "Horúci" || lead.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const priorityLeads = plan === "pro" ? allPriorityLeads : allPriorityLeads.slice(0, FREE_LIMIT);
  const lockedCount = plan === "pro" ? 0 : Math.max(0, allPriorityLeads.length - FREE_LIMIT);

  return (
    <div
      className="rounded-[20px] border p-4 md:p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <span
            className="mb-2 inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{
              background: SLATE_HORIZON_BADGES.hot.bg,
              color: SLATE_HORIZON_BADGES.hot.color,
              border: `1px solid ${SLATE_HORIZON_BADGES.hot.border}`,
            }}
          >
            Poradie volaní
          </span>
          <h2 className="text-base font-semibold" style={{ color: SLATE_HORIZON.deep }}>
            Komu volať ako prvému
          </h2>
          <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
            BRI a horúci stav — kde je najbližšia provízia.
          </p>
        </div>

        <Link
          href="/leads"
          className={`flex min-h-11 cursor-pointer items-center rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors duration-200 hover:border-blue-200 ${SLATE_HORIZON.focusRing}`}
          style={{ borderColor: SLATE_HORIZON.line, color: SLATE_HORIZON.brandDeep }}
        >
          Všetky →
        </Link>
      </div>

      <div className="space-y-3">
        {priorityLeads.map((lead) => (
          <div
            key={lead.id}
            className="group cursor-pointer rounded-2xl border p-3 transition-colors duration-200 hover:border-blue-200"
            style={{
              background: WORKDESK_INNER_ROW.background,
              borderColor: WORKDESK_INNER_ROW.borderColor,
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <Link href={`/leads/${lead.id}`} className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
                  {lead.name}
                </div>
                <div className="mt-0.5 truncate text-xs" style={{ color: SLATE_HORIZON.muted }}>
                  {lead.location}
                  {lead.budget ? (
                    <>
                      {" "}
                      ·{" "}
                      <span style={{ color: SLATE_HORIZON.money, fontWeight: 600 }}>{lead.budget}</span>
                    </>
                  ) : null}
                </div>
              </Link>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                  {lead.status}
                </span>
                <span className={`rounded-full px-2 py-1 text-xs font-bold ${getScoreClasses(lead.score)}`}>
                  {lead.score}
                </span>
              </div>
            </div>
          </div>
        ))}

        {priorityLeads.length === 0 && (
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            Zatiaľ žiadne horúce príležitosti.
          </p>
        )}
      </div>

      {lockedCount > 0 && (
        <div className="mt-4">
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
