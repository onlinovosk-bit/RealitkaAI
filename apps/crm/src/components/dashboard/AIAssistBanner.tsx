"use client";

import { memo, useMemo } from "react";
import { getSalesScript } from "@/lib/sales/sales-script";

export const AIAssistBanner = memo(function AIAssistBanner() {
  const line = useMemo(() => getSalesScript()[0] ?? "", []);

  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-gradient-to-r from-emerald-950/50 to-slate-900/80 p-4 shadow-[0_0_24px_rgba(16,185,129,0.12)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-300/90">
        AI Assist Mode
      </p>
      <p className="mt-1 font-medium text-emerald-50">AI Assist Mode je zapnutý</p>
      <p className="mt-1 text-sm text-emerald-200/80">AI ti pomáha robiť lepšie rozhodnutia.</p>
      <p className="mt-1 text-xs text-slate-400">{line}</p>
    </div>
  );
});
