"use client";
import type { GrowthDataPoint } from "@/lib/founder/types";

export function GrowthChart({ data }: { data: GrowthDataPoint[] }) {
  if (!data.length) return <div className="h-32 rounded-xl bg-white/5 flex items-center justify-center text-xs text-slate-500">Žiadne dáta</div>;

  const maxRev = Math.max(...data.map((d) => d.revenue), 1);

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-4">Rast tržieb</h3>
      <div className="flex items-end gap-2 h-24">
        {data.map((d) => (
          <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-cyan-500/70"
              style={{ height: `${(d.revenue / maxRev) * 80}px` }}
            />
            <span className="text-[10px] text-slate-500">{d.month.slice(5)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
