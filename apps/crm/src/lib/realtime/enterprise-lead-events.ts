"use client";

import type { RealtimeChannel } from "@supabase/supabase-js";

import { supabaseClient } from "@/lib/supabase/client";

/**
 * Po novom zázname v lead_events obnoví insight panel (Enterprise).
 */
export function subscribeLeadEvents(
  agencyId: string | null,
  onChange: () => void
): () => void {
  const filter =
    agencyId != null && agencyId !== ""
      ? `agency_id=eq.${agencyId}`
      : undefined;

  const channel: RealtimeChannel = supabaseClient
    .channel("enterprise-lead-events")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "lead_events",
        ...(filter ? { filter } : {}),
      },
      () => {
        onChange();
      }
    )
    .subscribe();

  return () => {
    void supabaseClient.removeChannel(channel);
  };
}
