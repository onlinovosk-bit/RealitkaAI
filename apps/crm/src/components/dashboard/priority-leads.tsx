"use client";

import Link from "next/link";
import type { Lead } from "@/lib/leads-store";

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

interface PriorityLeadsProps {
  leads: Lead[];
}

export default function PriorityLeads({ leads }: PriorityLeadsProps) {
  const priorityLeads = leads
    .filter((lead) => lead.status === "Horúci" || lead.score >= 80)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Prioritné leady</h2>
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
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="block rounded-lg border border-gray-200 p-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium text-gray-900 truncate">{lead.name}</div>
                <div className="text-sm text-gray-500 truncate">{lead.location}</div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                  {lead.status}
                </span>
                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getScoreClasses(lead.score)}`}>
                  {lead.score}
                </span>
              </div>
            </div>
          </Link>
        ))}

        {priorityLeads.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-4">
            Žiadne prioritné leady zatiaľ.
          </p>
        )}
      </div>
    </div>
  );
}