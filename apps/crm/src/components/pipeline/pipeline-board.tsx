"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PipelineSlideOver, {
  columns,
  getColumnAccent,
  getNextAction,
  getScoreClasses,
  getStatusClasses,
} from "@/components/pipeline/pipeline-slide-over";
import AgentStats from "@/components/pipeline/agent-stats";

export type PipelineLead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  budget: string;
  propertyType: string;
  rooms: string;
  financing: string;
  timeline: string;
  source: string;
  status: string;
  score: number;
  assignedAgent: string;
  lastContact: string;
  note: string;
};

export default function PipelineBoard({
  initialLeads,
}: {
  initialLeads: PipelineLead[];
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<PipelineLead[]>(initialLeads);
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<PipelineLead | null>(null);
  const [isSlideOpen, setIsSlideOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sourceFilter, setSourceFilter] = useState("Všetky zdroje");
  const [agentFilter, setAgentFilter] = useState("Všetci makléri");
  const [contactFilter, setContactFilter] = useState("Kedykoľvek");

  const sources = useMemo(
    () => ["Všetky zdroje", ...Array.from(new Set(initialLeads.map((lead) => lead.source))).sort()],
    [initialLeads]
  );

  const agents = useMemo(
    () => ["Všetci makléri", ...Array.from(new Set(initialLeads.map((lead) => lead.assignedAgent))).sort()],
    [initialLeads]
  );

  function matchesContactWindow(lastContact: string) {
    if (contactFilter === "Kedykoľvek") return true;
    const text = lastContact.toLowerCase();

    if (contactFilter === "Dnes") return text.includes("dnes") || text.includes("práve");
    if (contactFilter === "Včera") return text.includes("včera");
    if (contactFilter === "Tento týždeň") {
      return (
        text.includes("dnes") ||
        text.includes("včera") ||
        text.includes("pred 2 dň") ||
        text.includes("pred 3 dň") ||
        text.includes("pred týžd")
      );
    }

    return true;
  }

  const grouped = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    const filtered = leads.filter((lead) => {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        lead.name.toLowerCase().includes(normalizedQuery) ||
        lead.location.toLowerCase().includes(normalizedQuery);
      const matchesScore = lead.score >= minScore;
      const matchesSource = sourceFilter === "Všetky zdroje" || lead.source === sourceFilter;
      const matchesAgent = agentFilter === "Všetci makléri" || lead.assignedAgent === agentFilter;
      const matchesContact = matchesContactWindow(lead.lastContact);

      return matchesQuery && matchesScore && matchesSource && matchesAgent && matchesContact;
    });

    return columns.map((column) => ({
      column,
      leads: filtered
        .filter((lead) => lead.status === column)
        .sort((a, b) => b.score - a.score),
    }));
  }, [leads, query, minScore, sourceFilter, agentFilter, contactFilter]);

  function openLead(lead: PipelineLead) {
    setSelectedLead(lead);
    setIsSlideOpen(true);
  }

  function closeSlide() {
    setIsSlideOpen(false);
  }

  async function moveLead(leadId: string, newStatus: string) {
    const lead = leads.find((item) => item.id === leadId);
    if (!lead || lead.status === newStatus) return;

    const oldStatus = lead.status;
    const oldLeads = [...leads];

    const updatedLeads = leads.map((item) =>
      item.id === leadId
        ? {
            ...item,
            status: newStatus,
            lastContact: "Presunuté v stave klientov práve teraz",
          }
        : item
    );

    setLeads(updatedLeads);
    setSavingId(leadId);

    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: newStatus,
          lastContact: "Presunuté v stave klientov práve teraz",
          activityType: newStatus === "Obhliadka" ? "Obhliadka" : "Telefonat",
          activityText:
            newStatus === "Obhliadka"
              ? "Príležitosť bola presunutá do fázy obhliadky."
              : `Príležitosť bola presunutá do fázy ${newStatus}.`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa presunúť príležitosť.");
      }

      // Persist pipeline move to Supabase (fire-and-forget)
      fetch(`/api/leads/${leadId}/moves`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadName: lead.name,
          fromStatus: oldStatus,
          toStatus: newStatus,
        }),
      });

      if (selectedLead?.id === leadId) {
        setSelectedLead({
          ...lead,
          status: newStatus,
          lastContact: "Presunuté v stave klientov práve teraz",
        });
      }

      router.refresh();
    } catch (error) {
      setLeads(oldLeads);

      alert(
        error instanceof Error ? error.message : "Nepodarilo sa presunúť príležitosť."
      );
    } finally {
      setSavingId(null);
      setDraggedLeadId(null);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20";

  const labelClass = "mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500";

  return (
    <div className="space-y-6">
      <AgentStats leads={leads} />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className={labelClass}>
              Hľadať príležitosť
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Meno alebo lokalita"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className={labelClass}>
              Min. AI skóre ({minScore})
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="mt-3 w-full accent-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            />
          </label>

          <label className="block">
            <span className={labelClass}>
              Zdroj
            </span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className={inputClass}
            >
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>
              Maklér
            </span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className={inputClass}
            >
              {agents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className={labelClass}>
              Dátum posledného kontaktu
            </span>
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              className={inputClass}
            >
              {["Kedykoľvek", "Dnes", "Včera", "Tento týždeň"].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-5">
        {grouped.map(({ column, leads: columnLeads }) => (
          <div
            key={column}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (draggedLeadId) {
                moveLead(draggedLeadId, column);
              }
            }}
            className={`min-h-[520px] rounded-2xl border bg-slate-50/70 p-4 ${getColumnAccent(column)}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-950">{column}</h2>
                <p className="text-sm text-slate-500">{columnLeads.length} príležitostí</p>
              </div>

              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(column)}`}>
                {columnLeads.length}
              </span>
            </div>

            <div className="space-y-3">
              {columnLeads.map((lead) => (
                <button
                  key={lead.id}
                  type="button"
                  draggable
                  onDragStart={() => setDraggedLeadId(lead.id)}
                  onClick={() => openLead(lead)}
                  className={`w-full cursor-grab rounded-xl border bg-white p-4 text-left shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${getColumnAccent(lead.status)} ${
                    savingId === lead.id ? "opacity-60" : ""
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-slate-950">{lead.name}</h3>
                      <p className="text-xs text-slate-500">{lead.location}</p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreClasses(
                        lead.score
                      )}`}
                    >
                      {lead.score}/100
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-slate-600">
                    <p>
                      <span className="font-medium text-slate-950">Rozpočet:</span>{" "}
                      {lead.budget}
                    </p>
                    <p>
                      <span className="font-medium text-slate-950">Maklér:</span>{" "}
                      {lead.assignedAgent}
                    </p>
                    <p>
                      <span className="font-medium text-slate-950">Zdroj:</span>{" "}
                      {lead.source}
                    </p>
                  </div>

                  <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 p-3">
                    <p className="text-xs font-semibold text-orange-700">AI ďalší krok</p>
                    <p className="mt-1 text-xs text-slate-700">
                      {getNextAction(lead.score, lead.status)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-500">{lead.lastContact}</span>

                    <span className="rounded-full bg-orange-500 px-3 py-1 text-[11px] font-semibold text-white shadow-sm shadow-orange-500/20">
                      Otvoriť detail
                    </span>
                  </div>
                </button>
              ))}

              {columnLeads.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
                  Sem môžeš presunúť príležitosť.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <PipelineSlideOver
        lead={selectedLead}
        isOpen={isSlideOpen}
        onClose={closeSlide}
      />
    </div>
  );
}
