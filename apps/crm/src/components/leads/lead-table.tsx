"use client";

import { useState, useCallback } from "react";
import { useEffect } from "react";
import type { Lead } from "@/lib/leads-store";
import LeadRowActions from "./lead-row-actions";

type SortField = "name" | "location" | "budget" | "status" | "score" | "assignedAgent" | "lastContact";
type SortDir = "asc" | "desc";

function getStatusClasses(status: Lead["status"]) {
  switch (status) {
    case "Horúci": return "bg-green-100 text-green-700";
    case "Teplý": return "bg-yellow-100 text-yellow-700";
    case "Obhliadka": return "bg-blue-100 text-blue-700";
    case "Ponuka": return "bg-purple-100 text-purple-700";
    default: return "bg-gray-100 text-gray-700";
  }
}

function getScoreClasses(score: number) {
  if (score >= 85) return "bg-green-100 text-green-700";
  if (score >= 70) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

function exportToCsv(leads: Lead[]) {
  window.dispatchEvent(new CustomEvent('monitoring', { detail: { action: 'export_csv', count: leads.length } }));
  const headers = ["Meno", "Email", "Telefón", "Lokalita", "Rozpočet", "Typ", "Izby",
    "Financovanie", "Termín", "Zdroj", "Stav", "Score", "Maklér", "Posledný kontakt", "Poznámka"];
  const rows = leads.map((l) =>
    [l.name, l.email, l.phone, l.location, l.budget, l.propertyType, l.rooms,
      l.financing, l.timeline, l.source, l.status, String(l.score),
      l.assignedAgent, l.lastContact, l.note]
      .map((v) => `"${(v ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `prilezitosti_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function sortLeads(leads: Lead[], field: SortField, dir: SortDir): Lead[] {
  return [...leads].sort((a, b) => {
    const av = field === "score" ? a[field] : String(a[field] ?? "");
    const bv = field === "score" ? b[field] : String(b[field] ?? "");
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

const COLS: {
  label: string;
  field: SortField | null;
  align?: string;
  sticky?: "left";
}[] = [
  { label: "Akcie", field: null, align: "text-left", sticky: "left" },
  { label: "Klient", field: "name" },
  { label: "Lokalita", field: "location" },
  { label: "Rozpočet", field: "budget" },
  { label: "Stav", field: "status" },
  { label: "Score", field: "score" },
  { label: "Maklér", field: "assignedAgent" },
  { label: "Posledný kontakt", field: "lastContact" },
];

interface LeadTableProps {
  leads: Lead[];
  onDelete: (id: string) => void;
}

export default function LeadTable({ leads, onDelete }: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = useCallback((field: SortField | null) => {
    if (!field) return;
    setSortField((prev) => {
      if (prev === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return field;
      }
      setSortDir("desc");
      return field;
    });
  }, []);

  const sorted = sortLeads(leads, sortField, sortDir);

  // Monitoring hook pre mazanie
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail && e.detail.action === 'delete_lead') {
        window.dispatchEvent(new CustomEvent('monitoring', { detail: { action: 'delete_lead', id: e.detail.id } }));
      }
    };
    window.addEventListener('lead_action', handler);
    return () => window.removeEventListener('lead_action', handler);
  }, []);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Príležitosti</h2>
          <p className="text-sm text-gray-500">
            Prehľad príležitostí — akcie sú vždy vľavo; tabuľku môžeš posúvať doprava pre ďalšie údaje.
          </p>
        </div>
        <button
          onClick={() => exportToCsv(sorted)}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto relative">
        <div className="absolute left-0 top-0 h-full w-2 bg-gradient-to-r from-white/90 pointer-events-none z-10" />
        <div className="absolute right-0 top-0 h-full w-2 bg-gradient-to-l from-white/90 pointer-events-none z-10" />
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 sticky top-0 z-20">
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.label}
                  onClick={() => handleSort(col.field)}
                  className={`px-3 sm:px-5 py-3 font-medium ${col.field ? "cursor-pointer select-none hover:text-gray-700" : ""} ${col.align ?? ""} ${
                    col.sticky === "left"
                      ? "sticky left-0 z-30 bg-gray-50 border-r border-gray-200/90 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.08)]"
                      : ""
                  }`}
                  style={{ minWidth: col.sticky ? 200 : 120 }}
                >
                  {col.label}
                  {col.field && (
                    <span className="ml-1">
                      {sortField === col.field
                        ? sortDir === "asc" ? "↑" : "↓"
                        : <span className="text-gray-300">↕</span>}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {sorted.map((lead) => (
              <tr key={lead.id} className="group touch-manipulation hover:bg-gray-50">
                <td className="sticky left-0 z-20 border-r border-gray-100 bg-white px-3 py-3 sm:px-5 sm:py-4 shadow-[4px_0_12px_-4px_rgba(0,0,0,0.06)] group-hover:bg-gray-50">
                  <LeadRowActions
                    lead={lead}
                    onDelete={(id) => {
                      window.dispatchEvent(
                        new CustomEvent("lead_action", { detail: { action: "delete_lead", id } })
                      );
                      onDelete(id);
                    }}
                  />
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[140px]">
                  <div className="font-medium text-gray-900 text-base md:text-sm">{lead.name}</div>
                  <div className="text-xs text-gray-500 break-all">{lead.email}</div>
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 text-gray-700 min-w-[120px]">{lead.location}</td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 text-gray-700 min-w-[100px]">{lead.budget}</td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[100px]">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[80px]">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getScoreClasses(lead.score)}`}>
                    {lead.score}/100
                  </span>
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 text-gray-700 min-w-[120px]">{lead.assignedAgent}</td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 text-gray-700 min-w-[120px]">{lead.lastContact}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 px-5 py-2 border-t border-gray-100 bg-gray-50/80">
          Ďalšie stĺpce: posuň tabuľku vpravo. Stĺpec <strong className="font-medium text-gray-700">Akcie</strong> ostáva vľavo prilepený.
        </p>
      </div>
    </div>
  );
}
