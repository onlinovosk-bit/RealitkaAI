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
    <div className="rounded-2xl border p-4 md:p-5" style={{ background: "#080D1A", borderColor: "#0F1F3D" }}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-base font-semibold" style={{ color: "#F0F9FF" }}>Prioritné príležitosti</h2>
          <p className="text-xs" style={{ color: "#475569" }}>
            Klienti s vysokým BRI alebo horúcim stavom.
          </p>
        </div>

        <Link
          href="/leads"
          className="rounded-xl border px-3 py-1.5 text-xs font-medium min-h-[32px] flex items-center"
          style={{ borderColor: "rgba(34,211,238,0.2)", color: "#22D3EE" }}
        >
          Všetky →
        </Link>
      </div>

      <div className="space-y-3">
        {priorityLeads.map((lead) => (
          <div
            key={lead.id}
            className="group rounded-xl border p-3 transition-all active:scale-[0.99]"
            style={{ background: "#0A1628", borderColor: "#112240" }}
          >
            <div className="flex items-center justify-between gap-3">
              <Link href={`/leads/${lead.id}`} className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: "#F0F9FF" }}>{lead.name}</div>
                <div className="truncate text-xs mt-0.5" style={{ color: "#64748B" }}>{lead.location}</div>
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
          <p className="text-sm text-center py-4" style={{ color: "#475569" }}>
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