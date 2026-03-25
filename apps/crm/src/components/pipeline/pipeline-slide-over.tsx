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
      return "border-gray-300";
    case "Teplý":
      return "border-yellow-300";
    case "Horúci":
      return "border-green-300";
    case "Obhliadka":
      return "border-blue-300";
    case "Ponuka":
      return "border-purple-300";
    default:
      return "border-gray-300";
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
        className={`absolute inset-0 bg-black/30 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-gray-200 bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-gray-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
            <p className="mt-1 text-sm text-gray-500">
              Detail klienta priamo z pipeline
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Zavrieť
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Lead score</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">{lead.score}/100</p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-500">Stav</p>
              <p className="mt-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                  {lead.status}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm text-gray-500">AI ďalší krok</p>
              <p className="mt-2 text-sm font-semibold text-gray-900">
                {getNextAction(lead.score, lead.status)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">Kontaktné a obchodné údaje</h3>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Email</p>
                <p className="mt-1 font-medium text-gray-900">{lead.email}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Telefón</p>
                <p className="mt-1 font-medium text-gray-900">{lead.phone}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Lokalita</p>
                <p className="mt-1 font-medium text-gray-900">{lead.location}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Rozpočet</p>
                <p className="mt-1 font-medium text-gray-900">{lead.budget}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Typ nehnuteľnosti</p>
                <p className="mt-1 font-medium text-gray-900">
                  {lead.propertyType} • {lead.rooms}
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Financovanie</p>
                <p className="mt-1 font-medium text-gray-900">{lead.financing}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Čas kúpy</p>
                <p className="mt-1 font-medium text-gray-900">{lead.timeline}</p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Maklér</p>
                <p className="mt-1 font-medium text-gray-900">{lead.assignedAgent}</p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">AI odporúčanie</h3>

            <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <p className="text-sm font-semibold text-gray-900">Odporúčaný ďalší krok</p>
              <p className="mt-2 text-sm text-gray-700">
                {getNextAction(lead.score, lead.status)}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-gray-200 p-4">
              <p className="text-sm font-semibold text-gray-900">Poznámka ku klientovi</p>
              <p className="mt-2 text-sm text-gray-700">{lead.note || "Bez poznámky."}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900">História presunov v pipeline</h3>

            <div className="mt-4 space-y-3">
              {loadingMoves ? (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
                  Načítavam históriu...
                </div>
              ) : moves.length > 0 ? (
                moves.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-gray-900">
                        {item.fromStatus} → {item.toStatus}
                      </p>
                      <p className="text-xs text-gray-500">{item.changedAt}</p>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Lead <span className="font-medium">{item.leadName}</span> bol presunutý do nového stavu.
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-gray-300 p-4 text-sm text-gray-500">
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