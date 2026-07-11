"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/leads-store";
import { getActionQueueLeads } from "@/lib/modules/revenue-intelligence";
import { SLATE_HORIZON, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

type ActionQueuePanelProps = {
  leads: Lead[];
  onLeadAction?: (leadId: string) => Promise<void>;
};

export function ActionQueuePanel({ leads, onLeadAction }: ActionQueuePanelProps) {
  const queue = useMemo(() => getActionQueueLeads(leads), [leads]);
  const [busyLeadId, setBusyLeadId] = useState<string | null>(null);

  async function executeAction(leadId: string) {
    if (!onLeadAction) return;
    setBusyLeadId(leadId);
    try {
      await onLeadAction(leadId);
    } finally {
      setBusyLeadId(null);
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
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
            style={{ background: SLATE_HORIZON.soft, color: SLATE_HORIZON.brandDeep }}
          >
            Action Queue
          </span>
          <h2 className="mt-2 text-lg font-bold" style={{ color: SLATE_HORIZON.deep }}>
            Nekontaktované leady
          </h2>
          <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
            {queue.length} čaká na prvý hovor (posledných 14 dní)
          </p>
        </div>
      </div>

      {queue.length === 0 ? (
        <p className="text-sm" style={{ color: SLATE_HORIZON.muted }}>
          Action Queue je prázdna. Zobrazia sa len čerstvé leady v stave Nový z posledných 14 dní.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {queue.slice(0, 20).map((lead) => (
            <li
              key={lead.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3"
              style={{
                background: WORKDESK_INNER_ROW.background,
                borderColor: WORKDESK_INNER_ROW.borderColor,
              }}
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/leads/${lead.id}`}
                  className="block truncate text-sm font-semibold hover:underline"
                  style={{ color: SLATE_HORIZON.deep }}
                >
                  {lead.name}
                </Link>
                <p className="truncate text-xs" style={{ color: SLATE_HORIZON.muted }}>
                  {lead.phone || "bez telefónu"} · {lead.email || "bez e-mailu"}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => void executeAction(lead.id)}
                  disabled={busyLeadId === lead.id}
                  className="rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: SLATE_HORIZON.ctaGradient }}
                >
                  {busyLeadId === lead.id ? "Spracúvam..." : "Volať"}
                </button>
                <button
                  type="button"
                  onClick={() => void executeAction(lead.id)}
                  disabled={busyLeadId === lead.id}
                  className="rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:border-blue-200"
                  style={{
                    borderColor: SLATE_HORIZON.line,
                    color: SLATE_HORIZON.deep,
                    background: "#fff",
                  }}
                >
                  Napísať
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
