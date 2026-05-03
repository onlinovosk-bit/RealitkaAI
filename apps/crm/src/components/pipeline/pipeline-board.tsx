"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import PipelineSlideOver, {
  columns,
  formatNow,
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

type MoveHistoryItem = {
  id: string;
  leadId: string;
  leadName: string;
  fromStatus: string;
  toStatus: string;
  changedAt: string;
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

  const inputStyle = {
    background: "#050914",
    border: "1px solid rgba(34,211,238,0.2)",
    color: "#F0F9FF",
  } as const;

  const labelStyle = { color: "#64748B" } as const;

  return (
    <div className="space-y-6">
      <AgentStats leads={leads} />

      <section
        className="rounded-2xl border p-4"
        style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
      >
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={labelStyle}>
              Hľadať príležitosť
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Meno alebo lokalita"
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={labelStyle}>
              Min. AI skóre ({minScore})
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={minScore}
              onChange={(e) => setMinScore(Number(e.target.value))}
              className="mt-2 w-full accent-cyan-400"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={labelStyle}>
              Zdroj
            </span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {sources.map((source) => (
                <option key={source} value={source}>
                  {source}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={labelStyle}>
              Maklér
            </span>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
            >
              {agents.map((agent) => (
                <option key={agent} value={agent}>
                  {agent}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide" style={labelStyle}>
              Dátum posledného kontaktu
            </span>
            <select
              value={contactFilter}
              onChange={(e) => setContactFilter(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={inputStyle}
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
            className={`min-h-[520px] rounded-2xl border-2 p-4 ${getColumnAccent(column)}`}
            style={{ background: "#080D1A" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "#F0F9FF" }}>{column}</h2>
                <p className="text-sm" style={{ color: "#64748B" }}>{columnLeads.length} príležitostí</p>
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
                  className={`w-full cursor-grab rounded-xl border p-4 text-left transition ${getColumnAccent(lead.status)} ${
                    savingId === lead.id ? "opacity-60" : ""
                  }`}
                  style={{ background: "#0A1628" }}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium" style={{ color: "#F0F9FF" }}>{lead.name}</h3>
                      <p className="text-xs" style={{ color: "#64748B" }}>{lead.location}</p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreClasses(
                        lead.score
                      )}`}
                    >
                      {lead.score}/100
                    </span>
                  </div>

                  <div className="space-y-2 text-sm" style={{ color: "#94A3B8" }}>
                    <p>
                      <span className="font-medium" style={{ color: "#CBD5E1" }}>Rozpočet:</span>{" "}
                      {lead.budget}
                    </p>
                    <p>
                      <span className="font-medium" style={{ color: "#CBD5E1" }}>Maklér:</span>{" "}
                      {lead.assignedAgent}
                    </p>
                    <p>
                      <span className="font-medium" style={{ color: "#CBD5E1" }}>Zdroj:</span>{" "}
                      {lead.source}
                    </p>
                  </div>

                  <div
                    className="mt-4 rounded-lg border p-3"
                    style={{ background: "#050914", borderColor: "#0F1F3D" }}
                  >
                    <p className="text-xs font-semibold" style={{ color: "#22D3EE" }}>AI ďalší krok</p>
                    <p className="mt-1 text-xs" style={{ color: "#94A3B8" }}>
                      {getNextAction(lead.score, lead.status)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs" style={{ color: "#475569" }}>{lead.lastContact}</span>

                    <span
                      className="rounded-full px-3 py-1 text-[11px] font-semibold"
                      style={{ background: "rgba(34,211,238,0.08)", color: "#22D3EE" }}
                    >
                      Otvoriť detail
                    </span>
                  </div>
                </button>
              ))}

              {columnLeads.length === 0 && (
                <div
                  className="rounded-xl border border-dashed p-4 text-sm"
                  style={{ borderColor: "#0F1F3D", color: "#475569" }}
                >
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
