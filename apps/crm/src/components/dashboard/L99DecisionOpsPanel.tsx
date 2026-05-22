"use client";

import { useMemo, useState } from "react";
import { SLATE_HORIZON, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

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
    <section
      className="mb-6 rounded-[20px] border p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
            L99 Decision Ops
          </p>
          <h3 className="mt-1 text-base font-bold" style={{ color: SLATE_HORIZON.ink }}>
            Kde sú peniaze · Kedy podpíše · Zachráň províziu
          </h3>
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1 block text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Príležitosť
        </label>
        <select
          value={selectedLeadId}
          onChange={(e) => setSelectedLeadId(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-400"
          style={{
            borderColor: WORKDESK_INNER_ROW.borderColor,
            background: WORKDESK_INNER_ROW.background,
            color: SLATE_HORIZON.ink,
          }}
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
        {(
          [
            ["score-lead", "1) Koľko mi prinesie?"],
            ["recompute-queue", "2) Komu volať ako prvému?"],
            ["closing-window", "3) Kedy inkasujem?"],
            ["rescue-trigger", "4) Zastav únik dealu"],
            ["micro-actions", "5) Akcia na dnes"],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            disabled={disabled}
            onClick={() => void run(action)}
            className="rounded-lg border px-3 py-2 text-xs font-semibold transition hover:border-blue-200 disabled:opacity-60"
            style={{
              borderColor: WORKDESK_INNER_ROW.borderColor,
              background: WORKDESK_INNER_ROW.background,
              color: SLATE_HORIZON.brandDeep,
            }}
          >
            {busy === action ? "Počítam…" : label}
          </button>
        ))}
      </div>

      <pre
        className="mt-3 max-h-64 overflow-auto rounded-lg border p-3 text-[11px]"
        style={{
          borderColor: WORKDESK_INNER_ROW.borderColor,
          background: SLATE_HORIZON.bg,
          color: SLATE_HORIZON.deep,
        }}
      >
        {output}
      </pre>
    </section>
  );
}
