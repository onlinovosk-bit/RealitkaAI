"use client";

import { useEffect, useRef, useState } from "react";

import { supabaseClient } from "@/lib/supabase/client";

export type PlatformRealtimeEvent = {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

/**
 * Supabase Realtime – INSERT na platform_events pre danú agentúru.
 */
export function usePlatformRealtime(agencyId: string | null | undefined) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<PlatformRealtimeEvent[]>([]);
  const channelRef = useRef<ReturnType<typeof supabaseClient.channel> | null>(
    null
  );

  useEffect(() => {
    if (!agencyId) {
      setConnected(false);
      return;
    }

    const channel = supabaseClient
      .channel(`platform_events:${agencyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "platform_events",
          filter: `agency_id=eq.${agencyId}`,
        },
        (payload) => {
          const row = payload.new as PlatformRealtimeEvent;
          setEvents((prev) => [...prev.slice(-49), row]);
        }
      )
      .subscribe((status) => {
        setConnected(status === "SUBSCRIBED");
      });

    channelRef.current = channel;

    return () => {
      void supabaseClient.removeChannel(channel);
      channelRef.current = null;
      setConnected(false);
    };
  }, [agencyId]);

  return { connected, events };
}
