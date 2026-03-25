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

  const grouped = useMemo(() => {
    return columns.map((column) => ({
      column,
      leads: leads
        .filter((lead) => lead.status === column)
        .sort((a, b) => b.score - a.score),
    }));
  }, [leads]);

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
            lastContact: "Presunuté v pipeline práve teraz",
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
          lastContact: "Presunuté v pipeline práve teraz",
          activityType: newStatus === "Obhliadka" ? "Obhliadka" : "Telefonat",
          activityText:
            newStatus === "Obhliadka"
              ? "Lead bol presunutý do fázy obhliadky."
              : `Lead bol presunutý do fázy ${newStatus}.`,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Nepodarilo sa presunúť lead.");
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
          lastContact: "Presunuté v pipeline práve teraz",
        });
      }

      router.refresh();
    } catch (error) {
      setLeads(oldLeads);

      alert(
        error instanceof Error ? error.message : "Nepodarilo sa presunúť lead."
      );
    } finally {
      setSavingId(null);
      setDraggedLeadId(null);
    }
  }

  return (
    <div className="space-y-6">
      <AgentStats leads={leads} />

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
            className={`min-h-[520px] rounded-2xl border-2 bg-white p-4 shadow-sm ${getColumnAccent(
              column
            )}`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-gray-900">{column}</h2>
                <p className="text-sm text-gray-500">{columnLeads.length} leadov</p>
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
                  className={`w-full cursor-grab rounded-xl border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-gray-300 hover:bg-white ${
                    savingId === lead.id ? "opacity-60" : ""
                  }`}
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{lead.name}</h3>
                      <p className="text-xs text-gray-500">{lead.location}</p>
                    </div>

                    <span
                      className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${getScoreClasses(
                        lead.score
                      )}`}
                    >
                      {lead.score}/100
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-600">
                    <p>
                      <span className="font-medium text-gray-800">Rozpočet:</span>{" "}
                      {lead.budget}
                    </p>
                    <p>
                      <span className="font-medium text-gray-800">Maklér:</span>{" "}
                      {lead.assignedAgent}
                    </p>
                    <p>
                      <span className="font-medium text-gray-800">Zdroj:</span>{" "}
                      {lead.source}
                    </p>
                  </div>

                  <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
                    <p className="text-xs font-semibold text-gray-900">AI ďalší krok</p>
                    <p className="mt-1 text-xs text-gray-600">
                      {getNextAction(lead.score, lead.status)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-500">{lead.lastContact}</span>

                    <span className="rounded-full bg-gray-100 px-3 py-1 text-[11px] font-semibold text-gray-700">
                      Otvoriť detail
                    </span>
                  </div>
                </button>
              ))}

              {columnLeads.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Sem môžeš presunúť lead.
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