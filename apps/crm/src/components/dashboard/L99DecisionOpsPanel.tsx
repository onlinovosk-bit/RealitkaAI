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

export default function L99DecisionOpsPanel({ leads }: Props) {
  const [selectedLeadId, setSelectedLeadId] = useState<string>(leads[0]?.id ?? "");
  const [busy, setBusy] = useState<DecisionAction | null>(null);
  const [output, setOutput] = useState<string>('{ "info": "Vyber príležitosť a spusti operáciu." }');

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
        setOutput('{ "ok": false, "error": "Najprv vyber príležitosť." }');
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
    <section className="mb-6 rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/50 p-5 shadow-[0_0_24px_rgba(6,182,212,0.15)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300/90">L99 Decision Ops</p>
          <h3 className="mt-1 text-base font-bold text-white">Action Scoring / Closing Window / Rescue</h3>
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs text-slate-300">Príležitosť</label>
        <select
          value={selectedLeadId}
          onChange={(e) => setSelectedLeadId(e.target.value)}
          className="w-full rounded-lg border border-cyan-800/60 bg-slate-950/80 px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-500"
        >
          {leads.length === 0 ? (
            <option value="">Žiadne príležitosti</option>
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
        <button disabled={disabled} onClick={() => void run("score-lead")} className="rounded-lg border border-cyan-700/70 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-slate-900 disabled:opacity-60">
          {busy === "score-lead" ? "Počítam..." : "1) Score lead"}
        </button>
        <button disabled={disabled} onClick={() => void run("recompute-queue")} className="rounded-lg border border-cyan-700/70 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-slate-900 disabled:opacity-60">
          {busy === "recompute-queue" ? "Počítam..." : "2) Recompute queue"}
        </button>
        <button disabled={disabled} onClick={() => void run("closing-window")} className="rounded-lg border border-cyan-700/70 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-slate-900 disabled:opacity-60">
          {busy === "closing-window" ? "Počítam..." : "3) Closing window"}
        </button>
        <button disabled={disabled} onClick={() => void run("rescue-trigger")} className="rounded-lg border border-cyan-700/70 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-slate-900 disabled:opacity-60">
          {busy === "rescue-trigger" ? "Spúšťam..." : "4) Rescue trigger"}
        </button>
        <button disabled={disabled} onClick={() => void run("micro-actions")} className="rounded-lg border border-cyan-700/70 bg-slate-950/70 px-3 py-2 text-xs font-semibold text-cyan-200 hover:bg-slate-900 disabled:opacity-60">
          {busy === "micro-actions" ? "Plánujem..." : "5) Micro-actions"}
        </button>
      </div>

      <pre className="mt-3 max-h-64 overflow-auto rounded-lg border border-slate-700 bg-slate-950 p-3 text-[11px] text-cyan-200">
        {output}
      </pre>
    </section>
  );
}
