"use client";
import { useEffect, useState } from "react";

type Plan = { today: string[]; thisWeek: string[] };

export function AiDailyPlanPanel() {
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    fetch("/api/founder/ai-plan").then((r) => r.json()).then((d) => { if (d.ok) setPlan(d.plan); });
  }, []);

  if (!plan) return <div className="animate-pulse h-32 rounded-xl bg-white/5" />;

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
      <h3 className="text-sm font-semibold text-white mb-3">AI Denný plán</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-cyan-400 mb-2">Dnes</p>
          <ul className="space-y-1">{plan.today.map((t) => <li key={t} className="text-xs text-slate-300">• {t}</li>)}</ul>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Tento týždeň</p>
          <ul className="space-y-1">{plan.thisWeek.map((t) => <li key={t} className="text-xs text-slate-400">• {t}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
