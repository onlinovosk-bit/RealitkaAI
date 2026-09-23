import { NextResponse } from "next/server";
import { okResponse, errorResponse } from "@/lib/api-response";
import { rateLimit } from "@/lib/rate-limit";
import {
  conciergeSecretOk,
  resolveConciergeAgencyId,
} from "@/lib/concierge/agency";
import { fetchConciergeFreeBusy } from "@/lib/concierge/freebusy";

/**
 * N09 free/busy — honest fail-closed without GO-B08 OAuth token in env.
 * Set CONCIERGE_GOOGLE_ACCESS_TOKEN (+ calendar id) after OAuth ship.
 */
export async function GET(request: Request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const { allowed } = await rateLimit(`concierge-fb:${ip}`, 20, 60_000);
  if (!allowed) {
    return errorResponse("Too many requests.", 429);
  }

  if (!conciergeSecretOk(request.headers.get("x-concierge-secret"))) {
    return errorResponse("Unauthorized.", 401);
  }

  const url = new URL(request.url);
  const timeMin = url.searchParams.get("timeMin") ?? "";
  const timeMax = url.searchParams.get("timeMax") ?? "";
  const calendarId =
    url.searchParams.get("calendarId")?.trim() ||
    process.env.CONCIERGE_GOOGLE_CALENDAR_ID?.trim() ||
    "primary";

  const result = await fetchConciergeFreeBusy({
    agencyId: resolveConciergeAgencyId(),
    calendarId,
    timeMin,
    timeMax,
    accessToken: process.env.CONCIERGE_GOOGLE_ACCESS_TOKEN ?? null,
  });

  if (!result.ok) {
    const status =
      result.reason === "oauth_missing"
        ? 503
        : result.reason === "invalid_window"
          ? 400
          : 502;
    // Zámerne NIE errorResponse. Táto odpoveď nemá kľúč `error` — nesie
    // `reason` (+ voliteľný `detail`), na ktorých stojí widget na cudzom webe.
    // errorResponse() by pridal `error`, teda zmenil tvar odpovede. Túto routu
    // prepisujeme kvôli importnej zmluve, nie kvôli zmene kontraktu.
    return NextResponse.json(
      { ok: false, reason: result.reason, detail: result.detail },
      { status },
    );
  }

  return okResponse({ calendarId: result.calendarId, busy: result.busy });
}
