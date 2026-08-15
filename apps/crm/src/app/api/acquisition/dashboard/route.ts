import { createClient } from "@/lib/supabase/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { loadAcquisitionDashboard, type DashboardSupabase } from "@/lib/acquisition/load-dashboard";

/**
 * GET /api/acquisition/dashboard
 *
 * Tenant-scoped read-only snapshot: Google accounts, campaigns, recent events.
 * Relies on auth agency_id + RLS; never accepts agency_id from the client.
 */
export async function GET() {
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
        "Chýba agency_id v profile — tenant scope nie je nastavený.",
        403,
      );
    }

    const agencyId = profile.agency_id as string;
    const dashboard = await loadAcquisitionDashboard(
      supabase as unknown as DashboardSupabase,
      agencyId,
    );

    return okResponse({
      accounts: dashboard.accounts,
      campaigns: dashboard.campaigns,
      events: dashboard.events,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("acquisition dashboard failed:", message);
    if (
      message === "Failed to list acquisition accounts" ||
      message === "Failed to list acquisition campaigns" ||
      message === "Failed to list acquisition events"
    ) {
      return errorResponse(message, 500);
    }
    return errorResponse("Internal error", 500);
  }
}
