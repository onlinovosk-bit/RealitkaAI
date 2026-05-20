"use client";

import { useMemo, useState } from "react";

type LeadOption = {
  id: string;
  name: string;
};

type DecisionAction =
  | "score-lead"
  | "recompute-queue"
  | "closing-window"
  | "rescue-trigger"
  | "micro-actions";

type Props = {
  leads: LeadOption[];
};

type DecisionButton = {
  action: DecisionAction;
  label: string;
  busyLabel: string;
  hint: string;
  className: string;
};

const buttonBase =
  "min-h-11 rounded-xl border px-3 py-2.5 text-left text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-60";

const decisionButtons: DecisionButton[] = [
  {
    action: "score-lead",
    label: "1) Kto je pripravený kúpiť?",
    busyLabel: "Zisťujem, kto kúpi...",
    hint: "Priorita kupujúceho",
    className:
      "border-orange-500 bg-orange-500 text-white shadow-sm shadow-orange-500/20 hover:bg-orange-600 focus-visible:ring-orange-500",
  },
  {
    action: "recompute-queue",
    label: "2) Komu volať ako prvému?",
    busyLabel: "Radím prioritu volaní...",
    hint: "Poradie dnešných telefonátov",
    className:
      "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-300 hover:bg-blue-100 focus-visible:ring-blue-500",
  },
  {
    action: "closing-window",
    label: "3) Kedy inkasujem províziu?",
    busyLabel: "Počítam termín inkasa...",
    hint: "Zelený signál peňazí",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300 hover:bg-emerald-100 focus-visible:ring-emerald-500",
  },
  {
    action: "rescue-trigger",
    label: "4) Ako zachrániť províziu?",
    busyLabel: "Pripravujem záchranu...",
    hint: "Riziko úniku obchodu",
    className:
      "border-amber-200 bg-amber-50 text-amber-900 hover:border-amber-300 hover:bg-amber-100 focus-visible:ring-amber-500",
  },
  {
    action: "micro-actions",
    label: "5) Čo spraviť dnes?",
    busyLabel: "Píšem dnešný plán...",
    hint: "Najbližší konkrétny krok",
    className:
      "border-slate-200 bg-white text-slate-800 hover:border-blue-200 hover:bg-slate-50 focus-visible:ring-blue-500",
  },
];

export default function L99DecisionOpsPanel({ leads }: Props) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id ?? "");
  const [busy, setBusy] = useState<DecisionAction | null>(null);
  const [output, setOutput] = useState<string>('{ "info": "Vyber klienta - ukážeme ti, kde sú peniaze." }');

  const disabled = useMemo(() => busy !== null, [busy]);

  async function run(action: DecisionAction) {
    setBusy(action);
    try {
      const endpoints: Record<DecisionAction, { url: string; body?: Record<string, unknown> }> = {
        "score-lead": { url: "/api/ai/decision/score-lead", body: { leadId: selectedLeadId } },
        "recompute-queue": { url: "/api/ai/decision/recompute-queue" },
        "closing-window": { url: "/api/ai/closing-window/recompute", body: { leadId: selectedLeadId } },
        "rescue-trigger": { url: "/api/ai/rescue/trigger", body: { leadId: selectedLeadId, triggerType: "dashboard_manual" } },
        "micro-actions": { url: "/api/ai/micro-actions/schedule", body: { leadId: selectedLeadId } },
      };

      if (action !== "recompute-queue" && !selectedLeadId) {
        setOutput('{ "ok": false, "error": "Najprv vyber klienta." }');
        return;
      }

      const endpoint = endpoints[action];
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: endpoint.body ? JSON.stringify(endpoint.body) : undefined,
      });

      const data = (await res.json()) as Record<string, unknown>;
      setOutput(JSON.stringify({ httpStatus: res.status, ...data }, null, 2));
    } catch {
      setOutput('{ "ok": false, "error": "Chyba siete." }');
    } finally {
      setBusy(null);
    }
  }

  return (
    <section
      aria-busy={busy !== null}
      className="mb-6 overflow-hidden rounded-3xl border border-blue-100 bg-white shadow-sm shadow-slate-200/70"
    >
      <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50 via-white to-slate-50 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-blue-700">L99 Decision Ops</p>
            <h3 className="mt-2 text-xl font-extrabold tracking-tight text-slate-950">
              Kde mám peniaze dnes?
            </h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Vyber klienta a spusti rozhodnutie, ktoré maklérovi povie koho riešiť, kedy volať a kde hrozí únik provízie.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-semibold">
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-emerald-700">peniaze</span>
            <span className="rounded-full bg-amber-50 px-3 py-2 text-amber-700">riziko</span>
            <span className="rounded-full bg-blue-50 px-3 py-2 text-blue-700">priorita</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="mb-4">
          <label htmlFor="l99-decision-lead" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Kto ti môže dnes zarobiť
          </label>
          <select
            id="l99-decision-lead"
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 outline-none transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
          >
            {leads.length === 0 ? (
              <option value="">Nikto v zozname</option>
            ) : (
              leads.map((lead) => (
                <option key={lead.id} value={lead.id}>
                  {lead.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-5">
          {decisionButtons.map((item) => (
            <button
              key={item.action}
              type="button"
              disabled={disabled}
              onClick={() => void run(item.action)}
              className={`${buttonBase} ${item.className}`}
            >
              <span className="block">{busy === item.action ? item.busyLabel : item.label}</span>
              <span className="mt-1 block text-[11px] font-medium opacity-75">{item.hint}</span>
            </button>
          ))}
        </div>

        <pre className="mt-4 max-h-64 overflow-auto rounded-2xl border border-slate-200 bg-slate-950 p-4 text-[11px] leading-5 text-blue-100 shadow-inner">
          {output}
        </pre>
      </div>
    </section>
  );
}
