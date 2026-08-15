import { createHash } from "crypto";
import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { errorResponse, okResponse } from "@/lib/api-response";
import { safeCompare } from "./safe-compare";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDER = "GOOGLE";
const EVENT_TYPE = "lead.form_submitted";

type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}

function isTruthyTestFlag(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1" || normalized === "yes";
  }
  return false;
}

function extractGoogleKey(url: URL, headerKey: string | null, body: JsonObject | null): string | null {
  return (
    asNonEmptyString(url.searchParams.get("google_key")) ??
    asNonEmptyString(body?.google_key) ??
    asNonEmptyString(headerKey)
  );
}

function extractIsTest(url: URL, body: JsonObject | null): boolean {
  return isTruthyTestFlag(url.searchParams.get("is_test")) || isTruthyTestFlag(body?.is_test);
}

function extractCustomerId(body: JsonObject | null, url: URL): string | null {
  const campaign = asObject(body?.campaign);
  const form = asObject(body?.form);
  const raw =
    asNonEmptyString(body?.customer_id) ??
    asNonEmptyString(body?.customerId) ??
    asNonEmptyString(body?.google_ads_customer_id) ??
    asNonEmptyString(campaign?.customer_id) ??
    asNonEmptyString(form?.customer_id) ??
    asNonEmptyString(url.searchParams.get("customer_id"));
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  return digits || raw;
}

function extractCampaignId(body: JsonObject | null): string | null {
  const campaign = asObject(body?.campaign);
  const form = asObject(body?.form);
  return (
    asNonEmptyString(body?.campaign_id) ??
    asNonEmptyString(body?.campaignId) ??
    asNonEmptyString(campaign?.id) ??
    asNonEmptyString(form?.campaign_id) ??
    asNonEmptyString(body?.form_id)
  );
}

function extractProviderEventId(body: JsonObject | null): string | null {
  return (
    asNonEmptyString(body?.lead_id) ??
    asNonEmptyString(body?.provider_event_id) ??
    asNonEmptyString(body?.leadId) ??
    asNonEmptyString(body?.google_lead_id)
  );
}

function isUniqueConflict(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "23505" || /duplicate|unique/i.test(error.message ?? "");
}

async function resolveAgencyId(
  supabase: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  customerId: string | null,
  campaignId: string | null,
): Promise<string | null> {
  if (customerId) {
    const { data, error } = await supabase
      .from("acquisition_accounts")
      .select("agency_id")
      .eq("provider", PROVIDER)
      .eq("customer_id", customerId)
      .maybeSingle();
    if (!error && data?.agency_id) return String(data.agency_id);
  }

  if (campaignId) {
    const { data, error } = await supabase
      .from("acquisition_campaigns")
      .select("agency_id")
      .eq("provider", PROVIDER)
      .eq("provider_campaign_id", campaignId)
      .maybeSingle();
    if (!error && data?.agency_id) return String(data.agency_id);
  }

  return null;
}

function alreadyProcessedResponse() {
  return okResponse({
    already_processed: true,
    status: "already_processed",
    lead_created: false,
    lead_id: null,
  });
}

/**
 * POST /api/acquisition/google/lead-webhook
 *
 * Stage 0: validate google_key, log acquisition_events, NEVER insert CRM leads.
 * is_test=true -> LOGGED_TEST. Non-test -> LOGGED_STAGE0. lead_id always NULL.
 */
export async function POST(request: Request) {
  try {
    const expected = process.env.GOOGLE_ADS_WEBHOOK_KEY?.trim();
    if (!expected) {
      return errorResponse("Unauthorized", 401);
    }

    const url = new URL(request.url);
    let body: JsonObject | null = null;
    const raw = await request.text();
    if (raw.trim()) {
      try {
        body = asObject(JSON.parse(raw));
        if (body === null) {
          return errorResponse("invalid_json", 400);
        }
      } catch {
        return errorResponse("invalid_json", 400);
      }
    }

    const providedKey = extractGoogleKey(url, request.headers.get("x-google-key"), body);
    if (!providedKey || !safeCompare(providedKey, expected)) {
      return errorResponse("Unauthorized", 401);
    }

    const supabase = createServiceRoleClient();
    if (!supabase) {
      return errorResponse("db_unavailable", 503);
    }

    const providerEventId = extractProviderEventId(body);
    if (!providerEventId) {
      return errorResponse("Missing provider_event_id (Google lead_id)", 400);
    }

    const customerId = extractCustomerId(body, url);
    const campaignId = extractCampaignId(body);
    const agencyId = await resolveAgencyId(supabase, customerId, campaignId);
    if (!agencyId) {
      return errorResponse("Unable to resolve agency from customer_id / campaign", 422);
    }

    const isTest = extractIsTest(url, body);
    const processingStatus = isTest ? "LOGGED_TEST" : "LOGGED_STAGE0";

    const { data: existing, error: existingError } = await supabase
      .from("acquisition_events")
      .select("id")
      .eq("agency_id", agencyId)
      .eq("provider", PROVIDER)
      .eq("provider_event_id", providerEventId)
      .eq("event_type", EVENT_TYPE)
      .maybeSingle();

    if (existingError) {
      console.error("acquisition lead-webhook idempotency lookup failed");
      return errorResponse("Failed to log acquisition event", 500);
    }

    if (existing) {
      console.log(
        JSON.stringify({
          status: "already_processed",
          provider: PROVIDER,
          provider_event_id: providerEventId,
          agency_id: agencyId,
          lead_created: false,
        }),
      );
      return alreadyProcessedResponse();
    }

    const insertPayload = {
      agency_id: agencyId,
      lead_id: null,
      provider: PROVIDER,
      event_type: EVENT_TYPE,
      provider_event_id: providerEventId,
      occurred_at: new Date().toISOString(),
      processing_status: processingStatus,
      processed_at: new Date().toISOString(),
      payload_hash: createHash("sha256")
        .update(
          JSON.stringify({
            provider: PROVIDER,
            event_type: EVENT_TYPE,
            provider_event_id: providerEventId,
            customer_id: customerId,
            campaign_id: campaignId,
          }),
        )
        .digest("hex"),
      metadata: {
        is_test: isTest,
        stage: "0",
        campaign_id: campaignId,
        form_id: asNonEmptyString(body?.form_id),
        lead_created: false,
      },
    };

    const { error: insertError } = await supabase.from("acquisition_events").insert(insertPayload);

    if (isUniqueConflict(insertError)) {
      console.log(
        JSON.stringify({
          status: "already_processed",
          provider: PROVIDER,
          provider_event_id: providerEventId,
          agency_id: agencyId,
          lead_created: false,
        }),
      );
      return alreadyProcessedResponse();
    }

    if (insertError) {
      console.error("acquisition lead-webhook insert failed");
      return errorResponse("Failed to log acquisition event", 500);
    }

    console.log(
      JSON.stringify({
        status: processingStatus,
        provider: PROVIDER,
        provider_event_id: providerEventId,
        agency_id: agencyId,
        is_test: isTest,
        lead_created: false,
      }),
    );

    return okResponse({
      logged: true,
      already_processed: false,
      status: isTest ? "logged_test" : "logged_stage0",
      processing_status: processingStatus,
      lead_created: false,
      lead_id: null,
    });
  } catch {
    console.error("acquisition lead-webhook failed (redacted)");
    return errorResponse("Internal error", 500);
  }
}

export async function GET() {
  return NextResponse.json({ ok: false, error: "Method Not Allowed" }, { status: 405 });
}
