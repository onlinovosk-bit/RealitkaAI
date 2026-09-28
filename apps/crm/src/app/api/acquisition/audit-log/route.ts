import { createClient } from "@/lib/supabase/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { incrementUsageMetric } from "@/lib/usage-metrics";

const EVENT_SELECT =
  "id, agency_id, lead_id, provider, event_type, provider_event_id, occurred_at, received_at, processing_status, error_code, processed_at, metadata";

const DEFAULT_LIMIT = 100;

/**
 * GET /api/acquisition/audit-log
 *
 * Tenant-scoped append-only history of acquisition_events.
 * agency_id comes ONLY from the logged-in profile — query agency_id is ignored.
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();

    if (profileError) {
      return errorResponse("Failed to load profile", 500);
    }

    if (!profile?.agency_id) {
      return errorResponse(
        "Chyba agency_id v profile — tenant scope nie je nastaveny.",
        403,
      );
    }

    const agencyId = profile.agency_id as string;

    // Client-supplied agency_id is never trusted.
    const requestedAgency = new URL(request.url).searchParams.get("agency_id");
    void requestedAgency;

    await incrementUsageMetric({
      agencyId,
      metric: "ai_openai_tokens",
      delta: 0,
    });

    const { data: events, error: listError } = await supabase
      .from("acquisition_events")
      .select(EVENT_SELECT)
      .eq("agency_id", agencyId)
      .order("received_at", { ascending: false })
      .limit(DEFAULT_LIMIT);

    if (listError) {
      return errorResponse("Failed to list acquisition events", 500);
    }

    return okResponse({ events: events ?? [] });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("acquisition audit-log failed:", message);
    return errorResponse("Internal error", 500);
  }
}
