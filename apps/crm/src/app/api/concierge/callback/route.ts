import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/admin";
import { rateLimit } from "@/lib/rate-limit";
import {
  conciergeSecretOk,
  resolveConciergeAgencyId,
} from "@/lib/concierge/agency";
import {
  buildCallbackIdempotencyKey,
  validateConciergeCallback,
} from "@/lib/concierge/callback";

const IDEMP_PREFIX = "concierge-idemp:";

/**
 * Website Concierge — callback / soft lead (N07 / M1).
 * Consent-gated. Inserts into `leads` with agency_id = Smolko.
 * Idempotent via marker in `note` (leads has no meta jsonb in this schema).
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`concierge-cb:${ip}`, 10, 60_000);
  if (!allowed) {
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  if (!conciergeSecretOk(request.headers.get("x-concierge-secret"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const validated = validateConciergeCallback(body);
  if (!validated.ok) {
    return NextResponse.json(
      { ok: false, error: validated.error },
      { status: validated.status },
    );
  }

  if (validated.input.honeypot) {
    return NextResponse.json({ ok: true });
  }

  const agencyId = resolveConciergeAgencyId();
  const supabase = createServiceRoleClient();
  if (!supabase) {
    return NextResponse.json(
      { ok: false, error: "Service unavailable." },
      { status: 503 },
    );
  }

  const idem = buildCallbackIdempotencyKey(agencyId, validated.input);
  const idemMarker = `${IDEMP_PREFIX}${idem}`;

  const { data: existingRows } = await supabase
    .from("leads")
    .select("id")
    .eq("agency_id", agencyId)
    .eq("source", "website-concierge")
    .ilike("note", `%${idemMarker}%`)
    .limit(1);

  const existing = existingRows?.[0];
  if (existing?.id) {
    return NextResponse.json({
      ok: true,
      leadId: existing.id,
      duplicate: true,
    });
  }

  const noteParts = [
    `[${idemMarker}]`,
    "source=website-concierge",
    validated.input.propertyId ? `property=${validated.input.propertyId}` : "",
    validated.input.preferredBrokerId
      ? `preferred_broker=${validated.input.preferredBrokerId}`
      : "",
    validated.input.note ?? "",
  ].filter(Boolean);

  const leadId = crypto.randomUUID();
  const { error } = await supabase.from("leads").insert({
    id: leadId,
    agency_id: agencyId,
    name: (validated.input.displayName || "Concierge kontakt").slice(0, 200),
    email: validated.input.email ?? "",
    phone: validated.input.phone ?? "",
    location: "",
    budget: "",
    property_type: "",
    rooms: "",
    financing: "",
    timeline: "",
    source: "website-concierge",
    status: "Nový",
    score: 50,
    assigned_agent: "Nepriradený",
    assigned_profile_id: null,
    last_contact: "Práve vytvorený",
    note: noteParts.join(" · ").slice(0, 5000),
  });

  if (error) {
    console.error("[concierge/callback]", error.message);
    return NextResponse.json(
      { ok: false, error: "Could not save callback." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, leadId, duplicate: false });
}
