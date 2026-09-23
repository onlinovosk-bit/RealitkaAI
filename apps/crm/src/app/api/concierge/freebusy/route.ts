import { NextResponse } from "next/server";
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
    return NextResponse.json({ ok: false, error: "Too many requests." }, { status: 429 });
  }

  if (!conciergeSecretOk(request.headers.get("x-concierge-secret"))) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
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
    return NextResponse.json(
      { ok: false, reason: result.reason, detail: result.detail },
      { status },
    );
  }

  return NextResponse.json({
    ok: true,
    calendarId: result.calendarId,
    busy: result.busy,
  });
}
