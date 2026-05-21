"use client";

import Link from "next/link";
import { Radio } from "lucide-react";

import { useEventStream } from "@/hooks/useEventStream";
import { SLATE_HORIZON, WORKDESK_CARD } from "@/lib/slate-horizon-theme";

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
  const last = [...messages].reverse().find((m) => m.type === "BRI_UPDATE") as BriMessage | undefined;

  return (
    <div
      className="flex flex-col gap-2 rounded-xl border px-4 py-3"
      style={{
        background: WORKDESK_CARD.background,
        borderColor: WORKDESK_CARD.borderColor,
        boxShadow: WORKDESK_CARD.boxShadow,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: SLATE_HORIZON.brandDeep }}>
          BRI live
        </span>
        <div className="flex items-center gap-2">
          <Radio
            className="h-4 w-4"
            style={{ color: connected ? SLATE_HORIZON.greenDark : SLATE_HORIZON.amber }}
            aria-hidden
          />
          <span className="text-[11px] font-medium" style={{ color: connected ? SLATE_HORIZON.greenDark : SLATE_HORIZON.amber }}>
            {connected ? "Stream" : "Reconnect…"}
          </span>
        </div>
      </div>

      {last?.leadName != null && last.newScore != null ? (
        <p className="text-sm" style={{ color: SLATE_HORIZON.navText }}>
          <span className="font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
            {last.leadName}
          </span>
          {" · BRI "}
          <span className="tabular-nums">{last.previousScore}</span>
          {" → "}
          <span className="tabular-nums font-semibold" style={{ color: SLATE_HORIZON.brandDeep }}>
            {last.newScore}
          </span>
          {typeof last.delta === "number" && last.delta !== 0 ? (
            <span className="ml-1 text-xs" style={{ color: SLATE_HORIZON.muted }}>
              ({last.delta > 0 ? "+" : ""}
              {last.delta})
            </span>
          ) : null}
        </p>
      ) : (
        <p className="text-xs" style={{ color: SLATE_HORIZON.muted }}>
          Čakám na prvú udalosť z Buyer Readiness Index…
        </p>
      )}

      <Link href="/leads" className="text-[11px] font-medium hover:opacity-80" style={{ color: SLATE_HORIZON.brandDeep }}>
        Otvoriť leady →
      </Link>
    </div>
  );
}
