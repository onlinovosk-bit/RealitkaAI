"use client";

import { useState } from "react";
import type { SaaSLead } from "@/lib/sales-funnel-store";

const STATUS_LABELS: Record<SaaSLead["status"], string> = {
  new: "Nový",
  contacted: "Kontaktovaný",
  demo_booked: "Demo zarezervované",
  proposal_sent: "Ponuka odoslaná",
  won: "Vyhraté",
  lost: "Stratené",
};

const STATUS_COLORS: Record<SaaSLead["status"], string> = {
  new: "bg-blue-100 text-blue-700",
  contacted: "bg-yellow-100 text-yellow-700",
  demo_booked: "bg-violet-100 text-violet-700",
  proposal_sent: "bg-orange-100 text-orange-700",
  won: "bg-green-100 text-green-700",
  lost: "bg-red-100 text-red-700",
};

export default function SaasLeadsTable({
  initialLeads,
}: {
  initialLeads: SaaSLead[];
}) {
  const [leads, setLeads] = useState<SaaSLead[]>(initialLeads);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateStatus(id: string, status: SaaSLead["status"]) {
    setUpdating(id);
    setError(null);
    try {
      const res = await fetch("/api/sales-funnel/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Chyba pri aktualizácii.");
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status } : l))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepodarilo sa aktualizovať stav.");
    } finally {
      setUpdating(null);
    }
  }

  if (leads.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Zatiaľ žiadne demo requesty.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Spoločnosť</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Kontakt</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Agenti</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Mesto</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Zdroj</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Stav</th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Zmeniť stav</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {leads.map((lead) => (
              <tr key={lead.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{lead.company}</td>
                <td className="px-4 py-3">
                  <div className="text-gray-900">{lead.name}</div>
                  <div className="text-xs text-gray-500">{lead.email}</div>
                  {lead.phone && <div className="text-xs text-gray-500">{lead.phone}</div>}
                </td>
                <td className="px-4 py-3 text-gray-700">{lead.agentsCount}</td>
                <td className="px-4 py-3 text-gray-700">{lead.city || "—"}</td>
                <td className="px-4 py-3 text-gray-500">{lead.source}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[lead.status]}`}>
                    {STATUS_LABELS[lead.status]}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <select
                    disabled={updating === lead.id}
                    value={lead.status}
                    onChange={(e) => updateStatus(lead.id, e.target.value as SaaSLead["status"])}
                    className="rounded-lg border border-gray-300 px-2 py-1 text-xs disabled:opacity-50"
                  >
                    {(Object.keys(STATUS_LABELS) as SaaSLead["status"][]).map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
