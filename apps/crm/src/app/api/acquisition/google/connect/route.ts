import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { errorResponse, okResponse } from "@/lib/api-response";
import {
  GOOGLE_ADS_CREDENTIAL_REF,
  GoogleAdsCredentialsError,
  containsGoogleAdsSecret,
  loadGoogleAdsCredentials,
} from "@/lib/acquisition/credentials";

const ACCOUNT_SELECT =
  "id, agency_id, provider, customer_id, manager_customer_id, status, credential_type, billing_owner, created_at, connected_at, last_sync_at";

type ConnectBody = {
  agency_id?: unknown;
  customer_id?: unknown;
  manager_customer_id?: unknown;
};

/**
 * POST /api/acquisition/google/connect
 *
 * Inserts a PENDING acquisition_accounts row for the caller agency.
 * agency_id / customer_id from the client payload are IGNORED.
 * No live Google Ads API calls.
 */
export async function POST(request: Request) {
  let loadedCreds: ReturnType<typeof loadGoogleAdsCredentials> | null = null;

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

    // Auth context is the ONLY source of agency_id.
    const agencyId = profile.agency_id as string;

    // Parse body for forward-compat, but never trust tenant / customer fields.
    let body: ConnectBody = {};
    try {
      const raw = await request.json();
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        body = raw as ConnectBody;
      }
    } catch {
      body = {};
    }

    void body.agency_id;
    void body.customer_id;
    void body.manager_customer_id;

    try {
      loadedCreds = loadGoogleAdsCredentials();
    } catch (err) {
      if (err instanceof GoogleAdsCredentialsError) {
        return errorResponse(err.message, 503, { code: err.code, envName: err.envName });
      }
      throw err;
    }

    const customerId = loadedCreds.loginCustomerId;

    const insertPayload = {
      agency_id: agencyId,
      provider: "GOOGLE" as const,
      customer_id: customerId,
      manager_customer_id: customerId,
      status: "PENDING",
      credential_ref: GOOGLE_ADS_CREDENTIAL_REF,
      credential_type: "SERVICE_ACCOUNT",
      billing_owner: "CLIENT",
      consolidated_billing: false,
    };

    const { data: account, error: insertError } = await supabase
      .from("acquisition_accounts")
      .insert(insertPayload)
      .select(ACCOUNT_SELECT)
      .single();

    if (insertError) {
      const msg = insertError.message ?? "insert_failed";
      if (/duplicate|unique/i.test(msg)) {
        return errorResponse(
          "Google Ads account is already linked for this customer_id.",
          409,
        );
      }
      return errorResponse("Failed to create acquisition account", 500);
    }

    const safeAccount = {
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
    };

    const response = okResponse({ account: safeAccount });
    const serialized = JSON.stringify(safeAccount);
    if (loadedCreds && containsGoogleAdsSecret(serialized, loadedCreds)) {
      return errorResponse("Refusing to return credential material", 500);
    }
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (loadedCreds && containsGoogleAdsSecret(message, loadedCreds)) {
      console.error("acquisition google connect failed (redacted)");
      return errorResponse("Internal error", 500);
    }
    console.error("acquisition google connect failed:", message);
    return errorResponse("Internal error", 500);
  }
}

export async function GET() {
  return NextResponse.json(
    { ok: false, error: "Method Not Allowed" },
    { status: 405 },
  );
}