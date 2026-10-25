import { createAdminClient, createClient } from "@/lib/supabase/server";
import { errorResponse } from "@/lib/api-response";
import { incrementUsageMetric } from "@/lib/usage-metrics";
import { parseOutcomeParams, readMailOutcomes } from "@/lib/inbound/mail-outcome-reader";

/**
 * GET /api/inbound/outcomes?days=7&limit=20
 *
 * Diagnostika príjmu e-mailov: agregát podľa outcome/reason + posledných N
 * riadkov BEZ osobných údajov (len doména odosielateľa, žiadny obsah správy).
 *
 * Brána je FAIL-CLOSED:
 *   1. bez session → 401
 *   2. bez agency_id v profile → 403
 *   3. validácia parametrov → 400
 *   4. tabuľka je len pre service role → admin klient + explicitný
 *      `agency_id` zo session (query `agency_id` sa ignoruje)
 *   5. akákoľvek chyba → 500 bez dát
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return errorResponse("Unauthorized", 401);

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("agency_id")
      .eq("auth_user_id", user.id)
      .maybeSingle();
    if (profileError) return errorResponse("Failed to load profile", 500);
    if (!profile?.agency_id) {
      return errorResponse("Chyba agency_id v profile — tenant scope nie je nastavený.", 403);
    }
    const agencyId = profile.agency_id as string;

    // Povinný import zmluvy API trás (revolis-api.mdc); delta 0, aby sa
    // nenafukovali počítadlá (rovnaký vzor ako ai/listing-content/generations).
    await incrementUsageMetric({ agencyId, metric: "ai_openai_tokens", delta: 0 });

    const params = parseOutcomeParams(new URL(request.url).searchParams);
    if (!params.ok) return errorResponse(params.error, 400);

    // Bez service key by createAdminClient spadol na anon kľúč; tabuľka je preň
    // zatvorená, takže radšej explicitná odpoveď než zavádzajúca prázdna.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return errorResponse("Service role nie je nakonfigurovaná.", 503);
    }

    const report = await readMailOutcomes(createAdminClient(), {
      agencyId,
      days: params.days,
      limit: params.limit,
    });

    return Response.json(
      { ok: true, ...report },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("inbound outcomes failed:", err instanceof Error ? err.message : "unknown");
    return errorResponse("Internal error", 500);
  }
}
