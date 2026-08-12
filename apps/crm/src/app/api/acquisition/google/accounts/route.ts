import { createClient } from "@/lib/supabase/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import { incrementUsageMetric } from "@/lib/usage-metrics";

const ACCOUNT_SELECT =
  "id, agency_id, provider, customer_id, manager_customer_id, status, credential_type, billing_owner, created_at, connected_at, last_sync_at";

/**
 * GET /api/acquisition/google/accounts
 *
 * Tenant-scoped list of Google acquisition accounts for the caller agency.
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

    await incrementUsageMetric({
      agencyId,
      metric: "ai_openai_tokens",
      delta: 0,
    });

    const { data: accounts, error: listError } = await supabase
      .from("acquisition_accounts")
      .select(ACCOUNT_SELECT)
      .eq("agency_id", agencyId)
      .eq("provider", "GOOGLE")
      .order("created_at", { ascending: false });

    if (listError) {
      return errorResponse("Failed to list acquisition accounts", 500);
    }

    const safeAccounts = (accounts ?? []).map((account) => ({
      id: account.id,
      agency_id: account.agency_id,
      provider: account.provider,
      customer_id: account.customer_id,
      manager_customer_id: account.manager_customer_id,
      status: account.status,
      credential_type: account.credential_type,
      billing_owner: account.billing_owner,
      created_at: account.created_at,
      connected_at: account.connected_at,
      last_sync_at: account.last_sync_at,
    }));

    return okResponse({ accounts: safeAccounts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("acquisition google accounts failed:", message);
    return errorResponse("Internal error", 500);
  }
}