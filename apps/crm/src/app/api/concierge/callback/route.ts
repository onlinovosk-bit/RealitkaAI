import { z } from "zod";
import { errorResponse, okResponse } from "@/lib/api-response";
import { validateBody } from "@/lib/api-validate";
import { incrementUsageMetric } from "@/lib/usage-metrics";
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
 * Deliberately permissive: the business rules (consent, honeypot, phone-or-email,
 * the sk/camelCase field aliases) live in validateConciergeCallback and stay
 * there — a zod rewrite of them would be a regression dressed as compliance.
 * This schema only does what the route used to do inline and did badly:
 * reject a body that is not a JSON object. Before, a malformed payload was
 * swallowed into `{}` and came back as "consent required", which told the
 * caller nothing true.
 */
const CallbackBodySchema = z.record(z.string(), z.unknown());

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
    return errorResponse("Too many requests.", 429);
  }

  if (!conciergeSecretOk(request.headers.get("x-concierge-secret"))) {
    return errorResponse("Unauthorized.", 401);
  }

  const parsed = await validateBody(request, CallbackBodySchema);
  if (!parsed.ok) return parsed.response;

  const validated = validateConciergeCallback(parsed.data);
  if (!validated.ok) {
    return errorResponse(validated.error, validated.status);
  }

  if (validated.input.honeypot) {
    return okResponse({});
  }

  const agencyId = resolveConciergeAgencyId();
  await incrementUsageMetric({ agencyId, metric: "concierge_callback" });

  const supabase = createServiceRoleClient();
  if (!supabase) {
    return errorResponse("Service unavailable.", 503);
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
    return okResponse({ leadId: existing.id, duplicate: true });
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
    return errorResponse("Could not save callback.", 500);
  }

  return okResponse({ leadId, duplicate: false });
}
