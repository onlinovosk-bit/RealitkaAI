import { createServiceRoleClient } from "@/lib/supabase/admin";

/**
 * Zápis udalosti z backend jobu (cron) – obchádza RLS cez service role.
 */
export async function emitPlatformEventServer(input: {
  agencyId: string | null;
  eventType: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("platform_events").insert({
    agency_id: input.agencyId,
    event_type: input.eventType,
    payload: input.payload ?? {},
  });

  if (error) {
    console.warn("[platform-events] insert:", error.message);
  }
}
