"use client";

import { useState, useCallback, useEffect, useTransition } from "react";
import { CheckCircle, Mail, Phone } from "lucide-react";
import type { Lead } from "@/lib/leads-store";
import { getLeadDisplayScore, getLeadScoreUnavailableHint } from "@/lib/leads/lead-display-score";
import { getScoreDisplay } from "@/lib/leads/score-display";
import { LeadLastContact } from "./LeadLastContact";
import { LeadSourceBadge } from "./LeadSourceBadge";
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
  if (score >= 55) return "bg-yellow-100 text-yellow-700";
  if (score >= 25) return "bg-slate-100 text-slate-600";
  return "bg-red-100 text-red-700";
}

function exportToCsv(leads: Lead[]) {
  window.dispatchEvent(new CustomEvent('monitoring', { detail: { action: 'export_csv', count: leads.length } }));
  const headers = ["Meno", "Email", "Telefón", "Lokalita", "Rozpočet", "Typ", "Izby",
    "Financovanie", "Termín", "Zdroj", "Stav", "Score", "Maklér", "Posledný kontakt", "Poznámka"];
  const rows = leads.map((l) =>
    [l.name, l.email, l.phone, l.location, l.budget, l.propertyType, l.rooms,
      l.financing, l.timeline, l.source, l.status, String(getLeadDisplayScore(l)),
      l.aiPriority ?? "",
      l.aiReason ?? "",
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
    const av =
      field === "score"
        ? (getLeadDisplayScore(a) ?? -1)
        : String(a[field] ?? "");
    const bv =
      field === "score"
        ? (getLeadDisplayScore(b) ?? -1)
        : String(b[field] ?? "");
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
  { label: "Zdroj", field: null },
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

async function patchLeadStatus(id: string, status: Lead["status"]) {
  await fetch(`/api/leads/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, lastContact: new Date().toISOString().slice(0, 10) }),
  });
}

export default function LeadTable({ leads, onDelete }: LeadTableProps) {
  const [sortField, setSortField] = useState<SortField>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [, startTransition] = useTransition();

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
  const allSelected = sorted.length > 0 && selectedIds.length === sorted.length;

  const toggleAll = () => {
    setSelectedIds(allSelected ? [] : sorted.map((l) => l.id));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleBulkStatus = (status: Lead["status"]) => {
    const ids = [...selectedIds];
    startTransition(() => {
      void Promise.all(ids.map((id) => patchLeadStatus(id, status))).then(() =>
        setSelectedIds([]),
      );
    });
  };

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
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500 sticky top-0 z-20">
            <tr>
              {COLS.map((col, idx) => (
                <th
                  key={`${col.label}-${idx}`}
                  onClick={() => handleSort(col.field)}
                  className={`px-3 sm:px-5 py-3 font-medium ${col.field ? "cursor-pointer select-none hover:text-gray-700" : ""} ${col.align ?? ""} ${
                    col.sticky === "left"
                      ? "sticky left-0 z-30 bg-gray-50 border-r border-gray-200"
                      : ""
                  }`}
                  style={{ minWidth: col.sticky ? 220 : 120 }}
                >
                  {col.sticky ? (
                    <span className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Vybrať všetkých"
                        className="rounded border-gray-300"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span>Akcie</span>
                    </span>
                  ) : (
                    col.label
                  )}
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
                <td className="sticky left-0 z-20 border-r border-gray-100 bg-white px-3 py-3 sm:px-5 sm:py-4 group-hover:bg-gray-50">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(lead.id)}
                      onChange={() => toggleOne(lead.id)}
                      aria-label={`Vybrať ${lead.name}`}
                      className="rounded border-gray-300"
                    />
                  <LeadRowActions
                    lead={lead}
                    onDelete={(id) => {
                      window.dispatchEvent(
                        new CustomEvent("lead_action", { detail: { action: "delete_lead", id } })
                      );
                      onDelete(id);
                    }}
                  />
                  <div className="opacity-0 group-hover:opacity-100 transition flex gap-1 ml-1">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 text-green-700"
                        title="Zavolať"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                    {lead.email ? (
                      <a
                        href={`mailto:${lead.email}`}
                        className="p-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700"
                        title="Email"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </a>
                    ) : null}
                    <button
                      type="button"
                      className="p-1.5 rounded-md bg-purple-50 hover:bg-purple-100 text-purple-700"
                      title="Označiť ako Teplý"
                      onClick={(e) => {
                        e.stopPropagation();
                        void patchLeadStatus(lead.id, "Teplý");
                      }}
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  </div>
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[140px]">
                  <div className="font-medium text-gray-900 text-base md:text-sm">{lead.name}</div>
                  <div className="text-xs text-gray-500 break-all">{lead.email}</div>
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[90px]">
                  <LeadSourceBadge source={lead.source} />
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 text-gray-700 min-w-[120px]">{lead.location}</td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 text-gray-700 min-w-[100px]">{lead.budget}</td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[100px]">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                    {lead.status}
                  </span>
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[140px]">
                  {(() => {
                    const display = getScoreDisplay({
                      score: lead.score,
                      aiPriority: lead.aiPriority,
                      buyer_readiness_score: lead.buyer_readiness_score,
                      aiTriageAt: lead.aiTriageAt,
                      lastContact: lead.lastContact,
                    });
                    const scoreHint = getLeadScoreUnavailableHint(lead);
                    const numericScore = getLeadDisplayScore(lead);
                    return (
                      <div className="space-y-1">
                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            display.showScore && numericScore != null
                              ? getScoreClasses(numericScore)
                              : "bg-slate-100 text-slate-500"
                          } ${display.colorClass}`}
                          title={scoreHint ?? (display.sublabel || undefined)}
                        >
                          {display.label}
                          {display.sublabel ? (
                            <span className="ml-1 font-normal opacity-80">· {display.sublabel}</span>
                          ) : null}
                        </span>
                        {lead.aiReason ? (
                          <p className="text-[11px] leading-snug text-gray-500 line-clamp-2" title={lead.aiReason}>
                            {lead.aiReason}
                          </p>
                        ) : null}
                      </div>
                    );
                  })()}
                </td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 text-gray-700 min-w-[120px]">{lead.assignedAgent}</td>
                <td className="px-3 py-3 sm:px-5 sm:py-4 min-w-[120px]">
                  <LeadLastContact lastContact={lead.lastContact} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-gray-500 px-5 py-2 border-t border-gray-100 bg-gray-50/80">
          Ďalšie stĺpce: posuň tabuľku vpravo. Stĺpec <strong className="font-medium text-gray-700">Akcie</strong> ostáva vľavo prilepený.
        </p>
      </div>

      {selectedIds.length > 0 ? (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-xl px-4 py-3 flex items-center gap-3 shadow-2xl">
          <span className="text-sm font-medium">{selectedIds.length} vybraných</span>
          <button
            type="button"
            onClick={() => handleBulkStatus("Teplý")}
            className="text-xs bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg transition"
          >
            Označiť ako Teplý
          </button>
          <button
            type="button"
            onClick={() => handleBulkStatus("Nový")}
            className="text-xs bg-red-500/20 hover:bg-red-500/30 px-3 py-1.5 rounded-lg transition"
          >
            Reset na Nový
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="text-xs opacity-50 hover:opacity-100"
          >
            Zrušiť
          </button>
        </div>
      ) : null}
    </div>
  );
}
