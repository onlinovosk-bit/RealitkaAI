"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Lead } from "@/lib/mock-data";
import { AI_PRIORITY_SK, priorityRank } from "@/lib/workflows/lead-ai-priority";

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
      <section className="rounded-2xl border border-white/10 bg-slate-900/40 p-4 md:p-5">
        <h2 className="text-sm font-semibold text-slate-100">Dnešných 10</h2>
        <p className="mt-2 text-xs text-slate-500">Zatiaľ žiadne leady na zobrazenie.</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-cyan-500/20 bg-slate-900/50 p-4 md:p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold text-cyan-100">Dnešných 10 (AI priorita)</h2>
        <span className="text-[10px] uppercase tracking-wide text-slate-500">W1 triage</span>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        Zoradené podľa `Vysoká` → `Nízka`, potom skóre. Override zafixuje prioritu pred nočným cron-om.
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
              className="rounded-xl border border-white/5 bg-slate-950/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link
                    href={`/leads/${lead.id}`}
                    className="font-medium text-white hover:text-cyan-300"
                  >
                    {lead.name}
                  </Link>
                  <p className="text-[11px] text-slate-500">
                    Skóre {lead.score} · {lead.status}
                    {lead.aiTriageAt ? ` · triáž ${new Date(lead.aiTriageAt).toLocaleString("sk-SK")}` : ""}
                  </p>
                  {lead.aiReason ? (
                    <p className="mt-1 text-xs text-slate-400">{lead.aiReason}</p>
                  ) : null}
                </div>
                <div className="flex flex-col gap-1 min-w-[140px]">
                  <select
                    className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-xs text-white"
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
                    className="rounded-lg border border-white/10 bg-slate-900 px-2 py-1 text-[11px] text-white placeholder:text-slate-600"
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
                    className="rounded-lg bg-white/10 px-2 py-1 text-[11px] text-slate-200 hover:bg-white/15 disabled:opacity-40"
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
