// ================================================================
// Revolis.AI — Inbound Lead Webhook
// POST /api/webhooks/inbound-lead
// Called by marketing site, portals, or any form integration.
// Auth: Authorization: Bearer ${INBOUND_WEBHOOK_SECRET} (required)
// ================================================================
import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { processInboundLead } from "@/lib/inbound/process-lead";
import { createServiceRoleClient } from "@/lib/supabase/admin";

function safeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export async function POST(request: NextRequest) {
  const expected = process.env.INBOUND_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const provided = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!provided || !safeCompare(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const profileId = String(body.profileId ?? "").trim();

  if (!name || !profileId) {
    return NextResponse.json(
      { error: "Polia name a profileId sú povinné." },
      { status: 400 },
    );
  }

  try {
    const result = await processInboundLead(
      {
        name,
        profileId,
        email: body.email ? String(body.email) : undefined,
        phone: body.phone ? String(body.phone) : undefined,
        source: body.source ? String(body.source) : "Inbound",
        message: body.message ? String(body.message) : undefined,
        propertyType: body.propertyType ? String(body.propertyType) : undefined,
        location: body.location ? String(body.location) : undefined,
        budget: body.budget ? String(body.budget) : undefined,
      },
      supabase,
    );

    return NextResponse.json({ ok: true, ...result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "inbound_lead_failed";
    console.error("[inbound-lead]", message);
    const status = message === "profile_not_found" || message === "profile_missing_agency"
      ? 422
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
