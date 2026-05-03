"use client";

import { useEffect, useState } from "react";

export const columns = ["Nový", "Teplý", "Horúci", "Obhliadka", "Ponuka"];

type PipelineLead = {
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

function getScoreClasses(score: number) {
  if (score >= 85) return "bg-green-100 text-green-700 border-green-200";
  if (score >= 70) return "bg-yellow-100 text-yellow-700 border-yellow-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Nový":
      return "bg-gray-100 text-gray-700";
    case "Teplý":
      return "bg-yellow-100 text-yellow-700";
    case "Horúci":
      return "bg-green-100 text-green-700";
    case "Obhliadka":
      return "bg-blue-100 text-blue-700";
    case "Ponuka":
      return "bg-purple-100 text-purple-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function getNextAction(score: number, status: string) {
  if (status === "Nový") return "Zavolať do 15 minút";
  if (status === "Teplý") return "Poslať matching ponuky";
  if (status === "Horúci" && score >= 85) return "Naplánovať obhliadku ešte dnes";
  if (status === "Obhliadka") return "Potvrdiť termín a poslať pripomienku";
  if (status === "Ponuka") return "Follow-up k cenovej ponuke";
  return "Doplniť kvalifikáciu leadu";
}

function getColumnAccent(status: string) {
  switch (status) {
    case "Nový":
      return "border-slate-600";
    case "Teplý":
      return "border-yellow-600";
    case "Horúci":
      return "border-green-600";
    case "Obhliadka":
      return "border-blue-600";
    case "Ponuka":
      return "border-purple-600";
    default:
      return "border-slate-600";
  }
}

export function formatNow() {
  return new Intl.DateTimeFormat("sk-SK", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

// No-ops kept for backward compatibility
export function readHistory(): MoveHistoryItem[] { return []; }
export function writeHistory(_items: MoveHistoryItem[]) {}

export default function PipelineSlideOver({
  lead,
  isOpen,
  onClose,
}: {
  lead: PipelineLead | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [moves, setMoves] = useState<MoveHistoryItem[]>([]);
  const [loadingMoves, setLoadingMoves] = useState(false);

  useEffect(() => {
    if (!isOpen || !lead) return;
    setLoadingMoves(true);
    fetch(`/api/leads/${lead.id}/moves`)
      .then((r) => r.json())
      .then((d) => setMoves(d.moves ?? []))
      .catch(() => setMoves([]))
      .finally(() => setLoadingMoves(false));
  }, [isOpen, lead?.id]);

  if (!lead) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition ${isOpen ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!isOpen}
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
      >
        <div
          className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b px-6 py-5"
          style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
        >
          <div>
            <h2 className="text-2xl font-bold" style={{ color: "#F0F9FF" }}>{lead.name}</h2>
            <p className="mt-1 text-sm" style={{ color: "#64748B" }}>
              Detail klienta priamo z fáz príležitostí
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border px-3 py-2 text-sm font-medium transition"
            style={{
              borderColor: "rgba(34,211,238,0.2)",
              color: "#94A3B8",
              background: "rgba(34,211,238,0.06)",
            }}
          >
            Zavrieť
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div
              className="rounded-2xl border p-4"
              style={{ background: "#0A1628", borderColor: "#0F1F3D" }}
            >
              <p className="text-sm" style={{ color: "#64748B" }}>Skóre príležitosti</p>
              <p className="mt-2 text-2xl font-bold" style={{ color: "#F0F9FF" }}>{lead.score}/100</p>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{ background: "#0A1628", borderColor: "#0F1F3D" }}
            >
              <p className="text-sm" style={{ color: "#64748B" }}>Stav</p>
              <p className="mt-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                  {lead.status}
                </span>
              </p>
            </div>

            <div
              className="rounded-2xl border p-4"
              style={{ background: "#0A1628", borderColor: "#0F1F3D" }}
            >
              <p className="text-sm" style={{ color: "#64748B" }}>AI ďalší krok</p>
              <p className="mt-2 text-sm font-semibold" style={{ color: "#22D3EE" }}>
                {getNextAction(lead.score, lead.status)}
              </p>
            </div>
          </section>

          <section
            className="rounded-2xl border p-5"
            style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "#F0F9FF" }}>Kontaktné a obchodné údaje</h3>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              {[
                { label: "Email", value: lead.email },
                { label: "Telefón", value: lead.phone },
                { label: "Lokalita", value: lead.location },
                { label: "Rozpočet", value: lead.budget },
                { label: "Typ nehnuteľnosti", value: `${lead.propertyType} • ${lead.rooms}` },
                { label: "Financovanie", value: lead.financing },
                { label: "Čas kúpy", value: lead.timeline },
                { label: "Maklér", value: lead.assignedAgent },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="rounded-xl p-4"
                  style={{ background: "#0A1628", border: "1px solid #112240" }}
                >
                  <p className="text-sm" style={{ color: "#64748B" }}>{label}</p>
                  <p className="mt-1 font-medium" style={{ color: "#F0F9FF" }}>{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section
            className="rounded-2xl border p-5"
            style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "#F0F9FF" }}>AI odporúčanie</h3>

            <div
              className="mt-4 rounded-xl border p-4"
              style={{ background: "#0A1628", borderColor: "rgba(34,211,238,0.15)" }}
            >
              <p className="text-sm font-semibold" style={{ color: "#22D3EE" }}>Odporúčaný ďalší krok</p>
              <p className="mt-2 text-sm" style={{ color: "#94A3B8" }}>
                {getNextAction(lead.score, lead.status)}
              </p>
            </div>

            <div
              className="mt-4 rounded-xl border p-4"
              style={{ background: "#0A1628", borderColor: "#0F1F3D" }}
            >
              <p className="text-sm font-semibold" style={{ color: "#F0F9FF" }}>Poznámka ku klientovi</p>
              <p className="mt-2 text-sm" style={{ color: "#94A3B8" }}>{lead.note || "Bez poznámky."}</p>
            </div>
          </section>

          <section
            className="rounded-2xl border p-5"
            style={{ background: "#080D1A", borderColor: "#0F1F3D" }}
          >
            <h3 className="text-lg font-semibold" style={{ color: "#F0F9FF" }}>História presunov vo fázach príležitostí</h3>

            <div className="mt-4 space-y-3">
              {loadingMoves ? (
                <div
                  className="rounded-xl border border-dashed p-4 text-sm"
                  style={{ borderColor: "#0F1F3D", color: "#475569" }}
                >
                  Načítavam históriu...
                </div>
              ) : moves.length > 0 ? (
                moves.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border p-4"
                    style={{ background: "#0A1628", borderColor: "#112240" }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium" style={{ color: "#F0F9FF" }}>
                        {item.fromStatus} → {item.toStatus}
                      </p>
                      <p className="text-xs" style={{ color: "#475569" }}>{item.changedAt}</p>
                    </div>
                    <p className="mt-2 text-sm" style={{ color: "#94A3B8" }}>
                      Príležitosť <span className="font-medium" style={{ color: "#F0F9FF" }}>{item.leadName}</span> bola presunutá do nového stavu.
                    </p>
                  </div>
                ))
              ) : (
                <div
                  className="rounded-xl border border-dashed p-4 text-sm"
                  style={{ borderColor: "#0F1F3D", color: "#475569" }}
                >
                  Zatiaľ nie je zaznamenaná žiadna história presunov.
                </div>
              )}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}

export { getScoreClasses, getStatusClasses, getNextAction, getColumnAccent };
