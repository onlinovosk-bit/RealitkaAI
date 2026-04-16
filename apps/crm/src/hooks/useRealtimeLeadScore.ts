"use client";

import { useEffect, useRef } from "react";
import type { Socket } from "socket.io-client";

export type LeadRealtimeUpdate = {
  leadId: string;
  score: number;
  at?: string;
};

/**
 * LIVE skóre: vždy SSE (/api/events/stream), voliteľne aj Socket.IO pri
 * NEXT_PUBLIC_REALTIME_SOCKET=1 a serveri `npm run dev:ws`.
 */
export function useRealtimeLeadScore(
  leadId: string | undefined,
  onUpdate: (u: LeadRealtimeUpdate) => void
) {
  const cb = useRef(onUpdate);
  cb.current = onUpdate;
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!leadId) return;

    const dispatch = (data: LeadRealtimeUpdate) => {
      if (data.leadId !== leadId) return;
      cb.current(data);
    };

    const es = new EventSource("/api/events/stream");
    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as {
          type?: string;
          payload?: Record<string, unknown>;
          at?: string;
        };
        if (msg.type !== "lead:update" || !msg.payload) return;
        const p = msg.payload;
        const lid = String(p.leadId ?? "");
        const score = Number(p.score);
        if (!Number.isFinite(score)) return;
        dispatch({ leadId: lid, score, at: msg.at });
      } catch {
        /* ignore */
      }
    };

    let cancelled = false;

    if (process.env.NEXT_PUBLIC_REALTIME_SOCKET === "1") {
      import("socket.io-client").then(({ io }) => {
        if (cancelled) return;
        const socket = io({
          path: "/socket.io",
          transports: ["websocket", "polling"],
        });
        socketRef.current = socket;
        socket.on(
          "lead:update",
          (data: { leadId?: string; score?: number; at?: string }) => {
            const lid = String(data.leadId ?? "");
            const score = Number(data.score);
            if (!Number.isFinite(score)) return;
            dispatch({ leadId: lid, score, at: data.at });
          }
        );
      });
    }

    return () => {
      cancelled = true;
      es.close();
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [leadId]);
}

/** Alias podľa architektonického názvu (lead updates). */
export const useRealtimeLeads = useRealtimeLeadScore;
