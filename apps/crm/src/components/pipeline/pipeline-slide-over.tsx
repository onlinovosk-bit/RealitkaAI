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
  if (score >= 70) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-red-100 text-red-700 border-red-200";
}

function getStatusClasses(status: string) {
  switch (status) {
    case "Nový":
      return "bg-slate-100 text-slate-700";
    case "Teplý":
      return "bg-amber-100 text-amber-700";
    case "Horúci":
      return "bg-red-50 text-red-700 ring-1 ring-red-200";
    case "Obhliadka":
      return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
    case "Ponuka":
      return "bg-orange-50 text-orange-700 ring-1 ring-orange-200";
    default:
      return "bg-slate-100 text-slate-700";
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
      return "border-slate-200";
    case "Teplý":
      return "border-amber-200";
    case "Horúci":
      return "border-red-200";
    case "Obhliadka":
      return "border-emerald-200";
    case "Ponuka":
      return "border-orange-300";
    default:
      return "border-slate-200";
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
        className={`absolute inset-0 bg-slate-950/30 transition-opacity ${isOpen ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      <aside
        className={`absolute right-0 top-0 h-full w-full max-w-2xl overflow-y-auto border-l border-slate-200 bg-white shadow-2xl transition-transform ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">{lead.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              Detail klienta priamo z fáz príležitostí
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Zavrieť
          </button>
        </div>

        <div className="space-y-6 p-6">
          <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Skóre príležitosti</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{lead.score}/100</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Stav</p>
              <p className="mt-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(lead.status)}`}>
                  {lead.status}
                </span>
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">AI ďalší krok</p>
              <p className="mt-2 text-sm font-semibold text-orange-600">
                {getNextAction(lead.score, lead.status)}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Kontaktné a obchodné údaje</h3>

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
                  className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                >
                  <p className="text-sm text-slate-500">{label}</p>
                  <p className="mt-1 font-medium text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">AI odporúčanie</h3>

            <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50 p-4">
              <p className="text-sm font-semibold text-orange-700">Odporúčaný ďalší krok</p>
              <p className="mt-2 text-sm text-slate-700">
                {getNextAction(lead.score, lead.status)}
              </p>
            </div>

            <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Poznámka ku klientovi</p>
              <p className="mt-2 text-sm text-slate-600">{lead.note || "Bez poznámky."}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">História presunov vo fázach príležitostí</h3>

            <div className="mt-4 space-y-3">
              {loadingMoves ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                  Načítavam históriu...
                </div>
              ) : moves.length > 0 ? (
                moves.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-slate-950">
                        {item.fromStatus} → {item.toStatus}
                      </p>
                      <p className="text-xs text-slate-500">{item.changedAt}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-600">
                      Príležitosť <span className="font-medium text-slate-950">{item.leadName}</span> bola presunutá do nového stavu.
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500">
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
