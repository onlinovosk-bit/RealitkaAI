"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

import { useEventStream } from "@/hooks/useEventStream";

type BriMessage = {
  type: string;
  activityType?: string;
  leadName?: string;
  newScore?: number;
  previousScore?: number;
  delta?: number;
  at?: string;
};

export function BriLivePulse() {
  const { messages, connected } = useEventStream("/api/ai/bri-stream");
  const last = [...messages].reverse().find((m) => m.type === "BRI_UPDATE") as
    | BriMessage
    | undefined;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-indigo-500/20 bg-slate-950/80 px-4 py-3 backdrop-blur-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-indigo-400/90">
          BRI live
        </span>
        <div className="flex items-center gap-2">
          <Radio
            className={`h-4 w-4 ${connected ? "text-emerald-400" : "text-amber-500"}`}
            aria-hidden
          />
          <span
            className={`text-[11px] font-medium ${connected ? "text-emerald-400/90" : "text-amber-500/90"}`}
          >
            {connected ? "Stream" : "Reconnect…"}
          </span>
        </div>
      </div>

      {last?.leadName != null && last.newScore != null ? (
        <p className="text-sm text-slate-200">
          <span className="font-semibold text-indigo-300">{last.leadName}</span>
          {" · BRI "}
          <span className="tabular-nums text-slate-100">{last.previousScore}</span>
          {" → "}
          <span className="tabular-nums font-semibold text-cyan-300">
            {last.newScore}
          </span>
          {typeof last.delta === "number" && last.delta !== 0 ? (
            <span className="ml-1 text-xs text-slate-500">
              ({last.delta > 0 ? "+" : ""}
              {last.delta})
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-xs text-slate-500">
          Čakám na prvú udalosť z Buyer Readiness Index…
        </p>
      )}

      <Link
        href="/leads"
        className="text-[11px] font-medium text-indigo-400/90 hover:text-indigo-300"
      >
        Otvoriť leady →
      </Link>
    </div>
  );
}
