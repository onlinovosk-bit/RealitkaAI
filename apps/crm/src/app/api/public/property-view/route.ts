import { z } from "zod";
import { validateBody } from "@/lib/api-validate";
import { errorResponse, okResponse } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import { createAdminClient } from "@/lib/supabase/server";
import { recordKnownContactView } from "@/lib/signals/record-known-view";

const bodySchema = z.object({
  intentId: z.string().uuid(),
  propertyId: z.string().regex(/^[A-Za-z0-9_-]{1,80}$/),
});

/**
 * A known contact opened a listing on the public list.
 * The lead is resolved from the buyer intent. Nothing is sent.
 */
export async function POST(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`public-property-view:${ip}`, 20, 60_000);
  if (!allowed) return errorResponse("Too many requests.", 429);

  const parsed = await validateBody(request, bodySchema);
  if (!parsed.ok) return parsed.response;

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return errorResponse("Service unavailable.", 503);
  }

  const result = await recordKnownContactView(createAdminClient(), parsed.data);
  if (!result.recorded) {
    return okResponse({ recorded: false });
  }

  if (result.agencyId) {
    await incrementUsageMetric({
      agencyId: result.agencyId,
      metric: "public_property_view",
    });
  }
  return okResponse({ recorded: true });
}
