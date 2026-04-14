"use client";

import { useEffect, useMemo, useState } from "react";
import AuthButton from "@/components/auth/auth-button";
import { AppModeToggle } from "@/components/layout/app-mode-toggle";
import { useAIActivityStore } from "@/store/aiActivityStore";
import { useLiveTyping } from "@/hooks/useSpaceInteractions";

function formatClock(date: Date) {
  const w = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][date.getDay()];
  const m = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"][date.getMonth()];
  const dd = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  const ss = String(date.getSeconds()).padStart(2, "0");
  return `${w} ${dd} ${m} ${date.getFullYear()}  ${hh}:${mm}:${ss}`;
}

export default function SpaceHeader({ userName }: { userName: string }) {
  const sofiaStatus = useAIActivityStore((s) => s.sofiaStatus);
  const sofiaStatusText = useAIActivityStore((s) => s.sofiaStatusText);
  const activities = useAIActivityStore((s) => s.activities);
  const [clock, setClock] = useState(() => formatClock(new Date()));

  const typed = useLiveTyping([sofiaStatusText, "Sofia sleduje nové príležitosti"], 32, 1200);
  const color =
    sofiaStatus === "active" ? "#10b981" : sofiaStatus === "thinking" ? "#f59e0b" : "#9ca3af";

  useEffect(() => {
    const i = setInterval(() => setClock(formatClock(new Date())), 1000);
    return () => clearInterval(i);
  }, []);

  const todayCount = useMemo(() => {
    const today = new Date().toDateString();
    return activities.filter((a) => new Date(a.timestamp).toDateString() === today).length;
  }, [activities]);

  return (
    <header
      className="sticky top-0 z-50 w-full border-b px-4 py-3 md:px-6"
      style={{ background: "rgba(8,12,28,0.85)", backdropFilter: "blur(18px)", borderColor: "rgba(99,102,241,0.2)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="h-2 w-2 rounded-full bg-indigo-500 animate-[logoPulse_2s_ease-in-out_infinite]" />
          <div>
            <p className="text-sm font-bold text-slate-100">Revolis.AI</p>
            <p className="text-[11px] text-slate-500">{userName}</p>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 items-center justify-center gap-4 lg:flex">
          <div className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full animate-[statusPulse_1.6s_ease-in-out_infinite]"
              style={{ background: color, color }}
            />
            <p className="max-w-[300px] truncate text-xs text-slate-300">{typed || sofiaStatusText}</p>
            <div className="ml-1 flex items-end gap-1">
              <span className="h-1 w-1 bg-indigo-300 animate-[wave1_1s_ease-in-out_infinite]" />
              <span className="h-2 w-1 bg-indigo-300 animate-[wave2_1s_ease-in-out_infinite]" />
              <span className="h-3 w-1 bg-indigo-300 animate-[wave3_1s_ease-in-out_infinite]" />
            </div>
          </div>
          <p className="font-mono text-xs tracking-widest text-indigo-300">{clock}</p>
        </div>

        <div className="flex items-center gap-3">
          <p className="hidden text-xs text-slate-300 sm:block">↑ {todayCount} leads dnes</p>
          <div className="relative h-8 w-8 rounded-full border border-indigo-400/40 bg-slate-900/70">
            <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500 text-[10px] text-white">
              {Math.min(todayCount, 9)}
            </span>
          </div>
          <AppModeToggle />
          <AuthButton />
        </div>
      </div>

      <div className="relative mt-2 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent">
        <div className="absolute left-0 h-px w-full bg-indigo-400/30 opacity-40 animate-[scanline_8s_linear_infinite]" />
      </div>
    </header>
  );
}

