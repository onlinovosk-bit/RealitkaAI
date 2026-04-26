"use client";

import { Moon, ShieldAlert, Zap } from "lucide-react";

type IntelAlert = {
  id: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  type: string;
  location_focus?: string | null;
  created_at?: string;
};

function formatDetectedAgo(createdAt?: string) {
  if (!createdAt) return "Detegované nedávno";
  const diffMs = Date.now() - Date.parse(createdAt);
  const diffH = Math.max(1, Math.round(diffMs / (1000 * 60 * 60)));
  return `Detegované pred ${diffH}h`;
}

export default function IntelBrief({
  alerts,
  locked,
}: {
  alerts: IntelAlert[];
  locked?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-[3rem] border border-yellow-500/20 bg-gradient-to-br from-[#0a0a0b] to-[#111113] p-8 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
      <div className="pointer-events-none absolute inset-0 opacity-5 [background-image:linear-gradient(rgba(255,255,255,0.15)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.15)_1px,transparent_1px)] [background-size:24px_24px]" />

      <div className="mb-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-3">
            <ShieldAlert className="animate-pulse text-yellow-500" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black italic tracking-tighter text-white">COMPETITIVE INTEL</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-yellow-500/50">Protocol Authority Access</p>
          </div>
        </div>
        <button className="rounded-full bg-yellow-500 px-6 py-2 text-[10px] font-black uppercase text-black shadow-[0_0_20px_rgba(234,179,8,0.3)]">
          Live Radar
        </button>
      </div>

      <div className="grid gap-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="group relative cursor-pointer rounded-[2rem] border border-white/5 bg-white/[0.02] p-6 transition-all hover:border-yellow-500/30"
          >
            <div className="flex items-start justify-between">
              <div className="flex gap-4">
                <div className="mt-1">
                  <Moon className="text-blue-400 transition-colors group-hover:text-yellow-500" size={18} />
                </div>
                <div>
                  <h4 className="mb-1 text-sm font-bold text-white">{alert.title}</h4>
                  <p className="max-w-md text-xs leading-relaxed text-slate-500">{alert.description}</p>
                </div>
              </div>
              <span className="rounded-full border border-yellow-500/10 bg-yellow-500/5 px-3 py-1 text-[9px] font-black uppercase text-yellow-500/40">
                {formatDetectedAgo(alert.created_at)}
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <span className="rounded-md bg-white/5 px-2 py-1 text-[8px] font-bold text-slate-400">
                #{(alert.location_focus || "PRESOV").toUpperCase().replace(/\s+/g, "_")}
              </span>
              <span className="rounded-md bg-white/5 px-2 py-1 text-[8px] font-bold text-slate-400">
                #NABOR_OPTIMAL
              </span>
            </div>
          </div>
        ))}
      </div>

      {locked ? (
        <div className="absolute inset-0 flex items-center justify-center bg-[#010103]/70 backdrop-blur-sm">
          <div className="text-center">
            <Zap className="mx-auto mb-2 text-yellow-500" />
            <p className="text-xs font-black uppercase text-white">Unlock Strategic Dominance</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
