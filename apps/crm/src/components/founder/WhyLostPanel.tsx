"use client";
import type { WhyLostReason } from "@/lib/founder/types";

export function WhyLostPanel({ reasons }: { reasons: WhyLostReason[] }) {
  if (!reasons.length) return null;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">Prečo sme prišli o obchod</h3>
      <ul className="space-y-2">
        {reasons.map((r) => (
          <li key={r.reason} className="flex items-center gap-2">
            <div className="h-1.5 rounded-full bg-red-500/40" style={{ width: `${r.percentage}%`, minWidth: "8px" }} />
            <span className="text-xs text-slate-400">{r.reason}</span>
            <span className="ml-auto text-xs text-slate-500">{r.count}×</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
