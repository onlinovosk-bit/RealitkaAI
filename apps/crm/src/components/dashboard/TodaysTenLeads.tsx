"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/mock-data";
import { AI_PRIORITY_SK, priorityRank } from "@/lib/workflows/lead-ai-priority";
import { SLATE_HORIZON, WORKDESK_INNER_ROW, WORKDESK_PANEL } from "@/lib/slate-horizon-theme";

function sortForToday(l: Lead[]): Lead[] {
  return [...l].sort((a, b) => {
    const pr =
      priorityRank(b.aiPriority ?? null) - priorityRank(a.aiPriority ?? null);
    if (pr !== 0) return pr;
    return (b.score ?? 0) - (a.score ?? 0);
  });
}

export default function TodaysTenLeads({ leads }: { leads: Lead[] }) {
  const top = useMemo(() => sortForToday(leads).slice(0, 10), [leads]);
  const [busy, setBusy] = useState<string | null>(null);
  const [local, setLocal] = useState<Record<string, { p: string; r: string }>>({});

  async function savePriority(leadId: string) {
    const row = local[leadId];
    if (!row) return;
    setBusy(leadId);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aiPriority: row.p,
          aiReason: row.r,
          aiTriageManualLock: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Uloženie zlyhalo");
    } finally {
      setBusy(null);
    }
  }

  if (!top.length) {
    return (
      <section
        className="rounded-[20px] border p-4 md:p-5"
        style={{
          background: WORKDESK_PANEL.background,
          borderColor: WORKDESK_PANEL.borderColor,
          boxShadow: WORKDESK_PANEL.boxShadow,
        }}
      >
        <h2 className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>Dnešných 10</h2>
        <p className="mt-2 text-xs" style={{ color: SLATE_HORIZON.muted }}>Zatiaľ žiadne leady na zobrazenie.</p>
      </section>
    );
  }

  return (
    <section
      className="rounded-[20px] border p-4 md:p-5"
      style={{
        background: WORKDESK_PANEL.background,
        borderColor: WORKDESK_PANEL.borderColor,
        boxShadow: WORKDESK_PANEL.boxShadow,
      }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold" style={{ color: SLATE_HORIZON.deep }}>
          Dnešných 10 (AI priorita)
        </h2>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: SLATE_HORIZON.muted }}
        >
          W1 triage
        </span>
      </div>
      <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
        Zoradené podľa priority a skóre. Override zafixuje prioritu pred nočným cron-om.
      </p>
      <ul className="mt-4 space-y-3">
        {top.map((lead) => {
          const draft = local[lead.id] ?? {
            p: lead.aiPriority ?? "Stredná",
            r: lead.aiReason ?? "",
          };
          return (
            <li
              key={lead.id}
              className="rounded-2xl border p-3 text-sm"
              style={{
                background: WORKDESK_INNER_ROW.background,
                borderColor: WORKDESK_INNER_ROW.borderColor,
              }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="cursor-pointer font-medium transition-colors duration-200 hover:opacity-80"
                    style={{ color: SLATE_HORIZON.brandDeep }}
                  >
                    {lead.name}
                  </Link>
                  <p className="text-[11px]" style={{ color: SLATE_HORIZON.muted }}>
                    Skóre {lead.score} · {lead.status}
                    {lead.aiTriageAt ? ` · triáž ${new Date(lead.aiTriageAt).toLocaleString("sk-SK")}` : ""}
                  </p>
                  {lead.aiReason ? (
                    <p className="mt-1 text-xs" style={{ color: SLATE_HORIZON.navText }}>{lead.aiReason}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <select
                    className="cursor-pointer rounded-lg border px-2 py-1 text-xs outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={{
                      borderColor: SLATE_HORIZON.line,
                      background: "#fff",
                      color: SLATE_HORIZON.deep,
                    }}
                    value={draft.p}
                    onChange={(e) =>
                      setLocal((prev) => ({
                        ...prev,
                        [lead.id]: { ...draft, p: e.target.value },
                      }))
                    }
                  >
                    {AI_PRIORITY_SK.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Dôvod (voliteľné)"
                    className="rounded-lg border px-2 py-1 text-[11px] outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    style={{
                      borderColor: SLATE_HORIZON.line,
                      background: "#fff",
                      color: SLATE_HORIZON.deep,
                    }}
                    value={draft.r}
                    onChange={(e) =>
                      setLocal((prev) => ({
                        ...prev,
                        [lead.id]: { ...draft, r: e.target.value },
                      }))
                    }
                  />
                  <button
                    type="button"
                    disabled={busy === lead.id}
                    onClick={() => void savePriority(lead.id)}
                    className="cursor-pointer rounded-lg px-2 py-1 text-[11px] font-semibold text-white transition-opacity duration-200 hover:opacity-90 disabled:opacity-40"
                    style={{ background: SLATE_HORIZON.brand }}
                  >
                    {busy === lead.id ? "..." : "Uložiť prioritu"}
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
