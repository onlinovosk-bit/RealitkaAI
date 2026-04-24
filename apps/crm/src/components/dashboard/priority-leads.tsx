"use client";

import Link from "next/link";
import type { Lead } from "@/lib/leads-store";
import type { PlanTier } from "@/lib/ai-engine";
import PaywallLock from "@/components/shared/PaywallLock";

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
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Prioritné príležitosti</h2>
          <p className="text-sm text-gray-500">
            Klienti s vysokým skóre alebo horúcim stavom.
          </p>
        </div>

        <Link
          href="/leads"
          className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Zobraziť všetky
        </Link>
      </div>

      <div className="space-y-3">
        {priorityLeads.map((lead) => (
          <div
            key={lead.id}
            className="group rounded-xl border border-slate-300/90 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-center justify-between gap-3">
              <Link href={`/leads/${lead.id}`} className="flex-1 min-w-0">
                <div className="truncate bg-gradient-to-r from-slate-900 via-cyan-600 to-slate-900 bg-[length:220%_100%] bg-left bg-clip-text font-medium text-gray-900 transition-all duration-500 group-hover:bg-right group-hover:text-transparent">
                  {lead.name}
                </div>
                <div className="truncate bg-gradient-to-r from-slate-500 via-indigo-500 to-slate-500 bg-[length:220%_100%] bg-left bg-clip-text text-sm text-gray-500 transition-all duration-500 group-hover:bg-right group-hover:text-transparent">
                  {lead.location}
                </div>
              </Link>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                  {lead.status}
                </span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getScoreClasses(lead.score)}`}>
                  {lead.score}
                </span>
              </div>
            </div>
            {/* Quick action buttons */}
            <div className="mt-2 flex gap-2">
              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all hover:scale-105"
                  style={{
                    background: "rgba(34,211,238,0.10)",
                    color: "#22D3EE",
                    border: "1px solid rgba(34,211,238,0.25)",
                  }}
                >
                  📞 Zavolať
                </a>
              ) : null}
              <a
                href={lead.phone ? `sms:${lead.phone}` : "#"}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all hover:scale-105"
                style={{
                  background: "rgba(99,102,241,0.10)",
                  color: "#A5B4FC",
                  border: "1px solid rgba(99,102,241,0.25)",
                }}
              >
                💬 SMS
              </a>
              <Link
                href={`/leads/${lead.id}`}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all hover:scale-105"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  color: "#94A3B8",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                → Detail
              </Link>
            </div>
          </div>
        ))}

        {priorityLeads.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Žiadne prioritné príležitosti zatiaľ.
          </p>
        )}

        {lockedCount > 0 && (
          <PaywallLock
            lockedCount={lockedCount}
            feature="prioritných príležitostí"
            titleOverride="+4 ďalších prioritných príležitostí"
            ctaLabel="✦ Odomknúť Active Force od 99 € mesačne"
          />
        )}
      </div>
    </div>
  );
}