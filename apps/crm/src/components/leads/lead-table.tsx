"use client";

import { useState, useCallback } from "react";
import { useEffect } from "react";
import type { Lead } from "@/lib/leads-store";
import LeadRowActions from "./lead-row-actions";

type SortField = "name" | "location" | "budget" | "status" | "score" | "assignedAgent" | "lastContact";
type SortDir = "asc" | "desc";

function getStatusClasses(status: Lead["status"]) {
  switch (status) {
    case "Horúci": return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "Teplý": return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
    case "Obhliadka": return "bg-blue-50 text-blue-700 ring-1 ring-blue-200";
    case "Ponuka": return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
    default: return "bg-slate-100 text-slate-700 ring-1 ring-slate-200";
  }
}

function getScoreClasses(score: number) {
  if (score >= 85) return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (score >= 70) return "bg-amber-50 text-amber-700 ring-1 ring-amber-200";
  return "bg-red-50 text-red-700 ring-1 ring-red-200";
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
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Príležitosti</h2>
          <p className="text-sm text-slate-500">
            Prehľad príležitostí — akcie sú vždy vľavo; tabuľku môžeš posúvať doprava pre ďalšie údaje.
          </p>
        </div>
        <button
          onClick={() => exportToCsv(sorted)}
          className="min-h-[44px] rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          Export CSV
        </button>
      </div>

      <div className="overflow-x-auto relative">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50 text-left text-slate-500">
            <tr>
              {COLS.map((col) => (
                <th
                  key={col.label}
                  onClick={() => handleSort(col.field)}
                  className={`px-3 py-3 font-medium sm:px-5 ${col.field ? "cursor-pointer select-none transition-colors hover:text-blue-700" : ""} ${col.align ?? ""} ${
                    col.sticky === "left"
                      ? "sticky left-0 z-30 border-r border-slate-200 bg-slate-50"
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

          <tbody className="divide-y divide-slate-100">
            {sorted.map((lead) => (
              <tr key={lead.id} className="group touch-manipulation transition-colors hover:bg-blue-50/40">
                <td className="sticky left-0 z-20 border-r border-slate-100 bg-white px-3 py-3 sm:px-5 sm:py-4 group-hover:bg-blue-50">
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
                <td className="min-w-[140px] px-3 py-3 sm:px-5 sm:py-4">
                  <div className="text-base font-medium text-slate-950 md:text-sm">{lead.name}</div>
                  <div className="break-all text-xs text-slate-500">{lead.email}</div>
                </td>
                <td className="min-w-[120px] px-3 py-3 text-slate-700 sm:px-5 sm:py-4">{lead.location}</td>
                <td className="min-w-[100px] px-3 py-3 font-medium text-emerald-700 sm:px-5 sm:py-4">{lead.budget}</td>
                <td className="min-w-[100px] px-3 py-3 sm:px-5 sm:py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="min-w-[80px] px-3 py-3 sm:px-5 sm:py-4">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getScoreClasses(lead.score)}`}>
                    {lead.score}/100
                  </span>
                </td>
                <td className="min-w-[120px] px-3 py-3 text-slate-700 sm:px-5 sm:py-4">{lead.assignedAgent}</td>
                <td className="min-w-[120px] px-3 py-3 text-slate-700 sm:px-5 sm:py-4">{lead.lastContact}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="border-t border-slate-100 bg-slate-50/80 px-5 py-2 text-xs text-slate-500">
          Ďalšie stĺpce: posuň tabuľku vpravo. Stĺpec <strong className="font-medium text-slate-700">Akcie</strong> ostáva vľavo prilepený.
        </p>
      </div>
    </div>
  );
}
