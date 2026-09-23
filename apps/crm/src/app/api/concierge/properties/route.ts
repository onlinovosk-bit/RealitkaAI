import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  conciergeSecretOk,
  resolveConciergeAgencyId,
} from "@/lib/concierge/agency";
import {
  filterConciergeProperties,
  type ConciergePropertyRow,
} from "@/lib/concierge/search";

/**
 * Website Concierge — read-only property search (N07 / M1).
 * Public under GO-W3-SHIP 2026-09-17. Tenant-locked to Smolko agency.
 * Fail-closed via evaluatePublicVisibility (SMO-B04 freshness).
 */
export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`concierge-props:${ip}`, 30, 60_000);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  if (
    !conciergeSecretOk(request.headers.get("x-concierge-secret"))
  ) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const locality = url.searchParams.get("locality") ?? undefined;
  const propertyType = url.searchParams.get("type") ?? undefined;
  const dealRaw = url.searchParams.get("deal") ?? undefined;
  const deal =
    dealRaw === "buy" || dealRaw === "rent" || dealRaw === "sell"
      ? dealRaw
      : undefined;
  const limit = Number.parseInt(url.searchParams.get("limit") ?? "20", 10);

  const agencyId = resolveConciergeAgencyId();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service unavailable." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("properties")
    .select(
      "id, title, location, price, type, rooms, status, transaction_type, realvia_updated_at, broker_name, broker_email, broker_phone, agency_id",
    )
    .eq("agency_id", agencyId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[concierge/properties]", error.message);
    return NextResponse.json(
      { ok: false, error: "Lookup failed." },
      { status: 500 },
    );
  }

  const rows = (data ?? []) as Array<ConciergePropertyRow & { agency_id: string }>;
  const properties = filterConciergeProperties(rows, {
    locality,
    propertyType,
    deal,
    limit: Number.isFinite(limit) ? limit : 20,
  });

  return NextResponse.json({
    ok: true,
    agencyId,
    count: properties.length,
    properties,
  });
}
